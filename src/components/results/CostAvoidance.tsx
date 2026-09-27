import { useId } from 'react';
import { Check, Sparkles } from 'lucide-react';
import type { AvoidedCapability, AvoidedLicence, EngineResult } from '@/model/types';
import { useAssessment } from '@/store/useAssessment';
import { DOMAINS } from '@/data/categories';
import { getBaseline } from '@/data/skus';
import { getStandaloneLicence } from '@/data/standaloneLicences';
import { formatCurrency, formatPupm } from '@/lib/format';
import { NumberField } from '@/components/ui/Fields';
import { Button, Note } from '@/components/ui/Primitives';
import { Evidence } from '@/components/ui/Evidence';
import { DomainSymbol } from '@/components/ui/DomainSymbol';
import { BenchmarkContext } from '@/components/catalog/BenchmarkContext';
import { CountUp } from './CountUp';

const usd = (value: number) => formatCurrency(value, 'USD');
const pupm = (value: number) => formatPupm(value, 'USD');
const plural = (n: number, one: string, many: string) => `${n.toLocaleString()} ${n === 1 ? one : many}`;

const ZERO = 0.005;

function describe(cap: AvoidedCapability): string {
  if (!cap.priced) return 'No standalone Microsoft licence is priced for this capability, so it is not valued.';
  if (cap.standaloneAnnual === 0 && cap.ownedVia.length) return `Already licensed through ${cap.ownedVia.join(', ')}. Nothing extra to buy.`;
  const perUser = cap.users > 0 ? cap.standaloneAnnual / cap.users / 12 : 0;
  const alone = `On its own: ${cap.standaloneLicenceNames.join(' + ')} · ${pupm(perUser)} / user / month`;
  if (cap.includedWith?.countedOn) return `Provided by ${cap.includedWith.licenceName}, already counted with ${cap.includedWith.countedOn.name}, so it is not counted again.`;
  if (!cap.selected && cap.includedWith) {
    return cap.marginalAnnual <= ZERO
      ? `Provided by ${cap.includedWith.licenceName}, which your selection already counts. Selecting it adds nothing.`
      : `Provided by ${cap.includedWith.licenceName}, already counted; selecting it only adds users. ${alone}`;
  }
  return alone;
}

function Amount({ cap, anySelected }: { cap: AvoidedCapability; anySelected: boolean }) {
  if (!cap.priced) return <span className="cap-amount"><strong>Not valued</strong></span>;
  const [value, label] = cap.selected
    ? cap.includedWith?.countedOn
      ? ['Included', `in ${cap.includedWith.licenceName}`]
      : [usd(cap.countedAnnual), 'USD / year counted']
    : !anySelected
      ? [usd(cap.standaloneAnnual), 'USD / year on its own']
      : cap.includedWith && cap.marginalAnnual <= ZERO
        ? ['Included', `in ${cap.includedWith.licenceName}`]
        : [usd(cap.marginalAnnual), 'USD / year to add'];
  return <span className="cap-amount"><strong>{value}</strong><small>{label}</small></span>;
}

function CapabilityTile({ cap, anySelected }: { cap: AvoidedCapability; anySelected: boolean }) {
  const s = useAssessment();
  const noteId = `cap-note-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return <label className={`cap-tile${cap.selected ? ' is-on' : ''}${cap.priced ? '' : ' is-unpriced'}`} data-domain={cap.category.domain}>
    <input type="checkbox" className="sr-only" checked={cap.selected} aria-label={cap.category.name} aria-describedby={noteId} onChange={() => s.togglePlannedCapability(cap.category.id)} />
    <span className="cap-tile-top"><strong className="cap-name">{cap.category.name}</strong><span className="cap-tick" aria-hidden="true"><Check /></span></span>
    <Amount cap={cap} anySelected={anySelected} />
    <small className="cap-note" id={noteId}>{describe(cap)}</small>
    {cap.selected && cap.cashOverlap.length > 0 && <span className="badge badge-warning">Also a cash saving · never add the two</span>}
  </label>;
}

function CapabilityUsers({ cap, lines }: { cap: AvoidedCapability; lines: AvoidedLicence[] }) {
  const s = useAssessment();
  const id = cap.category.id;
  const coveredBy = cap.coveredByLicenceId ? lines.find((l) => l.licence.id === cap.coveredByLicenceId) : undefined;
  const carries = coveredBy && !cap.includedWith && coveredBy.capabilities.length > 1;
  return <div className="study-line avoided-capability" data-domain={cap.category.domain}>
    <div className="avoided-licence-head">
      <div className="cap-user-title"><DomainSymbol domain={cap.category.domain} /><strong>{cap.category.name}</strong></div>
      <p className="avoided-licence-amount"><strong>{cap.includedWith?.countedOn ? 'Included' : usd(cap.countedAnnual)}</strong><small>{cap.includedWith?.countedOn ? `in ${cap.includedWith.licenceName}` : 'USD / year counted'}</small></p>
    </div>
    <div className="avoided-capability-edit">
      <NumberField label="Users who will use it" suffix="users" max={5_000_000} value={cap.users}
        onChange={(v) => s.setCapabilityUsers(id, v)}
        hint={cap.usersOverridden ? 'Your entered number.' : `Default: all ${cap.defaultUsers.toLocaleString()} seats.`} />
      {cap.usersOverridden && <Button variant="ghost" size="sm" onClick={() => s.setCapabilityUsers(id, undefined)}>Restore all {cap.defaultUsers.toLocaleString()} seats</Button>}
    </div>
    {carries && <p>Carries the cost of {coveredBy.licence.name}, which also provides {plural(coveredBy.capabilities.length - 1, 'other selected capability', 'other selected capabilities')}. The licence is counted once.</p>}
    {cap.cashOverlap.length > 0 && <Note tone="warning">Your {cap.cashOverlap.map((o) => o.vendor).join(', ')} spend for this capability is already a cash saving of {usd(cap.cashOverlap.reduce((a, o) => a + o.annualCredit, 0))} / year. It is still shown here as avoided licence cost, but never add the two together.</Note>}
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

function BundleBars({ separately, e7 }: { separately: number; e7: number }) {
  const scale = Math.max(1, separately, e7);
  return <div className="lens-bars">
    {[{ key: 'separately', label: 'Buy separately', amount: separately }, { key: 'e7', label: 'Microsoft 365 E7', amount: e7 }].map(row => <div key={row.key} className={`lens-bar-row bar-${row.key}`}>
      <div><span>{row.label}</span><strong>{usd(row.amount)}</strong></div>
      <span className="lens-bar-track" aria-hidden="true"><span style={{ width: `${row.amount / scale * 100}%` }} /></span>
    </div>)}
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
  const includedCount = selected.filter((cap) => cap.includedWith?.countedOn).length;
  const edited = Object.keys(s.costAvoidance.users).length + Object.keys(s.costAvoidance.unitPrices).length > 0;
  const groups = DOMAINS
    .map((domain) => ({ domain, caps: c.capabilities.filter((cap) => cap.category.domain === domain.id) }))
    .filter((g) => g.caps.length);
  const pricedOverrides = Object.keys(s.costAvoidance.unitPrices).filter((id) => !c.lines.some((l) => l.licence.id === id));

  return <section className="section-block cost-avoidance" aria-labelledby="licence-cost-avoidance">
    <div className="lens-card">
      <div className="lens-copy">
        <span className="lens-badge"><Sparkles aria-hidden="true" />Separate lens · not cash savings</span>
        <h2 id="licence-cost-avoidance">Capability cost avoided with E7</h2>
        <p>Pick the capabilities you plan to deploy. {baseline.shortName} does not include them, so without E7 you would license them separately from Microsoft. That cost is what you avoid. It is never added to net impact, TCO or payback. All amounts here are USD.</p>
      </div>
      <div className="lens-total">
        {selected.length > 0 ? <>
          <p className="lens-amount"><CountUp value={c.annualAvoided} format={usd} /><small> USD / year avoided</small></p>
          <p className="lens-sub">{plural(selected.length, 'capability', 'capabilities')} · {plural(c.lines.length, 'licence', 'licences')} counted once{sharingSaves > ZERO ? ` · ${usd(sharingSaves)} of double counting kept out${includedCount ? ` (${includedCount.toLocaleString()} already included)` : ''}` : ''}</p>
          {comparable
            ? <><BundleBars separately={c.buySeparatelyAnnual} e7={c.e7Annual} /><p className="lens-sub">{c.bundleDifferenceAnnual === 0 ? 'No difference' : `E7 ${usd(Math.abs(c.bundleDifferenceAnnual))} ${c.bundleDifferenceAnnual > 0 ? 'lower' : 'higher'}`} per year: your current licences plus these, against E7, before any third-party retirement.</p></>
            : <p className="lens-sub">Buy separately vs E7 withheld: your assessment is {currency}; licence references are USD and no FX conversion is applied.</p>}
        </> : <p className="lens-empty">Nothing selected yet. Tap the capabilities you plan to deploy to see what licensing them separately would cost.</p>}
      </div>
    </div>

    <div className="avoidance-heading">
      <h3>Capabilities E7 adds to {baseline.shortName} <small>{selected.length} of {pricedIds.length} selected</small></h3>
      <div className="button-row">
        {selected.length < pricedIds.length && <Button variant="ghost" size="sm" onClick={() => s.setPlannedCapabilities([...new Set([...s.plannedCapabilities, ...pricedIds])])}>Select all {pricedIds.length}</Button>}
        {s.plannedCapabilities.length > 0 && <Button variant="ghost" size="sm" onClick={() => s.setPlannedCapabilities([])}>Clear selection</Button>}
        {edited && <Button variant="ghost" size="sm" onClick={s.resetCostAvoidance}>Restore default users and prices</Button>}
      </div>
    </div>
    <p className="detail-copy">{selected.length
      ? 'Selected tiles show their share, with each licence counted once. Others show what selecting them would add.'
      : 'Each tile shows the cheapest way to license that capability alone.'} Microsoft add-ons you already buy are not counted again.</p>
    {groups.map(({ domain, caps }) => <fieldset className="capability-group" key={domain.id} data-domain={domain.id}>
      <legend><DomainSymbol domain={domain.id} />{domain.name}<small>{caps.filter((cap) => cap.selected).length} of {caps.length} selected</small></legend>
      <div className="cap-grid">{caps.map((cap) => <CapabilityTile key={cap.category.id} cap={cap} anySelected={selected.length > 0} />)}</div>
    </fieldset>)}
    {!groups.length && <p className="note" style={{ marginTop: 14 }}>No capability gap remains between {baseline.name} and E7 in this scenario.</p>}

    {selected.length > 0 && <details className="disclosure print-expand"><summary>Adjust users · {plural(selected.length, 'selected capability', 'selected capabilities')}</summary>
      {selected.map((cap) => <CapabilityUsers key={cap.category.id} cap={cap} lines={c.lines} />)}
    </details>}

    {c.lines.length > 0 && <details className="disclosure print-expand"><summary>Licences you would otherwise buy · {c.lines.length}</summary>
      <p className="detail-copy">The lowest-cost set of Microsoft licences that provides every selected capability. A licence that covers several capabilities is counted once, for the largest number of users that need it.</p>
      <div style={{ marginTop: 14 }}>{c.lines.map((line) => <LicenceLine key={line.licence.id} line={line} />)}</div>
      {pricedOverrides.length > 0 && <div className="note" style={{ marginTop: 12 }}>
        <p>Your entered {pricedOverrides.length === 1 ? 'price is' : 'prices are'} kept, but {pricedOverrides.length === 1 ? 'that licence is' : 'those licences are'} not in the cheapest set:</p>
        <div className="button-row">{pricedOverrides.map((id) => <Button key={id} variant="ghost" size="sm" onClick={() => s.setAvoidedLicencePrice(id, undefined)}>
          Use default price for {getStandaloneLicence(id)?.name ?? id}
        </Button>)}</div>
      </div>}
    </details>}

    {comparable && selected.length > 0 && <details className="disclosure print-expand"><summary>Buy separately versus E7 · per user and per year</summary><div className="table-scroll"><table><caption>Licence spend for the selected capabilities, bought separately, versus E7. USD per year. Third-party retirement is not included.</caption>
      <thead><tr><th scope="col">Licence spend</th><th scope="col" className="numeric">Per user / month</th><th scope="col" className="numeric">Per year</th></tr></thead>
      <tbody>
        <tr><th scope="row">Current suite and the Microsoft add-ons E7 absorbs<small>{baseline.name}</small></th><td className="numeric">{pupm(result.seats > 0 ? c.currentLicenceAnnual / result.seats / 12 : 0)}</td><td className="numeric">{usd(c.currentLicenceAnnual)}</td></tr>
        <tr><th scope="row">Plus licences for the selected capabilities<small>{c.lines.map((l) => l.licence.name).join(', ')}</small></th><td className="numeric">{pupm(result.seats > 0 ? c.annualAvoided / result.seats / 12 : 0)}</td><td className="numeric">{usd(c.annualAvoided)}</td></tr>
        <tr><th scope="row">Buy separately</th><td className="numeric"><strong>{pupm(c.buySeparatelyPupm)}</strong></td><td className="numeric"><strong>{usd(c.buySeparatelyAnnual)}</strong></td></tr>
        <tr><th scope="row">Microsoft 365 E7<small>Includes every capability above, selected or not</small></th><td className="numeric"><strong>{pupm(c.e7NetPupm)}</strong></td><td className="numeric"><strong>{usd(c.e7Annual)}</strong></td></tr>
        <tr><th scope="row">{c.bundleDifferenceAnnual >= 0 ? 'E7 costs less by' : 'E7 costs more by'}</th><td className="numeric">{pupm(Math.abs(c.bundleDifferencePupm))}</td><td className="numeric">{usd(Math.abs(c.bundleDifferenceAnnual))}</td></tr>
      </tbody></table></div></details>}

    {c.unpriced.length > 0 && <p className="note" style={{ marginTop: 18 }}>Not valued: {c.unpriced.map((cat) => cat.name).join(', ')}. No standalone Microsoft licence in the catalog provides {c.unpriced.length === 1 ? 'this capability' : 'these capabilities'} on {baseline.shortName}, so {c.unpriced.length === 1 ? 'it adds' : 'they add'} nothing here.</p>}

    {selected.length > 0 && <details className="disclosure print-expand"><summary>Third-party context · illustrative</summary><div className="detail-copy">
      <p>Buying comparable third-party tools for the selected capabilities would cost roughly <strong>{usd(c.thirdPartyReferenceAnnual)} / year</strong> on illustrative category benchmarks and typical adoption. This is context only: it is not added to the licence figure or to cash savings.</p>
      {selected.map((cap) => <details className="disclosure" key={cap.category.id}><summary>{cap.category.name}</summary><BenchmarkContext category={cap.category} seats={cap.users} /></details>)}
    </div></details>}

    <p className="formula">Cost avoided = lowest-cost set of licences for the selected capabilities, Σ (users × unit price × 12 − replaced add-ons) = <strong>{usd(c.annualAvoided)} USD / year</strong> · kept separate from the {currency} cash comparison.</p>
  </section>;
}
