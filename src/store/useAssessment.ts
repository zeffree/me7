import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_ASSUMPTIONS } from '@/model/engine';
import { DEFAULT_TEI_SETTINGS } from '@/model/tei';
import type { AddOnLine, Assessment, Assumptions, SpendLine, TeiSettings } from '@/model/types';
import { BASELINE_SKUS, getBaseline, type BaselineSkuId } from '@/data/skus';
import { getCategory } from '@/data/categories';
import { getAddOn } from '@/data/msAddOns';
import { getTeiLine } from '@/data/teiStudies';

export type StepId = 'profile' | 'quick' | 'catalog' | 'addons' | 'assumptions' | 'results';

export const STEP_ORDER: StepId[] = [
  'profile',
  'quick',
  'catalog',
  'addons',
  'assumptions',
  'results',
];

interface AssessmentState extends Assessment {
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

  upsertLine: (line: SpendLine) => void;
  removeLine: (categoryId: string) => void;
  dismissCategory: (categoryId: string) => void;
  clearDismissal: (categoryId: string) => void;
  togglePlannedCapability: (categoryId: string) => void;
  setPlannedCapabilities: (ids: string[]) => void;

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
    seats: l.seats === undefined ? undefined : Math.round(bounded(l.seats, MAX_SEATS, 0)),
    pupm: l.pupm === undefined ? undefined : bounded(l.pupm, MAX_PUPM, 0),
    annual: l.annual === undefined ? undefined : bounded(l.annual, MAX_ANNUAL, 0),
    retainPct: Math.min(100, Math.max(0, bounded(l.retainPct, 100, 0))),
  };
}

function sanitizeAddOnLine(l: AddOnLine): AddOnLine {
  return {
    ...l,
    seats: l.seats === undefined ? undefined : Math.round(bounded(l.seats, MAX_SEATS, 0)),
    pupm: l.pupm === undefined ? undefined : bounded(l.pupm, MAX_PUPM, 0),
    annual: l.annual === undefined ? undefined : bounded(l.annual, MAX_ANNUAL, 0),
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
    e7ListPupm: num('e7ListPupm', 0, 10_000),
    e7DiscountPct: num('e7DiscountPct', 0, 100),
    baselineUnitPupm: num('baselineUnitPupm', 0, 10_000),
    horizonYears: Math.round(num('horizonYears', 1, 50)),
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
    orgName: typeof a.orgName === 'string' ? a.orgName : '',
    seats,
    currency: typeof a.currency === 'string' && a.currency ? a.currency : 'USD',
    baseline,
    assumptions: sanitizeAssumptions(a.assumptions, baseline),
    // Drop lines whose category no longer exists rather than carrying a ghost the user can
    // neither see in the catalog nor edit away.
    lines: Array.isArray(a.lines)
      ? a.lines.filter((l) => l && getCategory(l.categoryId)).map(sanitizeSpendLine)
      : [],
    addOns: Array.isArray(a.addOns)
      ? a.addOns.filter((x) => x && getAddOn(x.addOnId)).map(sanitizeAddOnLine)
      : [],
    // Same ghost-category rule as lines, plus de-duplication, since this is a set in spirit.
    plannedCapabilities: Array.isArray(a.plannedCapabilities)
      ? [
          ...new Set(
            a.plannedCapabilities.filter((id) => typeof id === 'string' && getCategory(id)),
          ),
        ]
      : [],
    tei: sanitizeTei(a.tei),
  };
}

function stripDismissed(s: Assessment & { dismissed: string[] }): Assessment {
  const { dismissed: _dismissed, ...rest } = s;
  return rest;
}

function baseState(): Assessment & { dismissed: string[] } {
  return {
    orgName: '',
    seats: 2500,
    currency: 'USD',
    baseline: 'm365e5',
    assumptions: { ...DEFAULT_ASSUMPTIONS, baselineUnitPupm: getBaseline('m365e5').listPricePupm },
    lines: [],
    addOns: [],
    plannedCapabilities: [],
    tei: { ...DEFAULT_TEI_SETTINGS },
    dismissed: [],
  };
}

/**
 * A realistic mid-size enterprise: on E5, already double-paying for identity, endpoint and
 * email security, plus a ChatGPT Enterprise pilot and a Zscaler estate. This is the shape
 * of customer the tool exists for.
 */
function demoState(): Assessment & { dismissed: string[] } {
  return {
    orgName: 'Northwind Traders',
    seats: 4200,
    currency: 'USD',
    baseline: 'm365e5',
    assumptions: {
      ...DEFAULT_ASSUMPTIONS,
      baselineUnitPupm: 54,
      e7DiscountPct: 8,
      migrationCostPerSeat: 12,
      year1RealizationPct: 60,
    },
    lines: [
      { categoryId: 'genai-assistant', vendor: 'ChatGPT Enterprise', mode: 'pupm', pupm: 30, seats: 1200, retainPct: 10 },
      { categoryId: 'sso-mfa', vendor: 'Okta Workforce Identity', mode: 'pupm', pupm: 6, retainPct: 0 },
      { categoryId: 'ztna', vendor: 'Zscaler Private Access', mode: 'annual', annual: 310_000, retainPct: 0 },
      { categoryId: 'swg', vendor: 'Zscaler Internet Access', mode: 'annual', annual: 265_000, retainPct: 15 },
      { categoryId: 'edr-xdr', vendor: 'CrowdStrike Falcon', mode: 'pupm', pupm: 8.5, retainPct: 0 },
      { categoryId: 'email-security', vendor: 'Proofpoint', mode: 'pupm', pupm: 5, retainPct: 0 },
      { categoryId: 'uem', vendor: 'Jamf Pro', mode: 'pupm', pupm: 8, seats: 900, retainPct: 40 },
      { categoryId: 'business-intelligence', vendor: 'Tableau', mode: 'pupm', pupm: 42, seats: 300, retainPct: 20 },
      { categoryId: 'file-storage', vendor: 'Box', mode: 'pupm', pupm: 15, seats: 1800, retainPct: 0 },
      { categoryId: 'ai-notetaker', vendor: 'Otter.ai', mode: 'pupm', pupm: 12, seats: 600, retainPct: 0 },
      { categoryId: 'security-awareness', vendor: 'KnowBe4', mode: 'pupm', pupm: 2.5, retainPct: 0 },
      { categoryId: 'siem-soar', vendor: 'Splunk Enterprise Security', mode: 'annual', annual: 620_000, retainPct: 0 },
      { categoryId: 'esignature', vendor: 'DocuSign', mode: 'annual', annual: 96_000, retainPct: 0 },
    ],
    addOns: [
      { addOnId: 'copilot', mode: 'pupm', pupm: 30, seats: 800 },
      { addOnId: 'entra-id-governance', mode: 'pupm', pupm: 7 },
      { addOnId: 'teams-calling-plan', mode: 'pupm', pupm: 12, seats: 2100 },
    ],
    // Capabilities Northwind has no vendor for today and would switch on under E7. Kept small
    // and plausible on purpose: the point is illustrative value, not a maximal number.
    plannedCapabilities: ['agent-governance', 'identity-governance', 'verified-id'],
    // Deliberately left off even in the demo. The gate is the whole point: an extrapolated
    // number should never be the first thing anyone sees, including in a canned scenario.
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
      theme: 'dark',

      setStep: (step) => set({ step }),
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
      setSeats: (seats) => set({ seats: Math.max(0, Math.round(seats) || 0) }),
      setCurrency: (currency) => set({ currency }),

      // Changing baseline re-seeds the assumed unit price, since the previous figure
      // was anchored to a different suite.
      setBaseline: (baseline) =>
        set((s) => {
          const next = isBaselineId(baseline) ? baseline : DEFAULT_BASELINE;
          return {
            baseline: next,
            assumptions: {
              ...s.assumptions,
              baselineUnitPupm: getBaseline(next).listPricePupm,
            },
          };
        }),

      setAssumptions: (patch) =>
        set((s) => ({ assumptions: { ...s.assumptions, ...patch } })),

      upsertLine: (line) =>
        set((s) => {
          const existing = s.lines.findIndex((l) => l.categoryId === line.categoryId);
          const lines = [...s.lines];
          if (existing >= 0) lines[existing] = line;
          else lines.push(line);
          return {
            lines,
            dismissed: s.dismissed.filter((d) => d !== line.categoryId),
            // Once there is real spend against a category it is a cash saving, not avoided
            // cost. Dropping it here stops the same capability being counted on both sides.
            plannedCapabilities: s.plannedCapabilities.filter((p) => p !== line.categoryId),
          };
        }),

      removeLine: (categoryId) =>
        set((s) => ({ lines: s.lines.filter((l) => l.categoryId !== categoryId) })),

      dismissCategory: (categoryId) =>
        set((s) => {
          const cat = getCategory(categoryId);
          const cov = cat?.coverage[s.baseline];
          // "We don't pay for this" on something E7 unlocks is precisely a confirmed capability
          // gap, so pre-select it for cost avoidance. The user can still untick it on results.
          const isGain = cov === 'unlocked' || cov === 'upgrade';
          return {
            lines: s.lines.filter((l) => l.categoryId !== categoryId),
            dismissed: s.dismissed.includes(categoryId)
              ? s.dismissed
              : [...s.dismissed, categoryId],
            plannedCapabilities:
              isGain && !s.plannedCapabilities.includes(categoryId)
                ? [...s.plannedCapabilities, categoryId]
                : s.plannedCapabilities,
          };
        }),

      clearDismissal: (categoryId) =>
        set((s) => ({ dismissed: s.dismissed.filter((d) => d !== categoryId) })),

      togglePlannedCapability: (categoryId) =>
        set((s) => ({
          plannedCapabilities: s.plannedCapabilities.includes(categoryId)
            ? s.plannedCapabilities.filter((p) => p !== categoryId)
            : [...s.plannedCapabilities, categoryId],
        })),

      setPlannedCapabilities: (ids) =>
        set(() => ({
          plannedCapabilities: [...new Set(ids.filter((id) => Boolean(getCategory(id))))],
        })),

      upsertAddOn: (line) =>
        set((s) => {
          const existing = s.addOns.findIndex((a) => a.addOnId === line.addOnId);
          const addOns = [...s.addOns];
          if (existing >= 0) addOns[existing] = line;
          else addOns.push(line);
          return { addOns };
        }),

      removeAddOn: (addOnId) =>
        set((s) => ({ addOns: s.addOns.filter((a) => a.addOnId !== addOnId) })),

      toggleTei: () => set((s) => ({ tei: { ...s.tei, enabled: !s.tei.enabled } })),

      setTeiLineOverride: (lineId, on) =>
        set((s) => {
          if (!getTeiLine(lineId)) return s;
          return { tei: { ...s.tei, lineOverrides: { ...s.tei.lineOverrides, [lineId]: on } } };
        }),

      resetTeiLines: () => set((s) => ({ tei: { ...s.tei, lineOverrides: {} } })),

      setTeiAdoption: (pct) =>
        set((s) => ({ tei: { ...s.tei, copilotAdoptionPct: clampPct(pct) } })),

      setTeiConfidence: (pct) => set((s) => ({ tei: { ...s.tei, confidencePct: clampPct(pct) } })),

      toggleTeiEnablementCost: () =>
        set((s) => ({ tei: { ...s.tei, includeEnablementCost: !s.tei.includeEnablementCost } })),

      toggleSellerMode: () => set((s) => ({ sellerMode: !s.sellerMode })),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),

      loadDemo: () => set({ ...demoState(), started: true, step: 'results', flash: null }),
      reset: () => set({ ...baseState(), started: false, step: 'profile', flash: null }),
      hydrate: (a, flash) => {
        const clean = sanitizeAssessment(a);
        set({
          ...clean,
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
      version: 1,
      // Spend data is sensitive, so it stays in this browser and nowhere else.
      partialize: (s) => ({
        orgName: s.orgName,
        seats: s.seats,
        currency: s.currency,
        baseline: s.baseline,
        assumptions: s.assumptions,
        lines: s.lines,
        addOns: s.addOns,
        plannedCapabilities: s.plannedCapabilities,
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
          ...p,
          ...sanitizeAssessment(p),
          dismissed: Array.isArray(p.dismissed)
            ? p.dismissed.filter((d) => typeof d === 'string' && getCategory(d))
            : [],
          step: STEP_ORDER.includes(p.step as StepId) ? (p.step as StepId) : 'profile',
          theme: p.theme === 'light' ? 'light' : 'dark',
          sellerMode: p.sellerMode === true,
          started: p.started === true,
          // Never restored from storage: a confirmation is only meaningful in the moment.
          flash: null,
        };
      },
    },
  ),
);

/** Narrow the store down to the plain Assessment the engine expects. */
export function toAssessment(s: AssessmentState): Assessment {
  return {
    orgName: s.orgName,
    seats: s.seats,
    currency: s.currency,
    baseline: s.baseline,
    assumptions: s.assumptions,
    lines: s.lines,
    addOns: s.addOns,
    plannedCapabilities: s.plannedCapabilities,
    tei: s.tei,
  };
}
