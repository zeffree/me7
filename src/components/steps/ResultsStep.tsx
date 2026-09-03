import { useMemo, useState } from 'react';
import { Check, Download, FileSpreadsheet, Link2, Lock, Printer } from 'lucide-react';
import { SectionHeading, Button, Card } from '@/components/ui/Primitives';
import { StepContainer } from '@/components/layout/AppShell';
import { Headline } from '@/components/results/Headline';
import { Waterfall } from '@/components/results/Waterfall';
import { TcoChartLazy } from '@/components/results/TcoChartLazy';
import { SellerWorkspace } from '@/components/results/SellerWorkspace';
import { CostAvoidancePanel } from '@/components/results/CostAvoidance';
import { TeiPanel } from '@/components/results/TeiPanel';
import {
  BucketBreakdown,
  DomainTable,
  LineDetail,
  NotCoveredPanel,
} from '@/components/results/Breakdown';
import { useAssessment, toAssessment } from '@/store/useAssessment';
import { computeAssessment } from '@/model/engine';
import { computeTei } from '@/model/tei';
import { buildShareUrl } from '@/store/share';
import { copyToClipboard, exportCsv, exportJson, printBusinessCase } from '@/lib/export';
import { getBaseline, E7_SKU, PRICING_AS_OF } from '@/data/skus';
import { formatCurrency, formatPupm } from '@/lib/format';

function ImportFlash() {
  const flash = useAssessment((s) => s.flash);
  const setFlash = useAssessment((s) => s.setFlash);
  if (!flash) return null;
  return (
    <div
      role="status"
      className="no-print flex items-start gap-2.5 rounded-xl border border-accent-600/30 bg-accent-500/10 px-4 py-3 text-sm font-semibold text-accent-700 dark:text-accent-300"
    >
      <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span className="flex-1">{flash}</span>
      <button
        type="button"
        onClick={() => setFlash(null)}
        className="shrink-0 rounded-md px-2 py-0.5 text-xs font-bold underline-offset-2 hover:underline"
      >
        Dismiss
      </button>
    </div>
  );
}

export function ResultsStep() {
  const state = useAssessment();
  const [copied, setCopied] = useState(false);

  const assessment = useMemo(() => toAssessment(state), [state]);
  const result = useMemo(() => computeAssessment(assessment), [assessment]);
  const tei = useMemo(() => computeTei(assessment, result), [assessment, result]);
  const baseline = getBaseline(state.baseline);

  const onShare = async () => {
    const ok = await copyToClipboard(buildShareUrl(assessment));
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    }
  };

  return (
    <StepContainer>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeading
          eyebrow="Results"
          title={`${state.orgName || 'Your organisation'} — the E7 business case`}
          description={
            <>
              {state.seats.toLocaleString()} seats on {baseline.name}, moving to {E7_SKU.name}. Every
              number below traces back to a line you entered and an assumption you can change.
            </>
          }
        />
        <div className="no-print flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={onShare}
            title="Copies a link that carries this assessment inside the URL itself"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <Link2 className="h-3.5 w-3.5" aria-hidden />
            )}
            {copied ? 'Link copied' : 'Copy share link'}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => exportCsv(assessment, result, tei)}>
            <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden />
            CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={() => exportJson(assessment, result, tei)}>
            <Download className="h-3.5 w-3.5" aria-hidden />
            JSON
          </Button>
          <Button size="sm" onClick={printBusinessCase}>
            <Printer className="h-3.5 w-3.5" aria-hidden />
            Print business case
          </Button>
        </div>
      </div>

      <p className="no-print mt-4 flex items-start gap-1.5 text-xs leading-relaxed text-muted">
        <Lock className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
        <span>
          Nothing here is uploaded — the app has no server. Note that the share link carries this
          assessment <em>inside the URL</em>, compressed but not encrypted, so anyone holding the
          link can read your seat count and every price you entered. Treat it like the spreadsheet,
          not like a public page.
        </span>
      </p>

      <div className="mt-8 space-y-5">
        <ImportFlash />
        <Headline result={result} currency={state.currency} />
        <BucketBreakdown result={result} currency={state.currency} />
        <Waterfall result={result} currency={state.currency} />
        <TcoChartLazy result={result} currency={state.currency} />
        <DomainTable result={result} currency={state.currency} />
        <LineDetail result={result} currency={state.currency} />
        <CostAvoidancePanel result={result} currency={state.currency} />
        <NotCoveredPanel result={result} currency={state.currency} />
        <TeiPanel tei={tei} currency={state.currency} />

        {state.sellerMode && (
          <SellerWorkspace result={result} tei={tei} currency={state.currency} />
        )}

        <Card className="p-6">
          <h2 className="text-base font-bold">The assumptions behind these numbers</h2>
          <dl className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            <Assumption
              term="E7 price used"
              detail={`${formatPupm(result.e7NetPupm, state.currency)} — ${state.assumptions.e7DiscountPct}% off ${formatPupm(state.assumptions.e7ListPupm, state.currency)} list`}
            />
            <Assumption
              term="Your suite today"
              detail={`${formatPupm(state.assumptions.baselineUnitPupm, state.currency)} × ${state.seats.toLocaleString()} seats = ${formatCurrency(result.baselineAnnual, state.currency)}/yr`}
            />
            <Assumption
              term="Replacement credit"
              detail="Each vendor line credited at what you entered, less the share you said you would retain. No confidence factor is applied."
            />
            <Assumption
              term="Year one"
              detail="Modelled at full run-rate. Adjust a line's retained share if a contract runs past your move date."
            />
            <Assumption
              term="Not covered by E7"
              detail="Credited at zero regardless of spend entered — see the exclusions panel above."
            />
            <Assumption
              term="Cost avoided"
              detail="Priced at typical third-party list prices and reported on its own. Never added to net impact, effective price or TCO."
            />
            <Assumption
              term="Pricing basis"
              detail={`Published list prices as of ${PRICING_AS_OF}. Estimator only — not a Microsoft quote.`}
            />
            {tei.enabled && (
              <Assumption
                term="Simulated TEI"
                detail="Experimental. Three Forrester studies re-scaled to your seats at a 10% discount rate. Reported separately and never added to net impact, effective price or TCO."
              />
            )}
          </dl>
        </Card>
      </div>

      <div className="no-print mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-subtle pt-6">
        <Button variant="ghost" onClick={() => state.setStep('assumptions')}>
          Back to assumptions
        </Button>
        <Button variant="secondary" onClick={() => state.setStep('catalog')}>
          Capture more spend
        </Button>
      </div>
    </StepContainer>
  );
}

function Assumption({ term, detail }: { term: string; detail: string }) {
  return (
    <div>
      <dt className="text-[11px] font-bold uppercase tracking-wide text-muted">{term}</dt>
      <dd className="mt-1 text-sm leading-relaxed text-secondary">{detail}</dd>
    </div>
  );
}

