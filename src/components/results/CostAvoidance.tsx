import type { AvoidedCapability, AvoidedLicence, EngineResult } from '@/model/types';
import { useAssessment } from '@/store/useAssessment';
import { DOMAINS } from '@/data/categories';
import { getBaseline } from '@/data/skus';
import { getStandaloneLicence } from '@/data/standaloneLicences';
import { formatCurrency, formatPupm } from '@/lib/format';
import { NumberField, Toggle } from '@/components/ui/Fields';
import { Button, Note } from '@/components/ui/Primitives';
import { Evidence } from '@/components/ui/Evidence';
import { BenchmarkContext } from '@/components/catalog/BenchmarkContext';

const usd = (value: number) => formatCurrency(value, 'USD');
const pupm = (value: number) => formatPupm(value, 'USD');
const plural = (n: number, one: string, many: string) => `${n.toLocaleString()} ${n === 1 ? one : many}`;

function describe(cap: AvoidedCapability): string {
  if (!cap.priced) return 'No standalone Microsoft licence is priced for this capability, so it is not valued.';
  if (cap.standaloneAnnual === 0 && cap.ownedVia.length) return `Already licensed through ${cap.ownedVia.join(', ')}. Nothing extra to buy.`;
  const perUser = cap.users > 0 ? cap.standaloneAnnual / cap.users / 12 : 0;
  return `On its own: ${cap.standaloneLicenceNames.join(' + ')} · ${pupm(perUser)} / user / month`;
}

function CapabilityRow({ cap, lines }: { cap: AvoidedCapability; lines: AvoidedLicence[] }) {
  const s = useAssessment();
  const id = cap.category.id;
  const coveredBy = cap.coveredByLicenceId ? lines.find((l) => l.licence.id === cap.coveredByLicenceId) : undefined;
  const shared = coveredBy && coveredBy.capabilities.length > 1;
  return <div className={`study-line avoided-capability${cap.selected ? '' : ' is-off'}`}>
    <div className="avoided-licence-head">
      <Toggle checked={cap.selected} onChange={() => s.togglePlannedCapability(id)} label={cap.category.name} description={describe(cap)} />
      {cap.priced && <p className="avoided-licence-amount"><strong>{usd(cap.standaloneAnnual)}</strong><small>USD / year on its own</small></p>}
    </div>
    {cap.selected && cap.priced && <>
      <div className="avoided-capability-edit">
        <NumberField label="Users who will use it" suffix="users" max={5_000_000} value={cap.users}
          onChange={(v) => s.setCapabilityUsers(id, v)}
          hint={cap.usersOverridden ? 'Your entered number.' : `Default: all ${cap.defaultUsers.toLocaleString()} seats.`} />
        {cap.usersOverridden && <Button variant="ghost" size="sm" onClick={() => s.setCapabilityUsers(id, undefined)}>Restore all {cap.defaultUsers.toLocaleString()} seats</Button>}
      </div>
      {coveredBy && <p>{shared
        ? `Provided with ${coveredBy.capabilities.length - 1} other selected ${coveredBy.capabilities.length === 2 ? 'capability' : 'capabilities'} by ${coveredBy.licence.name}, so that licence is counted once below.`
        : `Provided by ${coveredBy.licence.name} in the licences below.`}</p>}
      {cap.cashOverlap.length > 0 && <Note tone="warning">Your {cap.cashOverlap.map((o) => o.vendor).join(', ')} spend for this capability is already a cash saving of {usd(cap.cashOverlap.reduce((a, o) => a + o.annualCredit, 0))} / year. It is still shown here as avoided licence cost, but never add the two together.</Note>}
    </>}
  </div>;
}

function LicenceLine({ line }: { line: AvoidedLicence }) {
  const s = useAssessment();
  const id = line.licence.id;
  const priceNote = line.unitPriceOverridden
    ? 'Your entered price.'
    : line.discountPct > 0
      ? `List ${pupm(line.listPricePupm)} less the ${line.discountPct}% E7 discount.`
      : `List ${pupm(line.listPricePupm)}.`;
  const provides = [
    line.capabilities.length ? `Provides ${line.capabilities.map((c) => c.name).join(', ')}.` : '',
    line.prerequisiteFor.length ? `Needed as a prerequisite for ${line.prerequisiteFor.map((l) => l.name).join(', ')}.` : '',
  ].filter(Boolean).join(' ');
  return <div className="study-line avoided-licence">
    <div className="avoided-licence-head">
      <div><strong>{line.licence.name}</strong><p className="detail-copy">{provides}</p></div>
      <p className="avoided-licence-amount"><strong>{usd(line.annual)}</strong><small>USD / year</small></p>
    </div>
    <p className="formula">{line.paidQuantity.toLocaleString()} users × {pupm(line.unitPupm)} × 12 = {usd(line.grossAnnual)}{line.supersededCredit > 0 ? ` − ${usd(line.supersededCredit)} replaced add-ons = ${usd(line.annual)}` : ''} / year</p>
    {line.ownership === 'full' && <p>Already licensed for these users through {line.ownedAddOnNames.join(', ')}. That spend is on the cash side, so nothing is avoided here.</p>}
    {line.ownership === 'partial' && <p>{line.ownedSeats.toLocaleString()} users are already licensed through {line.ownedAddOnNames.join(', ')}; only the other {line.paidQuantity.toLocaleString()} are counted.</p>}
    {line.supersededCredit > 0 && <p>This step-up would replace {line.supersededAddOnNames.join(', ')}, already credited in the cash comparison, so that spend is deducted here.</p>}
    {line.licence.prerequisite && <p>{line.licence.prerequisite}</p>}
    <details className="disclosure print-expand"><summary>Unit price and sources</summary>
      <div className="field-grid" style={{ margin: '14px 0' }}>
        <NumberField label="Unit price" prefix="USD" suffix="/ user / month" step={0.01} max={100_000} value={Number(line.unitPupm.toFixed(2))}
          onChange={(v) => s.setAvoidedLicencePrice(id, v)} hint={priceNote} />
      </div>
      {line.unitPriceOverridden && <div className="button-row"><Button variant="ghost" size="sm" onClick={() => s.setAvoidedLicencePrice(id, undefined)}>Restore default price ({pupm(line.defaultUnitPupm)})</Button></div>}
      <p className="detail-copy" style={{ marginTop: 12 }}>{line.licence.priceBasis} Editing the price can change which licences are cheapest.</p>
      <Evidence sourceIds={line.licence.sourceIds} title="Licence price sources" />
    </details>
  </div>;
}

export function CostAvoidancePanel({ result, currency }: { result: EngineResult; currency: string }) {
  const s = useAssessment();
  const c = result.costAvoidance;
  const baseline = getBaseline(s.baseline);
  const comparable = currency === 'USD';
  const pricedIds = c.capabilities.filter((cap) => cap.priced).map((cap) => cap.category.id);
  const selected = c.capabilities.filter((cap) => cap.selected && cap.priced);
  const sharingSaves = Math.max(0, c.standaloneSumAnnual - c.annualAvoided);
  const edited = Object.keys(s.costAvoidance.users).length + Object.keys(s.costAvoidance.unitPrices).length > 0;
  const groups = DOMAINS
    .map((domain) => ({ domain, caps: c.capabilities.filter((cap) => cap.category.domain === domain.id) }))
    .filter((g) => g.caps.length);
  const pricedOverrides = Object.keys(s.costAvoidance.unitPrices).filter((id) => !c.lines.some((l) => l.licence.id === id));

  return <section className="section-block cost-avoidance" aria-labelledby="licence-cost-avoidance">
    <h2 id="licence-cost-avoidance">Capability cost avoided with E7</h2>
    <p className="detail-copy" style={{ maxWidth: '74ch' }}>Choose the capabilities you plan to deploy. Each one comes with E7 but not with {baseline.name}, so without E7 you would have to license it separately from Microsoft. The cost of those licences is the cost you avoid. It is not an invoice you stop paying, so it is never added to net impact, TCO or payback. All amounts here are USD.</p>

    {selected.length > 0
      ? <dl className="outcome-details avoidance-summary">
        <div><dt>Cost avoided</dt><dd>{usd(c.annualAvoided)}</dd><small>USD / year for {plural(selected.length, 'selected capability', 'selected capabilities')}, licensed at the lowest cost</small></div>
        <div><dt>Each licensed on its own</dt><dd>{usd(c.standaloneSumAnnual)}</dd><small>{sharingSaves > 0 ? `USD / year. Shared licences cover several capabilities, which saves ${usd(sharingSaves)} of that.` : 'USD / year. No licence is shared between the selected capabilities.'}</small></div>
        {comparable
          ? <div><dt>Buy separately vs E7</dt><dd>{c.bundleDifferenceAnnual === 0 ? 'No difference' : `E7 ${usd(Math.abs(c.bundleDifferenceAnnual))} ${c.bundleDifferenceAnnual > 0 ? 'lower' : 'higher'}`}</dd><small>USD / year: your current licences plus these, against E7, before any third-party retirement.</small></div>
          : <div><dt>Buy separately vs E7</dt><dd>Withheld</dd><small>Your assessment is {currency}; licence references are USD and no FX conversion is applied.</small></div>}
      </dl>
      : <Note>No capabilities selected yet. Select the ones you plan to deploy to see what licensing them separately would cost.</Note>}

    <div className="avoidance-heading">
      <h3>Capabilities E7 adds to {baseline.shortName}</h3>
      <div className="button-row">
        {selected.length < pricedIds.length && <Button variant="ghost" size="sm" onClick={() => s.setPlannedCapabilities([...new Set([...s.plannedCapabilities, ...pricedIds])])}>Select all {pricedIds.length}</Button>}
        {s.plannedCapabilities.length > 0 && <Button variant="ghost" size="sm" onClick={() => s.setPlannedCapabilities([])}>Clear selection</Button>}
        {edited && <Button variant="ghost" size="sm" onClick={s.resetCostAvoidance}>Restore default users and prices</Button>}
      </div>
    </div>
    <p className="detail-copy">The amount beside each is the cheapest way to license that capability alone. Microsoft add-ons you already buy are not counted again.</p>
    {groups.map(({ domain, caps }) => <div className="capability-group" key={domain.id}>
      <h4>{domain.name}</h4>
      {caps.map((cap) => <CapabilityRow key={cap.category.id} cap={cap} lines={c.lines} />)}
    </div>)}
    {!groups.length && <p className="note" style={{ marginTop: 14 }}>No capability gap remains between {baseline.name} and E7 in this scenario.</p>}

    {c.lines.length > 0 && <>
      <h3 className="avoidance-subhead">Licences you would otherwise buy</h3>
      <p className="detail-copy">The lowest-cost set of Microsoft licences that provides every selected capability. A licence that covers several capabilities is counted once, for the largest number of users that need it.</p>
      <div style={{ marginTop: 14 }}>{c.lines.map((line) => <LicenceLine key={line.licence.id} line={line} />)}</div>
      {pricedOverrides.length > 0 && <div className="note" style={{ marginTop: 12 }}>
        <p>Your entered {pricedOverrides.length === 1 ? 'price is' : 'prices are'} kept, but {pricedOverrides.length === 1 ? 'that licence is' : 'those licences are'} not in the cheapest set:</p>
        <div className="button-row">{pricedOverrides.map((id) => <Button key={id} variant="ghost" size="sm" onClick={() => s.setAvoidedLicencePrice(id, undefined)}>
          Use default price for {getStandaloneLicence(id)?.name ?? id}
        </Button>)}</div>
      </div>}
    </>}

    {comparable && selected.length > 0 && <div className="table-scroll" style={{ marginTop: 22 }}><table><caption>Licence spend for the selected capabilities, bought separately, versus E7. USD per year. Third-party retirement is not included.</caption>
      <thead><tr><th scope="col">Licence spend</th><th scope="col" className="numeric">Per user / month</th><th scope="col" className="numeric">Per year</th></tr></thead>
      <tbody>
        <tr><th scope="row">Current suite and the Microsoft add-ons E7 absorbs<small>{baseline.name}</small></th><td className="numeric">{pupm(result.seats > 0 ? c.currentLicenceAnnual / result.seats / 12 : 0)}</td><td className="numeric">{usd(c.currentLicenceAnnual)}</td></tr>
        <tr><th scope="row">Plus licences for the selected capabilities<small>{c.lines.map((l) => l.licence.name).join(', ')}</small></th><td className="numeric">{pupm(result.seats > 0 ? c.annualAvoided / result.seats / 12 : 0)}</td><td className="numeric">{usd(c.annualAvoided)}</td></tr>
        <tr><th scope="row">Buy separately</th><td className="numeric"><strong>{pupm(c.buySeparatelyPupm)}</strong></td><td className="numeric"><strong>{usd(c.buySeparatelyAnnual)}</strong></td></tr>
        <tr><th scope="row">Microsoft 365 E7<small>Includes every capability above, selected or not</small></th><td className="numeric"><strong>{pupm(c.e7NetPupm)}</strong></td><td className="numeric"><strong>{usd(c.e7Annual)}</strong></td></tr>
        <tr><th scope="row">{c.bundleDifferenceAnnual >= 0 ? 'E7 costs less by' : 'E7 costs more by'}</th><td className="numeric">{pupm(Math.abs(c.bundleDifferencePupm))}</td><td className="numeric">{usd(Math.abs(c.bundleDifferenceAnnual))}</td></tr>
      </tbody></table></div>}

    {c.unpriced.length > 0 && <p className="note" style={{ marginTop: 18 }}>Not valued: {c.unpriced.map((cat) => cat.name).join(', ')}. No standalone Microsoft licence in the catalog provides {c.unpriced.length === 1 ? 'this capability' : 'these capabilities'} on {baseline.shortName}, so {c.unpriced.length === 1 ? 'it adds' : 'they add'} nothing here.</p>}

    {selected.length > 0 && <details className="disclosure print-expand"><summary>Third-party context · illustrative</summary><div className="detail-copy">
      <p>Buying comparable third-party tools for the selected capabilities would cost roughly <strong>{usd(c.thirdPartyReferenceAnnual)} / year</strong> on illustrative category benchmarks and typical adoption. This is context only: it is not added to the licence figure or to cash savings.</p>
      {selected.map((cap) => <details className="disclosure" key={cap.category.id}><summary>{cap.category.name}</summary><BenchmarkContext category={cap.category} seats={cap.users} /></details>)}
    </div></details>}

    <p className="formula">Cost avoided = lowest-cost set of licences for the selected capabilities, Σ (users × unit price × 12 − replaced add-ons) = <strong>{usd(c.annualAvoided)} USD / year</strong> · kept separate from the {currency} cash comparison.</p>
  </section>;
}
