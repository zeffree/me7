import { useId, useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { MS_ADD_ONS, type MsAddOn } from '@/data/msAddOns';
import { useAssessment, toAssessment } from '@/store/useAssessment';
import { computeAssessment } from '@/model/engine';
import { formatCurrency } from '@/lib/format';
import { Badge, Button, Note, SectionHeading } from '@/components/ui/Primitives';
import { TextField, Toggle } from '@/components/ui/Fields';
import { StepFooter } from '@/components/layout/AppShell';
import { SpendEditor, hasAmount, lineAnnual } from '@/components/catalog/SpendEditor';
import { isKnownAddOn } from '@/components/catalog/inventory';

function AddOnRow({ item }: { item: MsAddOn }) {
  const s = useAssessment();
  const [open, setOpen] = useState(false);
  const id = useId();
  const line = s.addOns.find(l => l.addOnId === item.id);
  const scored = computeAssessment(toAssessment(s)).scoredAddOns.find(l => l.addOnId === item.id);
  const outsideBaseline = !item.relevantFor.includes(s.baseline);
  return <article className="inventory-row">
    <button className="inventory-heading" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls={id}>
      <span><strong>{item.name}</strong><small>{outsideBaseline && line ? 'Entered invoice · outside usual baseline suggestions' : item.absorbedByE7 ? 'Potential E7 overlap — review cancellation' : 'Separate spend remains'}</small></span>
      <span className="inventory-amount"><strong>{line && hasAmount(line) ? formatCurrency(lineAnnual(line, s.seats), s.currency) : '—'}</strong><Badge tone={scored?.eligible ? 'brand' : 'neutral'}>{line ? hasAmount(line) ? !item.absorbedByE7 ? 'Retained' : scored?.eligible ? 'Full replacement' : 'Resolve entry' : 'Amount unknown' : 'Not entered'}</Badge></span><ChevronDown aria-hidden="true" />
    </button>
    {open && <div id={id} className="inventory-body"><p>{item.description}</p>
      {line ? <>
        <SpendEditor label={item.name} line={line} onChange={s.upsertAddOn} canRetire={item.absorbedByE7} />
        <Note>{formatCurrency(scored?.annualCredit ?? 0, s.currency)} / year modeled retirement credit. {scored?.eligible ? 'The full invoice is replaced in this scenario.' : scored?.exclusionReason || 'This spend stays in future cost.'}</Note>
        <div style={{ marginTop: 18 }}><Button variant="danger" size="sm" onClick={() => {
          if (!hasAmount(line) || window.confirm('Remove this Microsoft add-on invoice?')) s.removeAddOn(item.id);
        }}>Remove entry</Button></div>
      </> : <div style={{ margin: '20px 0' }}><Button variant="secondary" onClick={() => s.upsertAddOn({ addOnId: item.id, mode: 'annual', amountSource: 'customer', assumptionConfirmed: false, retainPct: 0 })}><Plus />Add invoice</Button></div>}
    </div>}
  </article>;
}

export function AddOnsStep() {
  const s = useAssessment();
  const [search, setSearch] = useState('');
  const [all, setAll] = useState(false);
  const [enteredOnly, setEnteredOnly] = useState(false);
  const entered = new Set(s.addOns.map(l => l.addOnId));
  const unmappedCount = s.addOns.filter(line => !isKnownAddOn(line.addOnId)).length;
  const shown = MS_ADD_ONS.filter(item => (all || item.relevantFor.includes(s.baseline) || entered.has(item.id))
    && (!enteredOnly || entered.has(item.id)) && `${item.name} ${item.description}`.toLowerCase().includes(search.toLowerCase()));
  const overlaps = s.addOns.filter(l => {
    const meta = MS_ADD_ONS.find(x => x.id === l.addOnId);
    return meta?.supersededBy && entered.has(meta.supersededBy);
  });
  return <>
    <SectionHeading title="Don’t leave add-ons out." description="Microsoft licences purchased on top of your baseline belong in current cost too. Enter genuine invoices once; suite overlap does not automatically cancel them." />
    {unmappedCount > 0 && <div style={{ marginBottom: 20 }}><Note tone="warning">{unmappedCount} recovered Microsoft add-on identifiers are outside this catalog. They remain counted at full retained cost. <Button variant="ghost" size="sm" onClick={() => s.setStep('assumptions')}>Review recovered invoices</Button></Note></div>}
    {overlaps.length > 0 && <div style={{ marginBottom: 20 }}><Note tone="warning"><strong>Possible bundle overlap.</strong> {overlaps.map(l => MS_ADD_ONS.find(a => a.id === l.addOnId)?.name).join(', ')} and a related suite are both entered. Remove the duplicate bundle or component allocation before their retirement savings can be counted.</Note></div>}
    <div className="inventory-toolbar"><TextField label="Find a Microsoft add-on" value={search} onChange={setSearch} placeholder="Search licences or services" />
      <div className="filter-row"><button aria-pressed={!enteredOnly} onClick={() => setEnteredOnly(false)}>All suggestions</button><button aria-pressed={enteredOnly} onClick={() => setEnteredOnly(true)}>Entered · {s.addOns.length}</button><button aria-pressed={all} onClick={() => setAll(!all)}>Include other baselines</button></div>
    </div>
    <div className="inventory-count"><span>{shown.length} add-ons shown</span><span>All entered invoices remain in the model</span></div>
    <div className="inventory">{shown.map(item => <AddOnRow item={item} key={item.id} />)}</div>
    {shown.length === 0 && <p className="note">No matching add-ons. Clear the search or choose All suggestions.</p>}
    <div className="section-block"><Toggle checked={s.addOnsReviewed === true} onChange={s.setAddOnsReviewed} label="I have reviewed my Microsoft add-on invoices" description="This includes any entered items outside the suggested baseline. Leave unchecked if this inventory is still incomplete." /></div>
    <StepFooter nextLabel="Review the comparison" />
  </>;
}
