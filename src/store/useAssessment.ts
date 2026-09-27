import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DEFAULT_ASSUMPTIONS } from '@/model/engine';
import { DEFAULT_TEI_SETTINGS } from '@/model/tei';
import type { AddOnLine, Assessment, Assumptions, CostAvoidanceSettings, SpendLine, TeiSettings } from '@/model/types';
import { BASELINE_SKUS, getBaseline, type BaselineSkuId } from '@/data/skus';
import { getCategory } from '@/data/categories';
import { getAddOn } from '@/data/msAddOns';
import { getStandaloneLicence } from '@/data/standaloneLicences';
import { getTeiLine } from '@/data/teiStudies';
import { createDemoAssessment } from '@/data/demo';

export type StepId = 'profile' | 'quick' | 'catalog' | 'addons' | 'assumptions' | 'results';
export type StorageStatus = 'available' | 'unavailable' | 'paused';

export const STEP_ORDER: StepId[] = [
  'profile',
  'quick',
  'catalog',
  'addons',
  'assumptions',
  'results',
];

interface AssessmentState extends Assessment {
  addOnsReviewed: boolean;
  isDemo: boolean;
  plannedCapabilities: string[];
  costAvoidance: CostAvoidanceSettings;
  storageStatus: StorageStatus;
  storageError: string | null;
  step: StepId;
  started: boolean;
  sellerMode: boolean;
  theme: 'dark' | 'light';
  /** Categories the user explicitly answered "we don't pay for this" on, so we can show progress. */
  dismissed: string[];
  /**
   * One-shot confirmation shown after an import. Not persisted: hydrate jumps straight to the
   * results step, so the button that triggered the import unmounts before it could report
   * anything, and the user would otherwise be teleported with no idea which file loaded.
   */
  flash: string | null;

  setStep: (step: StepId) => void;
  next: () => void;
  back: () => void;
  start: () => void;

  setOrgName: (v: string) => void;
  setSeats: (v: number) => void;
  setCurrency: (v: string) => void;
  setBaseline: (v: BaselineSkuId) => void;
  setAssumptions: (patch: Partial<Assumptions>) => void;
  setReviewWarnings: (warnings: string[]) => void;
  setAddOnsReviewed: (reviewed: boolean) => void;
  confirmLineAssumption: (categoryId: string, confirmed: boolean) => void;
  confirmAddOnAssumption: (addOnId: string, confirmed: boolean) => void;
  setTeiCombinedReviewed: (reviewed: boolean) => void;
  setTeiEnablementOverlapReviewed: (reviewed: boolean) => void;

  upsertLine: (line: SpendLine) => void;
  removeLine: (categoryId: string) => void;
  dismissCategory: (categoryId: string) => void;
  clearDismissal: (categoryId: string) => void;
  togglePlannedCapability: (categoryId: string) => void;
  setPlannedCapabilities: (ids: string[]) => void;
  /** Users planned for a capability. Undefined restores the default of every seat. */
  setCapabilityUsers: (categoryId: string, users: number | undefined) => void;
  /** USD per user per month. Undefined restores list price less the E7 discount. */
  setAvoidedLicencePrice: (licenceId: string, pupm: number | undefined) => void;
  /** Restores default users and licence prices; the capability selection is kept. */
  resetCostAvoidance: () => void;

  upsertAddOn: (line: AddOnLine) => void;
  removeAddOn: (addOnId: string) => void;

  toggleTei: () => void;
  setTeiLineOverride: (lineId: string, on: boolean) => void;
  resetTeiLines: () => void;
  setTeiAdoption: (pct: number) => void;
  setTeiConfidence: (pct: number) => void;
  toggleTeiEnablementCost: () => void;

  toggleSellerMode: () => void;
  toggleTheme: () => void;

  loadDemo: () => void;
  reset: () => void;
  hydrate: (a: Assessment, flash?: string) => void;
  setFlash: (flash: string | null) => void;
}

const DEFAULT_BASELINE: BaselineSkuId = 'm365e5';

function isBaselineId(v: unknown): v is BaselineSkuId {
  return typeof v === 'string' && BASELINE_SKUS.some((s) => s.id === v);
}

/**
 * Assessments can arrive from two places we do not control: a share link someone pasted, and
 * localStorage written by an older build of this app. Either can carry a baseline that no longer
 * exists (getBaseline throws), or spend lines pointing at categories since renamed or removed.
 * Left unchecked that is a blank white page, so everything untrusted is funnelled through here.
 */

/**
 * Upper bounds for the two untrusted numeric paths. These are not opinions about how big a
 * customer can be — they exist because IEEE-754 overflows. `seats` is only checked for
 * finiteness, so a crafted share link carrying seats: 1e308 multiplies out to Infinity, and the
 * Infinity - Infinity in the uplift becomes NaN, poisoning the TCO series and every chart value
 * downstream. The largest employer on earth is ~2.1M people, so these ceilings are unreachable
 * in practice while making overflow arithmetically impossible.
 */
const MAX_SEATS = 5_000_000;
const MAX_PUPM = 100_000;
const MAX_ANNUAL = 1e12;
let lastStorageError: string | null = null;
let lastStorageStatus: StorageStatus = 'available';
let storageWriteBlocked = false;
let reportStorageError = (_message: string | null, _status: StorageStatus) => {};

function storageState(message: string | null, status: StorageStatus): void {
  if (lastStorageError === message && lastStorageStatus === status) return;
  lastStorageError = message;
  lastStorageStatus = status;
  reportStorageError(message, status);
}

function storageFailure(): void {
  const message = 'Browser storage is unavailable or full. Changes remain in this tab only; export JSON to keep a copy.';
  storageState(message, storageWriteBlocked ? 'paused' : 'unavailable');
}

const assessmentStorage = createJSONStorage(() => ({
  getItem: (name: string) => {
    try { return globalThis.localStorage.getItem(name); }
    catch { storageWriteBlocked = true; storageFailure(); return null; }
  },
  setItem: (name: string, value: string) => {
    if (storageWriteBlocked) return;
    try {
      globalThis.localStorage.setItem(name, value);
      storageState(null, 'available');
    }
    catch { storageFailure(); }
  },
  removeItem: (name: string) => {
    try { globalThis.localStorage.removeItem(name); }
    catch { storageFailure(); }
  },
}));

/** Clamp an untrusted number into a usable range, falling back when it is not a number at all. */
function bounded(v: unknown, max: number, fallback: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(0, v));
}

/** Slider values are whole percentages; a NaN from a dragged input must not reach the model. */
function clampPct(v: number): number {
  return Math.round(bounded(v, 100, 0));
}

/** Spend lines carry the same untrusted numbers as the rest of the assessment. */
function sanitizeSpendLine(l: SpendLine): SpendLine {
  return {
    ...l,
    vendor: typeof l.vendor === 'string' ? l.vendor : '',
    mode: l.mode === 'annual' || l.mode === 'pupm' ? l.mode : l.annual !== undefined ? 'annual' : 'pupm',
    seats: l.seats === undefined ? undefined : Math.round(bounded(l.seats, MAX_SEATS, 0)),
    pupm: typeof l.pupm === 'number' && Number.isFinite(l.pupm) ? bounded(l.pupm, MAX_PUPM, 0) : undefined,
    annual: typeof l.annual === 'number' && Number.isFinite(l.annual) ? bounded(l.annual, MAX_ANNUAL, 0) : undefined,
    retainPct: Math.min(100, Math.max(0, bounded(l.retainPct, 100, 0))),
    savingsDelayMonths: Math.round(bounded(l.savingsDelayMonths, 1200, 0)),
    amountSource: l.amountSource === 'customer' || l.amountSource === 'benchmark' ? l.amountSource : 'legacy',
    assumptionConfirmed: l.assumptionConfirmed === true,
  };
}

function sanitizeAddOnLine(l: AddOnLine): AddOnLine {
  return {
    ...l,
    addOnId: l.addOnId === 'copilot-m365' ? 'copilot' : l.addOnId,
    mode: l.mode === 'annual' || l.mode === 'pupm' ? l.mode : l.annual !== undefined ? 'annual' : 'pupm',
    seats: l.seats === undefined ? undefined : Math.round(bounded(l.seats, MAX_SEATS, 0)),
    pupm: typeof l.pupm === 'number' && Number.isFinite(l.pupm) ? bounded(l.pupm, MAX_PUPM, 0) : undefined,
    annual: typeof l.annual === 'number' && Number.isFinite(l.annual) ? bounded(l.annual, MAX_ANNUAL, 0) : undefined,
    retainPct: bounded(l.retainPct, 100, 0),
    savingsDelayMonths: Math.round(bounded(l.savingsDelayMonths, 1200, 0)),
    amountSource: l.amountSource === 'customer' || l.amountSource === 'benchmark' ? l.amountSource : 'legacy',
    assumptionConfirmed: l.assumptionConfirmed === true,
  };
}

/**
 * TEI settings arrive from the same untrusted places as everything else, with one extra hazard:
 * `lineOverrides` is an open-ended map keyed by study line id. A share link written by a future
 * build could carry ids this build has never heard of, and — more importantly — an id that has
 * since been reclassified as double-counting. Unknown keys are dropped rather than carried,
 * so a stale link can never silently switch on a line this build considers unsafe.
 */
function sanitizeTei(t: Partial<TeiSettings> | null | undefined): TeiSettings {
  if (!t || typeof t !== 'object') return { ...DEFAULT_TEI_SETTINGS };

  const overrides: Record<string, boolean> = {};
  if (t.lineOverrides && typeof t.lineOverrides === 'object') {
    for (const [id, on] of Object.entries(t.lineOverrides)) {
      if (typeof on === 'boolean' && getTeiLine(id)) overrides[id] = on;
    }
  }

  return {
    enabled: t.enabled === true,
    combinedReviewed: t.combinedReviewed === true,
    enablementOverlapReviewed: t.enablementOverlapReviewed === true,
    copilotAdoptionPct: Math.round(
      bounded(t.copilotAdoptionPct, 100, DEFAULT_TEI_SETTINGS.copilotAdoptionPct),
    ),
    confidencePct: Math.round(bounded(t.confidencePct, 100, DEFAULT_TEI_SETTINGS.confidencePct)),
    // Absent means "keep charging it": the safe default is the one that costs the business case
    // something, so a malformed link can never quietly delete the adoption cost.
    includeEnablementCost: t.includeEnablementCost !== false,
    lineOverrides: overrides,
  };
}

/**
 * Assumptions arrive from the same untrusted places as the rest of the assessment, and they are
 * the most consequential numbers in the app — baselineUnitPupm and e7DiscountPct drive the uplift
 * that the entire business case rests on. A user's negotiated price is legitimate and preserved;
 * only values that are not usable numbers fall back to the baseline-anchored default.
 */
function sanitizeAssumptions(
  raw: unknown,
  baseline: BaselineSkuId,
): Assessment['assumptions'] {
  const anchored: Assessment['assumptions'] = {
    ...DEFAULT_ASSUMPTIONS,
    baselineUnitPupm: getBaseline(baseline).listPricePupm,
  };
  if (!raw || typeof raw !== 'object') return anchored;
  const a = raw as Record<string, unknown>;

  const num = (key: keyof Assessment['assumptions'], min: number, max: number): number => {
    const v = a[key];
    if (typeof v !== 'number' || !Number.isFinite(v)) return anchored[key] as number;
    return Math.min(max, Math.max(min, v));
  };


  return {
    e7ListPupm: num('e7ListPupm', 0, MAX_PUPM),
    e7DiscountPct: num('e7DiscountPct', 0, 100),
    baselineUnitPupm: num('baselineUnitPupm', 0, MAX_PUPM),
    horizonYears: Math.round(num('horizonYears', 1, 50)),
    transitionEnabled: a.transitionEnabled === true,
    transitionCost: num('transitionCost', 0, MAX_ANNUAL),
    baselinePriceSource: a.baselinePriceSource === 'customer' || a.baselinePriceSource === 'reference'
      ? a.baselinePriceSource : a.baselineUnitPupm === undefined ? 'reference' : 'legacy',
    e7PriceSource: a.e7PriceSource === 'customer' || a.e7PriceSource === 'reference'
      ? a.e7PriceSource : a.e7ListPupm === undefined ? 'reference' : 'legacy',
    pricesConfirmed: a.pricesConfirmed === true,
    // Pinned, not read from the payload. These were percentage guesses stacked on top of the
    // customer's own numbers, and the levers for them no longer exist in the UI. Reading a
    // stored value here would silently re-apply the old haircut to anyone returning with a
    // saved assessment or an older share link.
    migrationCostPerSeat: DEFAULT_ASSUMPTIONS.migrationCostPerSeat,
    year1RealizationPct: DEFAULT_ASSUMPTIONS.year1RealizationPct,
    conservative: DEFAULT_ASSUMPTIONS.conservative,
    bestCase: DEFAULT_ASSUMPTIONS.bestCase,
  };
}

export function sanitizeAssessment(a: Partial<Assessment> | null | undefined): Assessment {
  const base = baseState();
  if (!a || typeof a !== 'object') return stripDismissed(base);

  const baseline = isBaselineId(a.baseline) ? a.baseline : DEFAULT_BASELINE;
  const seats =
    typeof a.seats === 'number' && Number.isFinite(a.seats) && a.seats >= 0
      ? Math.min(MAX_SEATS, Math.round(a.seats))
      : base.seats;

  return {
    schemaVersion: 2,
    reviewWarnings: assessmentWarnings(a),
    addOnsReviewed: a.addOnsReviewed === true,
    isDemo: a.isDemo === true,
    orgName: typeof a.orgName === 'string' ? a.orgName : '',
    seats,
    // Recovery must not relabel legacy money. Strict import validation is separate.
    currency: typeof a.currency === 'string' ? a.currency : 'USD',
    baseline,
    assumptions: sanitizeAssumptions(a.assumptions, baseline),
    // Preserve unsupported invoice identities and their amounts for explicit review.
    lines: Array.isArray(a.lines)
      ? a.lines.filter((l) => l && typeof l.categoryId === 'string').map(sanitizeSpendLine)
      : [],
    addOns: Array.isArray(a.addOns)
      ? a.addOns.filter((x) => x && typeof x.addOnId === 'string').map(sanitizeAddOnLine)
      : [],
    // Capabilities planned for deployment. Same ghost-category rule as lines, plus de-duplication.
    plannedCapabilities: Array.isArray(a.plannedCapabilities)
      ? [
          ...new Set(
            a.plannedCapabilities.filter((id) => typeof id === 'string' && getCategory(id)),
          ),
        ]
      : [],
    costAvoidance: sanitizeCostAvoidance(a.costAvoidance),
    tei: sanitizeTei(a.tei),
  };
}

export function emptyCostAvoidance(): CostAvoidanceSettings {
  return { users: {}, unitPrices: {} };
}

/** Unknown ids and unusable numbers are dropped: they must never price a capability or licence. */
function sanitizeCostAvoidance(raw: unknown): CostAvoidanceSettings {
  const clean = emptyCostAvoidance();
  if (!raw || typeof raw !== 'object') return clean;
  const c = raw as Partial<Record<keyof CostAvoidanceSettings, unknown>>;
  const numbers = (value: unknown, known: (id: string) => boolean, max: number, integer: boolean) => {
    const out: Record<string, number> = {};
    if (!value || typeof value !== 'object' || Array.isArray(value)) return out;
    for (const [id, n] of Object.entries(value)) {
      if (!known(id) || typeof n !== 'number' || !Number.isFinite(n) || n < 0 || n > max) continue;
      if (integer && !Number.isInteger(n)) continue;
      out[id] = n;
    }
    return out;
  };
  clean.users = numbers(c.users, (id) => !!getCategory(id), MAX_SEATS, true);
  clean.unitPrices = numbers(c.unitPrices, (id) => !!getStandaloneLicence(id), MAX_PUPM, false);
  return clean;
}

const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

/** Strict import/edit validation. Recovery sanitisation is reserved for old browser storage. */
export function assessmentInputErrors(input: unknown): string[] {
  if (!record(input)) return ['Assessment must be an object.'];
  const errors: string[] = [];
  const number = (value: unknown, label: string, max: number, integer = false, min = 0) => {
    if (value === undefined) return;
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max ||
        (integer && !Number.isInteger(value))) errors.push(`${label} must be ${integer ? 'a whole number' : 'a finite number'} between ${min} and ${max}.`);
  };
  if (input.baseline !== undefined && !isBaselineId(input.baseline)) errors.push(`Unknown baseline: ${String(input.baseline)}.`);
  for (const key of ['isDemo', 'addOnsReviewed']) {
    if (input[key] !== undefined && typeof input[key] !== 'boolean') errors.push(`${key} must be true or false.`);
  }
  if (input.currency !== undefined && input.currency !== 'USD') errors.push('Only USD assessments can be loaded. No FX conversion is performed; non-USD amounts cannot be relabeled as USD. Keep the original assessment and start a new USD assessment instead.');
  number(input.seats, 'Seats', MAX_SEATS, true);
  for (const collection of ['lines', 'addOns'] as const) {
    if (input[collection] === undefined) continue;
    if (!Array.isArray(input[collection])) { errors.push(`${collection} must be an array.`); continue; }
    const seen = new Set<string>();
    for (const [index, raw] of input[collection].entries()) {
      const label = `${collection} row ${index + 1}`;
      if (!record(raw)) { errors.push(`${label} must be an object.`); continue; }
      const id = collection === 'lines' ? raw.categoryId : raw.addOnId === 'copilot-m365' ? 'copilot' : raw.addOnId;
      if (typeof id !== 'string' || !(collection === 'lines' ? getCategory(id) : getAddOn(id))) errors.push(`${label} has an unknown catalog identity (${String(id)}); its amount has not been discarded.`);
      if (typeof id === 'string') {
        if (seen.has(id)) errors.push(`${label} duplicates ${id}; remove duplicate entries or combine distinct invoices into one entry before importing.`);
        seen.add(id);
      }
      if (raw.mode !== 'annual' && raw.mode !== 'pupm') errors.push(`${label} has an invalid spend mode.`);
      number(raw.seats, `${label} seats`, MAX_SEATS, true);
      number(raw.pupm, `${label} monthly unit price`, MAX_PUPM);
      number(raw.annual, `${label} annual amount`, MAX_ANNUAL);
      number(raw.retainPct, `${label} retained percent`, 100);
      number(raw.savingsDelayMonths, `${label} delay`, 1200, true);
      if (raw.amountSource !== undefined && !['customer', 'benchmark', 'legacy'].includes(String(raw.amountSource))) errors.push(`${label} has an invalid amount source.`);
      if (raw.assumptionConfirmed !== undefined && typeof raw.assumptionConfirmed !== 'boolean') errors.push(`${label} confirmation must be true or false.`);
    }
  }
  if (input.assumptions !== undefined) {
    if (!record(input.assumptions)) errors.push('Assumptions must be an object.');
    else {
      const a = input.assumptions;
      for (const key of ['baselineUnitPupm', 'e7ListPupm']) number(a[key], key, MAX_PUPM);
      number(a.e7DiscountPct, 'E7 discount', 100);
      number(a.horizonYears, 'Horizon', 50, true, 1);
      number(a.transitionCost, 'Transition cost', MAX_ANNUAL);
      for (const key of ['transitionEnabled', 'pricesConfirmed']) {
        if (a[key] !== undefined && typeof a[key] !== 'boolean') errors.push(`${key} must be true or false.`);
      }
      for (const key of ['baselinePriceSource', 'e7PriceSource']) {
        if (a[key] !== undefined && !['customer', 'reference', 'legacy'].includes(String(a[key]))) errors.push(`${key} has an invalid provenance.`);
      }
    }
  }
  if (input.plannedCapabilities !== undefined &&
      (!Array.isArray(input.plannedCapabilities) ||
        input.plannedCapabilities.some((id) => typeof id !== 'string' || !getCategory(id)))) {
    errors.push('Planned capabilities must contain only known category identities.');
  }
  if (input.costAvoidance !== undefined) {
    if (!record(input.costAvoidance)) errors.push('Licence cost-avoidance settings must be an object.');
    else {
      const c = input.costAvoidance;
      for (const [key, label, known, kind, max, integer] of [
        ['users', 'Capability users', (id: string) => !!getCategory(id), 'capability', MAX_SEATS, true],
        ['unitPrices', 'Licence unit price', (id: string) => !!getStandaloneLicence(id), 'licence', MAX_PUPM, false],
      ] as const) {
        const map = c[key];
        if (map === undefined) continue;
        if (!record(map)) { errors.push(`Cost-avoidance ${key} must be an object.`); continue; }
        for (const [id, value] of Object.entries(map)) {
          if (!known(id)) errors.push(`${label} uses an unknown ${kind} identity (${id}).`);
          else number(value, `${label} for ${id}`, max, integer);
        }
      }
    }
  }
  if (input.tei !== undefined) {
    if (!record(input.tei)) errors.push('TEI settings must be an object.');
    else {
      const t = input.tei;
      number(t.copilotAdoptionPct, 'Copilot adoption', 100);
      number(t.confidencePct, 'Study scenario confidence', 100);
      for (const key of ['enabled', 'combinedReviewed', 'includeEnablementCost', 'enablementOverlapReviewed']) {
        if (t[key] !== undefined && typeof t[key] !== 'boolean') errors.push(`TEI ${key} must be true or false.`);
      }
      if (t.lineOverrides !== undefined && (!record(t.lineOverrides) ||
          Object.entries(t.lineOverrides).some(([id, on]) => !getTeiLine(id) || typeof on !== 'boolean'))) {
        errors.push('TEI selections must use known study line identities and true/false values.');
      }
    }
  }
  return errors;
}

function assessmentWarnings(a: Partial<Assessment>): string[] {
  const warnings = Array.isArray(a.reviewWarnings) ? a.reviewWarnings.filter((w) => typeof w === 'string') : [];
  warnings.push(...assessmentInputErrors(a));
  for (const [collection, rows] of [['lines', a.lines], ['addOns', a.addOns]] as const) {
    if (!Array.isArray(rows)) continue;
    for (const [index, line] of rows.entries()) {
      if (line && (line.mode === 'annual' ? line.annual === undefined : line.pupm === undefined)) {
        warnings.push(`${collection} row ${index + 1} has no amount entered. Its spend is unknown, not an explicit zero.`);
      }
    }
  }
  if ((a.lines ?? []).some?.((l) => l && !l.amountSource) ||
      (a.addOns ?? []).some?.((l) => l && !l.amountSource)) {
    warnings.push('Legacy invoice amounts were preserved. Their provenance remains unknown. Model 3 assumes full replacement of mapped, covered USD invoices; this scenario assumption is not customer verification or licensing certification.');
  }
  if ([...(Array.isArray(a.lines) ? a.lines : []), ...(Array.isArray(a.addOns) ? a.addOns : [])]
      .some((line) => line && typeof line.retainPct === 'number' && line.retainPct !== 0)) {
    warnings.push('Legacy retained-spend percentages are preserved for audit but no longer applied. Model 3 assumes full replacement of covered USD invoices, except unknown or duplicate/bundled entries.');
  }
  const old = a.assumptions;
  if (old && (old.migrationCostPerSeat > 0 || (old.year1RealizationPct !== undefined && old.year1RealizationPct !== 100) ||
      Object.values(old.conservative ?? {}).some((v) => v !== 1) ||
      Object.values(old.bestCase ?? {}).some((v) => v !== 1))) {
    warnings.push(`Legacy percentage discounts, realization and per-seat migration assumptions are no longer applied (old migration ${old.migrationCostPerSeat ?? 0}/seat, realization ${old.year1RealizationPct ?? 100}%). Enter an explicit one-time transition cost and line delays if needed.`);
  }
  if (typeof a.currency === 'string' && a.currency !== 'USD') {
    warnings.push('Existing non-USD amounts and their original currency were preserved, not converted. Cash estimates are blocked. Download the raw inputs for recovery, then explicitly start a new USD assessment.');
  }
  // Files written before capability cost avoidance have selections but no costAvoidance block.
  if (Array.isArray(a.plannedCapabilities) && a.plannedCapabilities.length > 0 && a.costAvoidance === undefined) {
    warnings.push(LEGACY_PLANNED_WARNING);
  }
  return [...new Set(warnings)];
}

export const LEGACY_PLANNED_WARNING = 'Planned-capability selections are now valued at what licensing them separately from Microsoft would cost, instead of third-party benchmarks and adoption rates. Review the selected capabilities, users and licence prices on the results page. The figure remains outside cash savings, TCO and payback.';

function stripDismissed(s: Assessment & { dismissed: string[] }): Assessment {
  const { dismissed: _dismissed, ...rest } = s;
  return rest;
}

function baseState(): Assessment & { dismissed: string[]; addOnsReviewed: boolean; isDemo: boolean; plannedCapabilities: string[]; costAvoidance: CostAvoidanceSettings } {
  return {
    schemaVersion: 2,
    reviewWarnings: [],
    addOnsReviewed: false,
    isDemo: false,
    orgName: '',
    seats: 2500,
    currency: 'USD',
    baseline: 'm365e5',
    assumptions: { ...DEFAULT_ASSUMPTIONS, baselineUnitPupm: getBaseline('m365e5').listPricePupm },
    lines: [],
    addOns: [],
    plannedCapabilities: [],
    costAvoidance: emptyCostAvoidance(),
    tei: { ...DEFAULT_TEI_SETTINGS },
    dismissed: [],
  };
}

export const useAssessment = create<AssessmentState>()(
  persist(
    (set, get) => ({
      ...baseState(),
      step: 'profile',
      started: false,
      flash: null,
      sellerMode: false,
      theme: 'light',
      storageStatus: lastStorageStatus,
      storageError: lastStorageError,

      setStep: (step) => { if (STEP_ORDER.includes(step)) set({ step }); },
      next: () => {
        const i = STEP_ORDER.indexOf(get().step);
        if (i < STEP_ORDER.length - 1) set({ step: STEP_ORDER[i + 1] });
      },
      back: () => {
        const i = STEP_ORDER.indexOf(get().step);
        if (i > 0) set({ step: STEP_ORDER[i - 1] });
      },
      start: () => set({ started: true, step: 'profile' }),

      setOrgName: (orgName) => set({ orgName }),
      setSeats: (seats) => {
        const errors = assessmentInputErrors({ seats });
        if (errors.length) { set({ flash: errors.join(' ') }); return; }
        set((s) => ({ seats, tei: { ...s.tei, combinedReviewed: false, enablementOverlapReviewed: false } }));
      },
      setCurrency: (currency) => {
        if (currency === get().currency) return;
        set({ flash: 'Currency was not changed. Only USD cash estimates are supported and no FX conversion is performed. Download any legacy inputs before explicitly starting a new USD assessment; existing amounts cannot be relabeled.' });
      },

      // Changing baseline re-seeds the assumed unit price, since the previous figure
      // was anchored to a different suite.
      setBaseline: (baseline) =>
        set((s) => {
          const next = isBaselineId(baseline) ? baseline : DEFAULT_BASELINE;
          return {
            baseline: next,
            addOnsReviewed: false,
            assumptions: {
              ...s.assumptions,
              baselineUnitPupm: s.assumptions.baselinePriceSource === 'customer'
                ? s.assumptions.baselineUnitPupm : getBaseline(next).listPricePupm,
              pricesConfirmed: false,
            },
            lines: s.lines.map((line) => ({ ...line, assumptionConfirmed: false })),
            addOns: s.addOns.map((line) => ({ ...line, assumptionConfirmed: false })),
            tei: { ...s.tei, combinedReviewed: false, enablementOverlapReviewed: false },
          };
        }),

      setAssumptions: (patch) => {
        const errors = assessmentInputErrors({ assumptions: patch });
        if (errors.length) { set({ flash: errors.join(' ') }); return; }
        set((s) => ({
          assumptions: sanitizeAssumptions({
            ...s.assumptions, ...patch,
            ...(['baselineUnitPupm', 'e7ListPupm', 'e7DiscountPct', 'baselinePriceSource', 'e7PriceSource'].some((key) =>
              Object.prototype.hasOwnProperty.call(patch, key)) && patch.pricesConfirmed === undefined
              ? { pricesConfirmed: false } : {}),
            ...(patch.baselineUnitPupm !== undefined && patch.baselinePriceSource === undefined ? { baselinePriceSource: 'customer' } : {}),
            ...(patch.e7ListPupm !== undefined && patch.e7PriceSource === undefined ? { e7PriceSource: 'customer' } : {}),
          }, s.baseline),
          tei: {
            ...s.tei, combinedReviewed: false,
            ...('transitionCost' in patch || 'transitionEnabled' in patch ? { enablementOverlapReviewed: false } : {}),
          },
        }));
      },
      setReviewWarnings: (reviewWarnings) => set({ reviewWarnings }),
      setAddOnsReviewed: (addOnsReviewed) => set({ addOnsReviewed }),
      confirmLineAssumption: (categoryId, confirmed) => set((s) => ({
        lines: s.lines.map((line) => line.categoryId === categoryId ? { ...line, assumptionConfirmed: confirmed } : line),
        tei: { ...s.tei, combinedReviewed: false },
      })),
      confirmAddOnAssumption: (addOnId, confirmed) => set((s) => ({
        addOns: s.addOns.map((line) => line.addOnId === addOnId ? { ...line, assumptionConfirmed: confirmed } : line),
        tei: { ...s.tei, combinedReviewed: false },
      })),
      setTeiCombinedReviewed: (combinedReviewed) => set((s) => ({ tei: { ...s.tei, combinedReviewed } })),
      setTeiEnablementOverlapReviewed: (enablementOverlapReviewed) => set((s) => ({
        tei: { ...s.tei, enablementOverlapReviewed, combinedReviewed: false },
      })),

      upsertLine: (line) =>
        set((s) => {
          const errors = assessmentInputErrors({ lines: [line] });
          if (errors.length) return { flash: errors.join(' ') };
          const existing = s.lines.findIndex((l) => l.categoryId === line.categoryId);
          const lines = [...s.lines];
          const clean = sanitizeSpendLine({ ...line, amountSource: line.amountSource ?? 'customer' });
          if (existing >= 0) lines[existing] = clean;
          else lines.push(clean);
          return {
            lines,
            tei: { ...s.tei, combinedReviewed: false },
            dismissed: s.dismissed.filter((d) => d !== line.categoryId),
          };
        }),

      removeLine: (categoryId) =>
        set((s) => ({ lines: s.lines.filter((l) => l.categoryId !== categoryId), tei: { ...s.tei, combinedReviewed: false } })),

      dismissCategory: (categoryId) =>
        set((s) => {
          if (!getCategory(categoryId)) return s;
          return {
            lines: s.lines.filter((l) => l.categoryId !== categoryId),
            dismissed: s.dismissed.includes(categoryId)
              ? s.dismissed
              : [...s.dismissed, categoryId],
            tei: { ...s.tei, combinedReviewed: false },
          };
        }),

      clearDismissal: (categoryId) =>
        set((s) => ({ dismissed: s.dismissed.filter((d) => d !== categoryId) })),

      togglePlannedCapability: (categoryId) =>
        set((s) => !getCategory(categoryId) ? s : ({
          plannedCapabilities: s.plannedCapabilities.includes(categoryId)
            ? s.plannedCapabilities.filter((p) => p !== categoryId)
            : [...s.plannedCapabilities, categoryId],
        })),

      setPlannedCapabilities: (ids) =>
        set(() => ({
          plannedCapabilities: [...new Set(ids.filter((id) => Boolean(getCategory(id))))],
        })),

      setCapabilityUsers: (categoryId, users) =>
        set((s) => {
          if (!getCategory(categoryId)) return s;
          const next = { ...s.costAvoidance.users };
          if (users === undefined) delete next[categoryId];
          else if (Number.isInteger(users) && users >= 0 && users <= MAX_SEATS) next[categoryId] = users;
          else return s;
          return { costAvoidance: { ...s.costAvoidance, users: next } };
        }),

      setAvoidedLicencePrice: (licenceId, pupm) =>
        set((s) => {
          if (!getStandaloneLicence(licenceId)) return s;
          const unitPrices = { ...s.costAvoidance.unitPrices };
          if (pupm === undefined) delete unitPrices[licenceId];
          else if (Number.isFinite(pupm) && pupm >= 0 && pupm <= MAX_PUPM) unitPrices[licenceId] = pupm;
          else return s;
          return { costAvoidance: { ...s.costAvoidance, unitPrices } };
        }),

      resetCostAvoidance: () => set(() => ({ costAvoidance: emptyCostAvoidance() })),

      upsertAddOn: (line) =>
        set((s) => {
          const errors = assessmentInputErrors({ addOns: [line] });
          if (errors.length) return { flash: errors.join(' ') };
          const existing = s.addOns.findIndex((a) => a.addOnId === line.addOnId);
          const addOns = [...s.addOns];
          const clean = sanitizeAddOnLine({ ...line, amountSource: line.amountSource ?? 'customer' });
          if (existing >= 0) addOns[existing] = clean;
          else addOns.push(clean);
          return { addOns, addOnsReviewed: false, tei: { ...s.tei, combinedReviewed: false } };
        }),

      removeAddOn: (addOnId) =>
        set((s) => ({ addOns: s.addOns.filter((a) => a.addOnId !== addOnId), addOnsReviewed: false, tei: { ...s.tei, combinedReviewed: false } })),

      toggleTei: () => set((s) => ({ tei: { ...s.tei, enabled: !s.tei.enabled } })),

      setTeiLineOverride: (lineId, on) =>
        set((s) => {
          if (!getTeiLine(lineId)) return s;
          return { tei: { ...s.tei, combinedReviewed: false, lineOverrides: { ...s.tei.lineOverrides, [lineId]: on } } };
        }),

      resetTeiLines: () => set((s) => ({ tei: { ...s.tei, combinedReviewed: false, lineOverrides: {} } })),

      setTeiAdoption: (pct) =>
        set((s) => ({ tei: { ...s.tei, combinedReviewed: false, enablementOverlapReviewed: false, copilotAdoptionPct: clampPct(pct) } })),

      setTeiConfidence: (pct) => set((s) => ({ tei: { ...s.tei, combinedReviewed: false, confidencePct: clampPct(pct) } })),

      toggleTeiEnablementCost: () =>
        set((s) => ({
          tei: {
            ...s.tei, combinedReviewed: false,
            includeEnablementCost: !s.tei.includeEnablementCost,
            enablementOverlapReviewed: s.tei.includeEnablementCost && s.tei.enablementOverlapReviewed === true,
          },
        })),

      toggleSellerMode: () => set((s) => ({ sellerMode: !s.sellerMode })),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),

      loadDemo: () => {
        const demo = createDemoAssessment();
        get().hydrate({
          ...demo,
          isDemo: true,
          lines: demo.lines.map((line) => ({ ...line, amountSource: 'benchmark', assumptionConfirmed: false })),
          addOns: demo.addOns.map((line) => ({ ...line, amountSource: 'benchmark', assumptionConfirmed: false })),
        });
      },
      reset: () => { storageWriteBlocked = false; set({ ...baseState(), started: false, step: 'profile', flash: null }); },
      hydrate: (a, flash) => {
        const errors = assessmentInputErrors(a);
        if (errors.length) { set({ flash: `Assessment was not replaced. ${errors.join(' ')}` }); return; }
        const clean = sanitizeAssessment(a);
        storageWriteBlocked = false;
        set({
          ...clean,
          addOnsReviewed: clean.addOnsReviewed === true,
          isDemo: clean.isDemo === true,
          // A freshly imported assessment carries its own answers; keeping the previous
          // session's dismissals would mark categories as "answered" that this one never saw.
          dismissed: [],
          started: true,
          step: 'results',
          flash: flash ?? null,
        });
      },
      setFlash: (flash) => set({ flash }),
    }),
    {
      name: 'me7-assessment',
      storage: assessmentStorage,
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          storageWriteBlocked = true;
          storageState('Saved browser assessment could not be read. Saving is paused to preserve that data; restore a valid JSON export or reset explicitly.', 'paused');
        }
      },
      version: 4,
      migrate: (persisted, version) => {
        const previous = persisted as AssessmentState;
        const warnings = Array.isArray(previous.reviewWarnings) ? [...previous.reviewWarnings] : [];
        let tei = previous.tei;
        if (version < 3) {
          tei = { ...previous.tei, combinedReviewed: false };
          warnings.push('Model 3 uses full replacement for covered USD invoices and absorbed add-ons. Legacy retained percentages and amount confirmations no longer affect credit; this is a scenario assumption, not customer verification or licensing certification. Transition costs and delays remain applied when enabled. Combined TEI review must be renewed.');
        }
        if (version < 4 && Array.isArray(previous.plannedCapabilities) && previous.plannedCapabilities.length > 0 && previous.costAvoidance === undefined) {
          warnings.push(LEGACY_PLANNED_WARNING);
        }
        return { ...previous, tei, reviewWarnings: warnings };
      },
      // Spend data is sensitive, so it stays in this browser and nowhere else.
      partialize: (s) => ({
        schemaVersion: s.schemaVersion,
        reviewWarnings: s.reviewWarnings,
        addOnsReviewed: s.addOnsReviewed,
        isDemo: s.isDemo,
        orgName: s.orgName,
        seats: s.seats,
        currency: s.currency,
        baseline: s.baseline,
        assumptions: s.assumptions,
        lines: s.lines,
        addOns: s.addOns,
        plannedCapabilities: s.plannedCapabilities,
        costAvoidance: s.costAvoidance,
        tei: s.tei,
        dismissed: s.dismissed,
        step: s.step,
        started: s.started,
        sellerMode: s.sellerMode,
        theme: s.theme,
      }),
      // Runs on every rehydration, not just version bumps: localStorage may have been written
      // by an older build whose catalog or SKU list differs from this one.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AssessmentState>;
        return {
          ...current,
          ...sanitizeAssessment(p),
          addOnsReviewed: p.addOnsReviewed === true,
          isDemo: p.isDemo === true,
          dismissed: Array.isArray(p.dismissed)
            ? p.dismissed.filter((d) => typeof d === 'string' && getCategory(d))
            : [],
          step: STEP_ORDER.includes(p.step as StepId) ? (p.step as StepId) : 'profile',
          theme: p.theme === 'dark' ? 'dark' : 'light',
          sellerMode: p.sellerMode === true,
          started: p.started === true,
          // Never restored from storage: a confirmation is only meaningful in the moment.
          flash: null,
        };
      },
    },
  ),
);

reportStorageError = (message, status) => useAssessment.setState((s) => ({
  storageStatus: status,
  storageError: message,
  ...(message ? { flash: message } : s.flash === s.storageError ? { flash: null } : {}),
}));
if (lastStorageError) reportStorageError(lastStorageError, lastStorageStatus);

/** Narrow the store down to the plain Assessment the engine expects. */
export function toAssessment(s: AssessmentState): Assessment {
  return {
    schemaVersion: s.schemaVersion,
    reviewWarnings: s.reviewWarnings,
    addOnsReviewed: s.addOnsReviewed,
    isDemo: s.isDemo,
    orgName: s.orgName,
    seats: s.seats,
    currency: s.currency,
    baseline: s.baseline,
    assumptions: s.assumptions,
    lines: s.lines,
    addOns: s.addOns,
    plannedCapabilities: s.plannedCapabilities,
    costAvoidance: s.costAvoidance,
    tei: s.tei,
  };
}
