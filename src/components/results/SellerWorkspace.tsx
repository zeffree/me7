import { useMemo, useState } from 'react';
import {
  Presentation,
  Swords,
  ShieldQuestion,
  MessageSquareQuote,
  ClipboardList,
  Copy,
  Check,
} from 'lucide-react';
import type { EngineResult, TeiResult } from '@/model/types';
import { Card, Badge, Button } from '@/components/ui/Primitives';
import { DOMAINS, type DomainId } from '@/data/categories';
import { getBaseline, E7_SKU } from '@/data/skus';
import {
  findBattlecards,
  OBJECTIONS,
  DISCOVERY_QUESTIONS,
  GAP_PROBES,
  type DealContext,
} from '@/data/sellerPlays';
import { formatCurrency, formatNumber, formatPupm, cx } from '@/lib/format';
import { useAssessment } from '@/store/useAssessment';
import { copyToClipboard } from '@/lib/export';

type TabId = 'snapshot' | 'talk' | 'objections' | 'discovery' | 'battlecards';

const TABS: { id: TabId; label: string; icon: typeof Presentation }[] = [
  { id: 'snapshot', label: 'Deal snapshot', icon: Presentation },
  { id: 'talk', label: 'Talking points', icon: MessageSquareQuote },
  { id: 'objections', label: 'Objections', icon: ShieldQuestion },
  { id: 'discovery', label: 'Discovery', icon: ClipboardList },
  { id: 'battlecards', label: 'Battlecards', icon: Swords },
];

/**
 * Seller mode. Everything in here is derived from the assessment on screen rather than being
 * generic collateral — a talking point that does not cite this customer's own number is not
 * worth the seller's attention, and an objection they will not face is noise.
 */
export function SellerWorkspace({
  result,
  tei,
  currency,
}: {
  result: EngineResult;
  tei: TeiResult;
  currency: string;
}) {
  const state = useAssessment();
  const [tab, setTab] = useState<TabId>('snapshot');

  const ctx: DealContext = useMemo(() => {
    const redundant =
      result.buckets.find((b) => b.bucket === 'already-redundant')?.conservativeCredit ?? 0;
    const notCovered =
      result.scoredLines
        .filter((l) => l.bucket === 'not-covered')
        .reduce((a, l) => a + l.annualSpend, 0) +
      result.scoredAddOns.filter((a) => !a.absorbed).reduce((a, x) => a + x.annualSpend, 0);
    return {
      baseline: state.baseline,
      seats: result.seats,
      netAnnual: result.netAnnualConservative,
      upliftAnnual: result.uplift,
      redundantToday: redundant,
      notCoveredAnnual: notCovered,
      capturedLines: result.scoredLines.length,
      avoidedSelected: result.avoidedAnnualSelected,
    };
  }, [result, state.baseline]);

  return (
    <Card className="print-keep border-brand-500/30 bg-brand-500/[0.04] p-0">
      <div className="border-b border-brand-500/20 p-6 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="brand">Seller mode</Badge>
          <span className="text-xs text-muted">Visible only to you — hidden when the toggle is off</span>
        </div>
        <h2 className="mt-3 text-base font-bold">How to run this conversation</h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-secondary">
          Built from the numbers on this page, not from a generic deck. Everything below cites
          this customer&rsquo;s own figures, and every play names where the incumbent genuinely
          wins so you do not have to walk anything back later.
        </p>

        <div
          role="tablist"
          aria-label="Seller mode sections"
          className="no-print mt-5 flex flex-wrap gap-1.5"
        >
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                id={`seller-tab-${t.id}`}
                aria-selected={active}
                aria-controls={`seller-panel-${t.id}`}
                onClick={() => setTab(t.id)}
                className={cx(
                  'inline-flex min-h-11 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors',
                  active
                    ? 'bg-brand-600 text-white'
                    : 'text-secondary hover:bg-brand-500/10 hover:text-[var(--text-primary)]',
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        role="tabpanel"
        id={`seller-panel-${tab}`}
        aria-labelledby={`seller-tab-${tab}`}
        className="p-6"
      >
        {tab === 'snapshot' && <Snapshot result={result} currency={currency} ctx={ctx} />}
        {tab === 'talk' && (
          <TalkingPoints result={result} tei={tei} currency={currency} ctx={ctx} />
        )}
        {tab === 'objections' && <Objections ctx={ctx} />}
        {tab === 'discovery' && <Discovery result={result} currency={currency} />}
        {tab === 'battlecards' && <Battlecards result={result} currency={currency} />}
      </div>
    </Card>
  );
}

// ------------------------------------------------------------------------------- snapshot

function Snapshot({
  result,
  currency,
  ctx,
}: {
  result: EngineResult;
  currency: string;
  ctx: DealContext;
}) {
  const state = useAssessment();
  const baseline = getBaseline(state.baseline);
  const topLines = [...result.scoredLines]
    .sort((a, b) => b.conservativeCredit - a.conservativeCredit)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Seats" value={result.seats.toLocaleString()} sub={baseline.name} />
        <Metric
          label="Deal size (E7 ACV)"
          value={formatCurrency(result.e7Annual, currency)}
          sub={`${formatPupm(result.e7NetPupm, currency)} at ${state.assumptions.e7DiscountPct}% off list`}
        />
        <Metric
          label="Gross uplift to clear"
          value={formatCurrency(result.uplift, currency)}
          sub="Before any consolidation credit"
        />
        <Metric
          label="Net position"
          value={formatCurrency(result.netAnnualConservative, currency)}
          sub={ctx.netAnnual >= 0 ? 'Customer is ahead' : 'Gap still to close'}
          tone={ctx.netAnnual >= 0 ? 'positive' : 'danger'}
        />
      </dl>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-subtle bg-[var(--surface-sunken)] p-5">
          <h3 className="text-sm font-bold">Where your leverage is</h3>
          {topLines.length === 0 ? (
            <p className="mt-2 text-sm text-secondary">
              No vendor spend captured yet. Until it is, there is no consolidation story to tell —
              the discovery tab is where this conversation actually starts.
            </p>
          ) : (
            <ol className="mt-3 space-y-2.5">
              {topLines.map((l, i) => (
                <li key={l.category.id} className="flex items-baseline gap-3">
                  <span className="numeral w-5 shrink-0 text-xs font-bold text-muted">
                    {i + 1}.
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {l.line.vendor || l.category.name}
                    </span>
                    <span className="block text-xs text-secondary">
                      {l.category.name} · {l.category.e7Component}
                    </span>
                  </span>
                  <span className="numeral shrink-0 text-sm font-bold tabular-nums text-accent-700 dark:text-accent-300">
                    {formatCurrency(l.conservativeCredit, currency)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="rounded-xl border border-subtle bg-[var(--surface-sunken)] p-5">
          <h3 className="text-sm font-bold">Read the room this way</h3>
          <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-secondary">
            <li>
              <span className="font-semibold text-[var(--text-primary)]">Open with</span>{' '}
              {formatPupm(result.effectiveNetPupmConservative, currency)}, not{' '}
              {formatPupm(E7_SKU.listPricePupm, currency)}. The sticker is the objection; the
              effective price is the conversation.
            </li>
            {ctx.redundantToday > 0 && (
              <li>
                <span className="font-semibold text-[var(--text-primary)]">Lead the audit.</span>{' '}
                {formatCurrency(ctx.redundantToday, currency)} a year is spend on capability they
                already own. That is worth money to them whether or not they ever buy E7.
              </li>
            )}
            {ctx.notCoveredAnnual > 0 && (
              <li>
                <span className="font-semibold text-[var(--text-primary)]">
                  Volunteer the exclusions.
                </span>{' '}
                {formatCurrency(ctx.notCoveredAnnual, currency)} continues after the move. Say it
                before they find it.
              </li>
            )}
            {ctx.avoidedSelected > 0 && (
              <li>
                <span className="font-semibold text-[var(--text-primary)]">
                  Keep the two ledgers apart.
                </span>{' '}
                {formatCurrency(ctx.avoidedSelected, currency)} of new capability is value gained,
                not cash saved. Present it separately or finance will discount everything.
              </li>
            )}
            {ctx.capturedLines < 5 && (
              <li>
                <span className="font-semibold text-[var(--text-primary)]">
                  Do not close on this.
                </span>{' '}
                Only {ctx.capturedLines} {ctx.capturedLines === 1 ? 'line' : 'lines'} captured. The
                next meeting is a spend inventory, not a proposal.
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  sub,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  sub: string;
  tone?: 'neutral' | 'positive' | 'danger';
}) {
  return (
    <div className="rounded-xl border border-subtle bg-[var(--surface)] p-4">
      <dt className="text-[11px] font-bold uppercase tracking-wide text-muted">{label}</dt>
      <dd>
        <p
          className={cx(
            'numeral mt-1.5 text-xl font-extrabold',
            tone === 'positive' && 'text-accent-700 dark:text-accent-300',
            tone === 'danger' && 'text-rose-700 dark:text-rose-400',
          )}
        >
          {value}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-secondary">{sub}</p>
      </dd>
    </div>
  );
}

// -------------------------------------------------------------------------- talking points

function TalkingPoints({
  result,
  tei,
  currency,
  ctx,
}: {
  result: EngineResult;
  tei: TeiResult;
  currency: string;
  ctx: DealContext;
}) {
  const state = useAssessment();
  const [copied, setCopied] = useState(false);

  const summary = useMemo(
    () => buildExecSummary(result, currency, state.orgName, state.baseline),
    [result, currency, state.orgName, state.baseline],
  );

  const absorbed = result.scoredAddOns.filter((a) => a.absorbed);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-bold">Executive summary</h3>
          <Button
            variant="secondary"
            className="no-print"
            onClick={async () => {
              if (await copyToClipboard(summary)) {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }
            }}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" aria-hidden /> Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" aria-hidden /> Copy for email
              </>
            )}
          </Button>
        </div>
        <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-xl border border-subtle bg-[var(--surface-sunken)] p-4 font-sans text-sm leading-relaxed text-secondary">
          {summary}
        </pre>
      </div>

      <div>
        <h3 className="text-sm font-bold">Points that land, with their numbers</h3>
        <ul className="mt-3 space-y-3">
          <Point title="The effective price is the headline">
            E7 lists at {formatPupm(E7_SKU.listPricePupm, currency)}. For this customer, once the
            spend they can cancel comes out, it nets to{' '}
            <strong className="numeral text-[var(--text-primary)]">
              {formatPupm(result.effectiveNetPupmConservative, currency)}
            </strong>
            . Say that number in the first two minutes.
          </Point>

          {absorbed.length > 0 && (
            <Point title="Microsoft add-ons they stop buying separately">
              {absorbed.map((a) => a.name).join(', ')} — worth{' '}
              <strong className="numeral text-[var(--text-primary)]">
                {formatCurrency(result.addOnAnnualAbsorbed, currency)}
              </strong>{' '}
              a year. This is the least contestable part of the case: same vendor, same product,
              now included.
            </Point>
          )}

          {ctx.redundantToday > 0 && (
            <Point title="They are paying twice today">
              <strong className="numeral text-[var(--text-primary)]">
                {formatCurrency(ctx.redundantToday, currency)}
              </strong>{' '}
              a year on capability their current suite already covers. This is true regardless of
              E7 and it is often the finding that earns the next meeting.
            </Point>
          )}

          {result.buckets.find((b) => b.bucket === 'unlocked-by-e7')?.conservativeCredit ? (
            <Point title="What the upgrade newly buys them">
              <strong className="numeral text-[var(--text-primary)]">
                {formatCurrency(
                  result.buckets.find((b) => b.bucket === 'unlocked-by-e7')?.conservativeCredit ??
                    0,
                  currency,
                )}
              </strong>{' '}
              of vendor spend becomes redundant only after the move. This is the part that has to
              justify the uplift on its own.
            </Point>
          ) : null}

          {ctx.avoidedSelected > 0 && (
            <Point title="Budget they never have to ask for">
              <strong className="numeral text-[var(--text-primary)]">
                {formatCurrency(ctx.avoidedSelected, currency)}
              </strong>{' '}
              a year of capability included rather than purchased. Frame it as avoided future cost
              and keep it out of the savings total — the separation is what makes it believable.
            </Point>
          )}

          <Point title="Give finance the controls">
            The discount slider and every price on this page are editable. Hand the laptop over. A
            number the CFO tuned themselves is one they will defend in the approval meeting.
          </Point>

          {ctx.netAnnual < 0 && (
            <Point title="Do not hide the gap">
              On captured spend the total still rises by{' '}
              <strong className="numeral text-[var(--text-primary)]">
                {formatCurrency(Math.abs(ctx.netAnnual), currency)}
              </strong>
              . Put it on the table as the negotiation target. Sellers who bury this lose the room
              when it surfaces later — and it always surfaces.
            </Point>
          )}
        </ul>
      </div>

      {tei.enabled && <TeiTalkTrack tei={tei} currency={currency} />}
    </div>
  );
}

/**
 * How to carry a simulated number into a real meeting without getting caught out.
 *
 * A seller who presents an extrapolation as a Forrester finding about this customer will be
 * corrected in the room, and everything they said before it stops counting. So the coaching here
 * is mostly about framing and disclosure rather than about the number.
 */
function TeiTalkTrack({ tei, currency }: { tei: TeiResult; currency: string }) {
  const softShare =
    tei.totalBenefitPv > 0 ? Math.round((tei.teiBenefitPv / tei.totalBenefitPv) * 100) : 0;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-bold">Using the simulated TEI</h3>
        <Badge tone="warning">Experimental</Badge>
      </div>
      <p className="mt-1 text-sm leading-relaxed text-secondary">
        You have the TEI simulation switched on, so the customer can see it too. It is the most
        attackable thing on the page — handle it deliberately.
      </p>
      <ul className="mt-3 space-y-3">
        <Point title="Lead with the cash, land the TEI second">
          The consolidation savings are this customer&rsquo;s own invoices and survive any amount of
          scrutiny. The simulated{' '}
          <strong className="numeral text-[var(--text-primary)]">
            {formatCurrency(tei.teiBenefitPv, currency)}
          </strong>{' '}
          of study value is {softShare}% of the modelled benefit — it is the upside case, not the
          business case. Open with the invoices; use this to answer &ldquo;and what else do we
          get?&rdquo;
        </Point>

        <Point title="Say the word &lsquo;extrapolation&rsquo; before they do">
          Forrester has not studied E7, has not studied this customer, and has not reviewed this
          arithmetic. Say so out loud. Three published studies re-scaled to{' '}
          {formatNumber(tei.seats)} seats is a defensible thing to show a CFO; the same slide
          presented as a Forrester finding is not.
        </Point>

        <Point title="The double-count guards are your credibility">
          Lines that would count the same saving twice ship switched off — legacy software,
          vendor consolidation and VPN reduction are already in the cash numbers from real invoices.
          Show a finance reviewer that you removed them before they ask. It buys more trust than the
          value those lines would have added.
        </Point>

        <Point title="Hand over the two sliders">
          Copilot adoption is at{' '}
          <strong className="numeral text-[var(--text-primary)]">
            {formatNumber(tei.copilotSeats)}
          </strong>{' '}
          seats and the whole simulation is already discounted. Let them set both. A haircut the
          customer chose is a number they will argue for; one you chose is one they will argue with.
        </Point>

        {tei.studies.some((s) => !s.applies) && (
          <Point title="Name what you are not claiming">
            This customer already holds E5, so that study is excluded outright rather than quietly
            included. Point at the greyed-out block. Refusing to charge for something they already
            own is the single most persuasive thing in this panel.
          </Point>
        )}

        <Point title="Where enablement cost helps you">
          The model charges{' '}
          <strong className="numeral text-[var(--text-primary)]">
            {formatCurrency(tei.enablementTotal, currency)}
          </strong>{' '}
          of Copilot enablement, taken from the study&rsquo;s own training line. Volunteering a cost
          is disarming, and it pre-empts the &ldquo;you have ignored change management&rdquo;
          objection that otherwise arrives at the worst moment.
        </Point>
      </ul>
    </div>
  );
}

function Point({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <li className="rounded-xl border border-subtle bg-[var(--surface-sunken)] p-4">
      <p className="text-sm font-bold">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-secondary">{children}</p>
    </li>
  );
}

function buildExecSummary(
  result: EngineResult,
  currency: string,
  orgName: string,
  baselineId: string,
): string {
  const org = orgName.trim() || 'The organisation';
  const baseline = getBaseline(baselineId as Parameters<typeof getBaseline>[0]);
  const redundant =
    result.buckets.find((b) => b.bucket === 'already-redundant')?.conservativeCredit ?? 0;
  const positive = result.netAnnualConservative >= 0;

  const lines = [
    `${org} — Microsoft 365 E7 consolidation summary`,
    '',
    `Today: ${result.seats.toLocaleString()} seats on ${baseline.name}, with a total run-rate of ${formatCurrency(result.currentAnnualTotal, currency)} a year across the suite, Microsoft add-ons and ${result.scoredLines.length} third-party ${result.scoredLines.length === 1 ? 'contract' : 'contracts'}.`,
    '',
    `Moving to E7 costs ${formatCurrency(result.e7Annual, currency)} a year at ${formatPupm(result.e7NetPupm, currency)} per user — an uplift of ${formatCurrency(result.uplift, currency)} over the current suite.`,
    '',
    `Against that, ${formatCurrency(result.totalSavingsConservative, currency)} of existing spend becomes redundant: ${formatCurrency(result.addOnAnnualAbsorbed, currency)} in Microsoft add-ons now included, and ${formatCurrency(result.thirdPartyCreditConservative, currency)} in third-party contracts, after the share we agreed to retain.`,
    '',
    positive
      ? `Net effect: ${formatCurrency(result.netAnnualConservative, currency)} a year better off. E7 lists at ${formatPupm(E7_SKU.listPricePupm, currency)} but effectively costs ${formatPupm(result.effectiveNetPupmConservative, currency)} per user per month.`
      : `Net effect: total cost rises by ${formatCurrency(Math.abs(result.netAnnualConservative), currency)} a year on the spend captured so far. E7 lists at ${formatPupm(E7_SKU.listPricePupm, currency)} and effectively costs ${formatPupm(result.effectiveNetPupmConservative, currency)} per user per month once consolidation is applied.`,
  ];

  if (redundant > 0) {
    lines.push(
      '',
      `Separately worth acting on regardless of E7: ${formatCurrency(redundant, currency)} a year is being spent on capability the current ${baseline.name} licence already covers.`,
    );
  }

  if (result.avoidedAnnualSelected > 0) {
    lines.push(
      '',
      `Not counted in the figures above: roughly ${formatCurrency(result.avoidedAnnualSelected, currency)} a year of capability that comes included with E7 and would otherwise have to be bought. This is avoided future cost, not a cash saving.`,
    );
  }

  const notCovered =
    result.scoredLines
      .filter((l) => l.bucket === 'not-covered')
      .reduce((a, l) => a + l.annualSpend, 0) +
    result.scoredAddOns.filter((a) => !a.absorbed).reduce((a, x) => a + x.annualSpend, 0);

  if (notCovered > 0) {
    lines.push(
      '',
      `E7 does not cover everything. ${formatCurrency(notCovered, currency)} a year continues after the move, including items such as SIEM, PSTN calling plans and other separately-licensed products.`,
    );
  }

  lines.push('', 'Estimator based on published list prices. Not a Microsoft quote.');
  return lines.join('\n');
}

// ----------------------------------------------------------------------------- objections

function Objections({ ctx }: { ctx: DealContext }) {
  const relevant = OBJECTIONS.filter((o) => !o.when || o.when(ctx));

  return (
    <div>
      <p className="text-sm leading-relaxed text-secondary">
        Filtered to what this deal will actually raise. Every answer concedes the true part
        first — an objection response that argues with a fair point is how you lose credibility
        for the ones that matter.
      </p>
      <ul className="mt-4 space-y-3">
        {relevant.map((o) => (
          <li key={o.id} className="rounded-xl border border-subtle bg-[var(--surface-sunken)] p-5">
            <p className="text-sm font-bold text-[var(--text-primary)]">{o.objection}</p>
            <p className="mt-2.5 text-sm leading-relaxed text-secondary">
              <span className="font-semibold text-amber-700 dark:text-amber-300">Concede:</span>{' '}
              {o.concede}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-secondary">
              <span className="font-semibold text-accent-700 dark:text-accent-300">Then:</span>{' '}
              {o.answer}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ------------------------------------------------------------------------------ discovery

function Discovery({ result, currency }: { result: EngineResult; currency: string }) {
  const withSpend = new Set<DomainId>(result.domains.map((d) => d.domain));
  const spendByDomain = new Map(result.domains.map((d) => [d.domain, d.grossSpend]));

  const ordered = [...DOMAINS].sort((a, b) => {
    const av = spendByDomain.get(a.id) ?? -1;
    const bv = spendByDomain.get(b.id) ?? -1;
    return bv - av;
  });

  return (
    <div>
      <p className="text-sm leading-relaxed text-secondary">
        Domains with captured spend come first — those are conversations you can have with
        numbers. The empty ones are listed too, because a domain with no spend at enterprise
        scale is usually a contract nobody in the room owns rather than a genuine zero.
      </p>
      <div className="mt-4 space-y-3">
        {ordered.map((d) => {
          const spend = spendByDomain.get(d.id);
          const has = withSpend.has(d.id);
          return (
            <div
              key={d.id}
              className="rounded-xl border border-subtle bg-[var(--surface-sunken)] p-5"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-sm font-bold">{d.name}</h3>
                {has ? (
                  <Badge tone="positive">
                    {formatCurrency(spend ?? 0, currency)} captured
                  </Badge>
                ) : (
                  <Badge tone="muted">Nothing captured</Badge>
                )}
              </div>
              {!has && (
                <p className="mt-2 text-sm leading-relaxed text-amber-700 dark:text-amber-300">
                  {GAP_PROBES[d.id]}
                </p>
              )}
              <ul className="mt-3 space-y-1.5">
                {DISCOVERY_QUESTIONS[d.id].map((q) => (
                  <li key={q} className="flex gap-2.5 text-sm leading-relaxed text-secondary">
                    <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-brand-500" />
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------- battlecards

function Battlecards({ result, currency }: { result: EngineResult; currency: string }) {
  const vendors = result.scoredLines.map((l) => l.line.vendor).filter(Boolean);
  const cards = findBattlecards(vendors);

  const spendFor = (match: RegExp) =>
    result.scoredLines
      .filter((l) => match.test(l.line.vendor))
      .reduce((a, l) => a + l.annualSpend, 0);

  if (cards.length === 0) {
    return (
      <p className="text-sm leading-relaxed text-secondary">
        No battlecards yet — these appear once you capture spend against named vendors. Enter the
        incumbent by name on the catalog step and the relevant competitive positioning shows up
        here, including where that vendor genuinely wins.
      </p>
    );
  }

  return (
    <div>
      <p className="text-sm leading-relaxed text-secondary">
        Matched to the vendors named in this assessment. Read the &ldquo;where they win&rdquo;
        section before the meeting, not after — conceding a real strength is what buys you the
        right to make the rest of the argument.
      </p>
      <div className="mt-4 space-y-3">
        {cards.map((c) => (
          <div
            key={c.vendor}
            className="rounded-xl border border-subtle bg-[var(--surface-sunken)] p-5"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-bold">{c.vendor}</h3>
              <Badge tone="neutral">{formatCurrency(spendFor(c.match), currency)} captured</Badge>
            </div>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
              vs {c.counter}
            </p>
            <dl className="mt-3 space-y-2.5 text-sm leading-relaxed">
              <div>
                <dt className="font-semibold text-accent-700 dark:text-accent-300">
                  Where the wedge is
                </dt>
                <dd className="text-secondary">{c.wedge}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[var(--text-primary)]">Where they genuinely win</dt>
                <dd className="text-secondary">{c.theyWin}</dd>
              </div>
              <div>
                <dt className="font-semibold text-rose-700 dark:text-rose-400">Do not claim</dt>
                <dd className="text-secondary">{c.trap}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}
