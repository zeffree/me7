import { ExternalLink } from 'lucide-react';
import {
  TEI_DISCOUNT_RATE,
  TEI_STUDIES,
  getStudy,
  perSeatRate,
  type TeiStudy,
} from '@/data/teiStudies';
import type { TeiResult } from '@/model/types';
import { formatCurrency, formatNumber, formatPupm } from '@/lib/format';

/**
 * The disclosure that earns the rest of the panel.
 *
 * A simulated number is only worth showing if a sceptic can take it apart. So every line's
 * arithmetic is printed in full — the figure Forrester published, the seat population it was
 * earned across, the division, and the multiplication back up to this customer — with a link to
 * the study it came from. Nothing here is a tooltip or a footnote: a finance reviewer should be
 * able to check any figure against the source without leaving the page.
 */
export function TeiMethod({ result, currency }: { result: TeiResult; currency: string }) {
  return (
    <div className="mt-5 space-y-5 rounded-2xl border border-subtle bg-[var(--surface-sunken)] p-5">
      <section>
        <h3 className="text-sm font-bold">How this is derived</h3>
        <p className="mt-2 max-w-3xl text-xs leading-relaxed text-secondary">
          Each study below reports benefits for a composite organisation Forrester built from real
          interviews. Every published line is divided by the seat population that earned it, giving
          a value per seat per year, then multiplied back up by your{' '}
          <span className="numeral font-semibold text-[var(--text-primary)]">
            {formatNumber(result.seats)}
          </span>{' '}
          seats. Forrester's own year-by-year shape is kept rather than averaged, and years beyond
          the study's third hold at the year-three rate instead of extrapolating a trend nobody
          measured. Cash flows are discounted at{' '}
          <span className="font-semibold text-[var(--text-primary)]">
            {Math.round(TEI_DISCOUNT_RATE * 100)}% a year
          </span>
          , which is what all three studies use. All figures are the risk-adjusted ones.
        </p>
        <p className="mt-3 max-w-3xl rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-4 py-3 text-xs leading-relaxed text-secondary">
          <span className="font-semibold text-[var(--text-primary)]">
            Forrester did not study Microsoft 365 E7.
          </span>{' '}
          It did not study your organisation, and it has not reviewed or endorsed this arithmetic.
          Three separate studies are being re-scaled onto one customer who is not any of their
          composites. Treat the output as an order-of-magnitude indication of the value E7 bundles,
          never as a forecast — and never as a Forrester finding about you.
        </p>
      </section>

      <section>
        <h3 className="text-sm font-bold">The three studies</h3>
        <ul className="mt-2 grid gap-3 lg:grid-cols-3">
          {TEI_STUDIES.map((study) => (
            <StudyCard
              key={study.id}
              study={study}
              currency={currency}
              applies={result.studies.find((s) => s.studyId === study.id)?.applies ?? false}
            />
          ))}
        </ul>
      </section>

      <section>
        <h3 className="text-sm font-bold">Line-by-line derivation</h3>
        <p className="mt-1 text-xs text-secondary">
          Year-one figures. Where a study ramps across its three years, the panel above uses each
          year's own rate.
        </p>
        <div className="mt-3 space-y-4">
          {result.studies.map((summary) => {
            const study = getStudy(summary.studyId);
            if (!study) return null;
            const lines = result.scoredLines.filter((l) => l.studyId === study.id);
            return (
              <div key={study.id}>
                <p className="text-xs font-bold uppercase tracking-wide text-muted">
                  {study.title.replace('The Total Economic Impact™ Of ', '')}
                  <span className="ml-2 font-normal normal-case tracking-normal">
                    ÷ {formatNumber(study.lines[0]?.divisor[0] ?? 0)} seats
                  </span>
                </p>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full min-w-[42rem] border-collapse text-xs">
                    <caption className="sr-only">
                      Per-seat derivation for {study.title}, year one
                    </caption>
                    <thead>
                      <tr className="text-left text-muted">
                        <th scope="col" className="py-1.5 pr-3 font-semibold">
                          Study line
                        </th>
                        <th scope="col" className="py-1.5 pr-3 text-right font-semibold">
                          Published (Y1)
                        </th>
                        <th scope="col" className="py-1.5 pr-3 text-right font-semibold">
                          ÷ seats
                        </th>
                        <th scope="col" className="py-1.5 pr-3 text-right font-semibold">
                          = per seat/yr
                        </th>
                        <th scope="col" className="py-1.5 text-right font-semibold">
                          × your seats
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((scored) => {
                        const rate = perSeatRate(scored.line, 0);
                        return (
                          <tr
                            key={scored.lineId}
                            className="border-t border-subtle align-top text-secondary"
                          >
                            <th scope="row" className="max-w-xs py-1.5 pr-3 text-left font-normal">
                              <span
                                className={
                                  scored.included
                                    ? 'font-semibold text-[var(--text-primary)]'
                                    : 'text-muted line-through decoration-1'
                                }
                              >
                                {scored.line.name}
                              </span>
                              <span className="ml-1.5 text-muted">({scored.line.ref})</span>
                            </th>
                            <td className="numeral py-1.5 pr-3 text-right tabular-nums">
                              {formatCurrency(scored.line.published[0], currency)}
                            </td>
                            <td className="numeral py-1.5 pr-3 text-right tabular-nums text-muted">
                              {formatNumber(scored.line.divisor[0])}
                            </td>
                            <td className="numeral py-1.5 pr-3 text-right tabular-nums">
                              {formatPupm(rate, currency)}
                            </td>
                            <td className="numeral py-1.5 text-right font-semibold tabular-nums text-[var(--text-primary)]">
                              {scored.included
                                ? formatCurrency(scored.byYear[0] ?? 0, currency)
                                : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
                  {study.divisorNote}
                </p>
                {study.excluded?.map((ex) => (
                  <p key={ex.name} className="mt-1.5 text-[11px] leading-relaxed text-muted">
                    <span className="font-semibold">Not modelled — {ex.name}</span> (
                    {formatCurrency(ex.publishedPv, currency)} of the study's benefits). {ex.reason}
                  </p>
                ))}
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-bold">What the simulation charges you</h3>
        <p className="mt-2 max-w-3xl text-xs leading-relaxed text-secondary">
          A benefits list is not a business case, so the same numbers your assessment already uses
          appear on the cost side: the E7 licence uplift over your current baseline
          {result.upliftAnnual > 0 && (
            <>
              {' '}
              (
              <span className="numeral font-semibold text-[var(--text-primary)]">
                {formatCurrency(result.upliftAnnual, currency)}
              </span>{' '}
              a year)
            </>
          )}
          , your migration cost
          {result.migrationTotal > 0 && (
            <>
              {' '}
              (
              <span className="numeral font-semibold text-[var(--text-primary)]">
                {formatCurrency(result.migrationTotal, currency)}
              </span>
              , charged once at the start)
            </>
          )}
          , and Copilot enablement. Enablement comes from the Copilot study's own training line —
          ten hours of formal training plus six hours ongoing at a $38 fully burdened hourly rate,
          risk-adjusted upwards by 5% — which works out at $638.40 per adopting seat in year one and
          $399.00 a year after that. Claiming Copilot's productivity while hiding what it costs to
          get there is the fastest way to lose a finance audience.
        </p>
        <p className="mt-2 max-w-3xl text-xs leading-relaxed text-secondary">
          The Copilot study also carries an organisation-level implementation cost of roughly ten
          internal FTEs, which is <span className="font-semibold">not</span> modelled here — your
          own migration cost per seat covers that ground, and stacking both would double-charge it.
        </p>
      </section>
    </div>
  );
}

function StudyCard({
  study,
  currency,
  applies,
}: {
  study: TeiStudy;
  currency: string;
  applies: boolean;
}) {
  return (
    <li className="rounded-xl border border-subtle bg-[var(--surface-raised)] p-4">
      <a
        href={study.url}
        target="_blank"
        rel="noreferrer noopener"
        className="group inline-flex items-start gap-1.5 text-xs font-bold text-brand-700 hover:underline dark:text-brand-300"
      >
        <span>{study.title}</span>
        <ExternalLink className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
      </a>
      <p className="mt-1 text-[11px] text-muted">
        Forrester Consulting, {study.published} · commissioned by Microsoft
      </p>
      <dl className="mt-2.5 space-y-1.5 text-[11px] leading-relaxed">
        <div>
          <dt className="font-semibold text-secondary">Composite</dt>
          <dd className="text-muted">{study.composite}</dd>
        </div>
        <div>
          <dt className="font-semibold text-secondary">Measured against</dt>
          <dd className="text-muted">{study.priorState}</dd>
        </div>
        <div>
          <dt className="font-semibold text-secondary">Published result</dt>
          <dd className="numeral text-muted">
            {formatCurrency(study.publishedBenefitsPv, currency)} benefits ·{' '}
            {study.publishedRoiPct}% ROI · payback {study.publishedPayback} · based on{' '}
            {study.researchBase}
          </dd>
        </div>
      </dl>
      {!applies && (
        <p className="mt-2.5 rounded-lg border border-subtle px-2.5 py-2 text-[11px] leading-relaxed text-muted">
          Not counted for your baseline — you already hold this.
        </p>
      )}
    </li>
  );
}
