import { useState } from 'react';
import { Check, ChevronDown, FlaskConical, RotateCcw } from 'lucide-react';
import { getStudy } from '@/data/teiStudies';
import type { TeiResult, TeiScoredLine } from '@/model/types';
import { Badge, Button, Card } from '@/components/ui/Primitives';
import { SliderField, Toggle } from '@/components/ui/Fields';
import { useAssessment } from '@/store/useAssessment';
import {
  cx,
  formatCompactCurrency,
  formatCurrency,
  formatNumber,
  formatPercent,
  formatPupm,
} from '@/lib/format';
import { TeiMethod } from './TeiMethod';

const KIND_LABEL: Record<string, string> = {
  productivity: 'Productivity',
  'it-efficiency': 'IT efficiency',
  risk: 'Risk reduction',
  cost: 'Cost reduction',
};

/**
 * The experimental panel.
 *
 * Everything else in this app multiplies numbers the customer typed in themselves. This panel does
 * something weaker: it re-scales three Forrester composite organisations onto a customer who is
 * none of them. That is a genuinely different class of claim, so it is kept structurally apart —
 * off until asked for, dashed rather than solid, amber rather than the teal that means real cash,
 * and never folded into net annual impact, effective per-user price or the TCO.
 */
export function TeiPanel({ tei, currency }: { tei: TeiResult; currency: string }) {
  const {
    tei: settings,
    toggleTei,
    setTeiAdoption,
    setTeiConfidence,
    toggleTeiEnablementCost,
    resetTeiLines,
  } = useAssessment();
  const [showMethod, setShowMethod] = useState(false);

  if (!tei.enabled) return <TeiGate onEnable={toggleTei} horizonYears={tei.horizonYears} />;

  const overrideCount = Object.keys(settings.lineOverrides).length;

  return (
    <Card className="print-keep border-dashed border-amber-500/40 bg-amber-500/[0.02] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-3">
          <FlaskConical
            className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400"
            aria-hidden
          />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold">Simulated Forrester TEI</h2>
              <Badge tone="warning">Experimental</Badge>
            </div>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-secondary">
              E7 bundles three things Forrester has separately measured — Microsoft 365 E5,
              Microsoft 365 Copilot and the Entra Suite. This re-scales those published studies to
              your {formatNumber(tei.seats)} seats to indicate the productivity, IT-efficiency and
              risk value the consolidation brings with it, alongside the cash you stop spending.
            </p>
          </div>
        </div>
        <Button variant="ghost" className="no-print" onClick={toggleTei}>
          Turn off
        </Button>
      </div>

      <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/[0.07] px-4 py-3 text-xs leading-relaxed text-secondary">
        <span className="font-semibold text-[var(--text-primary)]">
          This is an extrapolation, not a Forrester finding about you.
        </span>{' '}
        Forrester has not studied Microsoft 365 E7, has not studied your organisation, and has not
        reviewed this arithmetic. It is kept out of your net annual impact, effective per-user price
        and TCO, and every exported row is marked experimental. Use it to size the prize; use the
        cash panels to make the case.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Stat
          label={`Simulated ${tei.horizonYears}-year NPV`}
          value={formatCurrency(tei.npv, currency)}
          detail={`${formatCurrency(tei.totalBenefitPv, currency)} benefits less ${formatCurrency(
            tei.costPv,
            currency,
          )} costs`}
          emphasis
        />
        <Stat
          label="Simulated ROI"
          value={tei.roiPct === null ? '—' : formatPercent(tei.roiPct)}
          detail={
            tei.roiPct === null
              ? 'No investment to return against'
              : 'Return on the E7 investment, discounted at 10%'
          }
        />
        <Stat
          label="Simulated value per seat"
          value={tei.seats > 0 ? formatCurrency(tei.teiBenefitPv / tei.seats, currency) : '—'}
          detail={
            tei.seats > 0
              ? `Over ${tei.horizonYears} years, against ${formatCurrency(
                  tei.costPv / tei.seats,
                  currency,
                )} of cost per seat`
              : 'Enter a seat count to size this'
          }
        />
      </div>

      <Composition tei={tei} currency={currency} />

      <div className="no-print mt-5 grid gap-5 rounded-xl border border-subtle bg-[var(--surface-sunken)] p-4 sm:grid-cols-2">
        <SliderField
          label="Copilot adoption"
          value={settings.copilotAdoptionPct}
          onChange={setTeiAdoption}
          min={0}
          max={100}
          format={(v) => `${v}% · ${formatNumber(Math.round((tei.seats * v) / 100))} seats`}
          hint="Forrester's composite licensed only 40% of its workforce by year three. E7 licenses everyone, but a licence is not usage — so Copilot value and Copilot enablement cost both scale by this."
        />
        <SliderField
          label="Confidence haircut"
          value={settings.confidencePct}
          onChange={setTeiConfidence}
          min={0}
          max={100}
          format={(v) => `${v}% of study value`}
          hint="One honest global discount on the whole simulation. You are not the composite organisation, so this is where you say by how much."
        />
        <div className="sm:col-span-2">
          <Toggle
            checked={settings.includeEnablementCost}
            onChange={toggleTeiEnablementCost}
            label="Charge Copilot enablement"
            description={`From the study's own training line: $638.40 per adopting seat in year one, $399.00 after. ${formatCurrency(
              tei.enablementTotal,
              currency,
            )} over ${tei.horizonYears} years at your settings.`}
          />
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {tei.studies.map((summary) => {
          const study = getStudy(summary.studyId);
          if (!study) return null;
          const lines = tei.scoredLines.filter((l) => l.studyId === study.id);
          return (
            <section key={study.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h3 className="text-sm font-bold">
                  {study.title.replace('The Total Economic Impact™ Of ', '')}
                  <span className="ml-2 text-xs font-normal text-muted">{study.published}</span>
                </h3>
                {summary.applies ? (
                  <p className="numeral text-sm font-bold text-amber-700 dark:text-amber-300">
                    {formatCurrency(summary.presentValue, currency)}
                    <span className="ml-1.5 text-[11px] font-normal text-muted">
                      present value · {summary.includedLineCount} of {lines.length} lines
                    </span>
                  </p>
                ) : (
                  <Badge tone="muted">Already banked</Badge>
                )}
              </div>

              {!summary.applies && summary.notApplicableReason && (
                <p className="mt-1.5 rounded-lg border border-subtle bg-[var(--surface-sunken)] px-3 py-2 text-xs leading-relaxed text-secondary">
                  {summary.notApplicableReason}
                </p>
              )}

              {summary.applies && (
                <ul className="mt-2 grid gap-2 lg:grid-cols-2">
                  {lines.map((scored) => (
                    <LineRow key={scored.lineId} scored={scored} currency={currency} />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <div className="no-print mt-5 flex flex-wrap items-center gap-2">
        <Button variant="secondary" onClick={() => setShowMethod((v) => !v)} aria-expanded={showMethod}>
          <ChevronDown
            className={cx('h-4 w-4 transition-transform', showMethod && 'rotate-180')}
            aria-hidden
          />
          {showMethod ? 'Hide the derivation' : 'How this is derived'}
        </Button>
        {overrideCount > 0 && (
          <Button variant="ghost" onClick={resetTeiLines}>
            <RotateCcw className="h-4 w-4" aria-hidden />
            Reset {overrideCount} changed {overrideCount === 1 ? 'line' : 'lines'}
          </Button>
        )}
      </div>

      {showMethod && <TeiMethod result={tei} currency={currency} />}
    </Card>
  );
}

/**
 * The gate. Nobody should meet a simulated number by accident, so the panel starts as an offer
 * that states the weakness of the claim before the click, not after it.
 */
function TeiGate({ onEnable, horizonYears }: { onEnable: () => void; horizonYears: number }) {
  return (
    <Card className="no-print border-dashed border-amber-500/40 bg-amber-500/[0.02] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-3">
          <FlaskConical
            className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400"
            aria-hidden
          />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold">Simulated Forrester TEI</h2>
              <Badge tone="warning">Experimental</Badge>
            </div>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-secondary">
              E7 bundles three things Forrester has separately measured: Microsoft 365 E5, Microsoft
              365 Copilot and the Entra Suite. Their published studies can be re-scaled to your seat
              count to indicate the productivity, IT-efficiency and risk value that arrives with the
              consolidation — a {horizonYears}-year NPV, ROI and per-seat value alongside the cash.
            </p>
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-muted">
              It is off by default because it is a weaker claim than the rest of this page. Every
              other number here comes from spend you entered yourself. These come from Forrester
              composite organisations that are not you, so the output is an indication of scale
              rather than a forecast. Switching it on shows the full derivation for every line.
            </p>
          </div>
        </div>
        <Button variant="secondary" onClick={onEnable} className="shrink-0">
          <FlaskConical className="h-4 w-4" aria-hidden />
          Run the simulation
        </Button>
      </div>
    </Card>
  );
}

function Stat({
  label,
  value,
  detail,
  emphasis,
}: {
  label: string;
  value: string;
  detail: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={cx(
        'rounded-xl border px-4 py-3',
        emphasis ? 'border-amber-500/35 bg-amber-500/[0.06]' : 'border-subtle',
      )}
    >
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted">{label}</p>
      <p
        className={cx(
          'numeral mt-0.5 text-xl font-extrabold tabular-nums',
          emphasis && 'text-amber-700 dark:text-amber-300',
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[11px] leading-relaxed text-muted">{detail}</p>
    </div>
  );
}

/**
 * Where the simulated NPV actually comes from. Splitting cash from simulated value on the same
 * bar is the point: it shows at a glance how much of the case rests on the softer number.
 */
function Composition({ tei, currency }: { tei: TeiResult; currency: string }) {
  const total = tei.cashBenefitPv + tei.teiBenefitPv;
  if (total <= 0) return null;
  const cashPct = (tei.cashBenefitPv / total) * 100;

  return (
    <div className="mt-4">
      <div className="flex h-2.5 overflow-hidden rounded-full bg-ink-500/15" aria-hidden>
        <div className="bg-accent-500" style={{ width: `${cashPct}%` }} />
        <div className="flex-1 bg-amber-500" />
      </div>
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 shrink-0 rounded-full bg-accent-500" aria-hidden />
          <span className="text-secondary">Cash you stop spending</span>
          <span className="numeral font-semibold tabular-nums">
            {formatCompactCurrency(tei.cashBenefitPv, currency)}
          </span>
          <span className="text-muted">({formatPercent(cashPct)})</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" aria-hidden />
          <span className="text-secondary">Simulated study value</span>
          <span className="numeral font-semibold tabular-nums">
            {formatCompactCurrency(tei.teiBenefitPv, currency)}
          </span>
          <span className="text-muted">({formatPercent(100 - cashPct)})</span>
        </span>
      </div>
    </div>
  );
}

function LineRow({ scored, currency }: { scored: TeiScoredLine; currency: string }) {
  const { setTeiLineOverride } = useAssessment();
  const { line, included, suppressedReason } = scored;

  return (
    <li className="min-w-0">
      <button
        type="button"
        role="checkbox"
        aria-checked={included}
        onClick={() => setTeiLineOverride(line.id, !included)}
        className={cx(
          'flex min-h-11 w-full min-w-0 items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors',
          included
            ? 'border-amber-500/40 bg-amber-500/[0.07]'
            : 'border-subtle hover:bg-[var(--surface-sunken)]',
        )}
      >
        <span
          className={cx(
            'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors',
            included ? 'border-amber-600 bg-amber-600 text-white' : 'border-ink-500/40',
          )}
          aria-hidden
        >
          {included && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-sm font-semibold">{line.name}</span>
            <Badge tone="muted">{KIND_LABEL[line.kind] ?? line.kind}</Badge>
          </span>
          <span className="mt-1 block text-xs leading-relaxed text-secondary">{line.detail}</span>
          {suppressedReason && (
            <span className="mt-1.5 block text-[11px] leading-relaxed text-amber-700 dark:text-amber-400">
              {included ? 'Counted despite a warning: ' : 'Off by default: '}
              {suppressedReason}
            </span>
          )}
        </span>

        <span className="shrink-0 text-right">
          <span className="numeral block text-sm font-bold tabular-nums">
            {included ? formatCurrency(scored.byYear[0] ?? 0, currency) : '—'}
          </span>
          <span className="numeral block text-[11px] text-muted">
            {formatPupm(scored.perSeatYear1, currency)}/seat/yr
          </span>
        </span>
      </button>
    </li>
  );
}
