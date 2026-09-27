import { useCallback, useRef, useState } from 'react';
import { CATEGORIES, DOMAINS } from '@/data/categories';
import { LayoutGrid } from 'lucide-react';
import { useAssessment } from '@/store/useAssessment';
import { CategoryCard } from '@/components/catalog/CategoryCard';
import { Button, Note, SectionHeading, EmptyState } from '@/components/ui/Primitives';
import { Segmented, TextField } from '@/components/ui/Fields';
import { StepFooter } from '@/components/layout/AppShell';
import { answeredCategoryCount, isKnownCategory } from '@/components/catalog/inventory';
import { hasAmount } from '@/components/catalog/SpendEditor';
import { DOMAIN_LABELS, DomainSymbol } from '@/components/ui/DomainSymbol';
import { InventoryProgress } from '@/components/catalog/InventoryProgress';

type Filter = 'all' | 'entered' | 'unreviewed' | 'excluded' | 'uncertain';
export function CatalogStep() {
  const s = useAssessment();
  const [search, setSearch] = useState('');
  const searchField = useRef<HTMLDivElement>(null);
  const [domain, setDomain] = useState('all');
  const [filter, setFilter] = useState<Filter>('all');
  const [focusRequest, setFocusRequest] = useState({ categoryId: '', sequence: 0 });
  const focusHandled = useCallback(() => setFocusRequest(previous => ({ ...previous, sequence: 0 })), []);
  const mode = s.step === 'catalog' ? 'full' : 'quick';
  const matches = CATEGORIES.filter(c => {
    const line = s.lines.find(l => l.categoryId === c.id);
    const excluded = s.dismissed.includes(c.id);
    const queried = [c.name, c.e7Component, ...c.examples].join(' ').toLowerCase().includes(search.toLowerCase());
    const filtered = filter === 'all' || (filter === 'entered' && !!line) || (filter === 'unreviewed' && !line && !excluded)
      || (filter === 'excluded' && (excluded || (!!line && c.coverage[s.baseline] === 'not-covered'))) || (filter === 'uncertain' && !!line && !hasAmount(line));
    // Searches and status filters range over the entire inventory, never hide an entered invoice.
    return queried && filtered && (domain === 'all' || c.domain === domain) && (mode === 'full' || c.quickAssess || !!line || excluded || search !== '' || filter !== 'all');
  });
  const answered = answeredCategoryCount(s.lines, s.dismissed);
  const missing = s.lines.filter(line => isKnownCategory(line.categoryId) && !hasAmount(line)).length;
  const unreviewed = matches.filter(category => !s.lines.some(line => line.categoryId === category.id) && !s.dismissed.includes(category.id));
  const currentUnreviewedIndex = unreviewed.findIndex(category => category.id === focusRequest.categoryId);
  const nextUnreviewed = unreviewed.length ? unreviewed[(currentUnreviewedIndex + 1) % unreviewed.length] : undefined;
  const unmappedCount = s.lines.filter(line => !isKnownCategory(line.categoryId)).length;
  return <>
    <SectionHeading title="Let’s map your tool stack." description="Pick an area, find a familiar tool, and add what you know. Quick scan and the full catalog share the same answers." />
    <InventoryProgress answered={answered} total={CATEGORIES.length} missing={missing} hasNext={!!nextUnreviewed} onNext={() => {
      if (nextUnreviewed) setFocusRequest(previous => ({ categoryId: nextUnreviewed.id, sequence: previous.sequence + 1 }));
    }} />
    {unmappedCount > 0 && <div style={{ marginBottom: 20 }}><Note tone="warning">{unmappedCount} recovered invoice identifiers are outside this catalog. Their amounts remain fully retained. <Button variant="ghost" size="sm" onClick={() => s.setStep('assumptions')}>Review recovered invoices</Button></Note></div>}
    <div className="inventory-toolbar">
      <Segmented ariaLabel="Catalog view" value={mode} onChange={v => s.setStep(v === 'quick' ? 'quick' : 'catalog')} options={[{ value: 'quick', label: 'Quick scan' }, { value: 'full', label: `Full catalog · ${CATEGORIES.length}` }]} />
      <div ref={searchField} className="inventory-search inventory-search-wide"><TextField label="Search inventory" value={search} onChange={setSearch} placeholder="Try a product you know, like Okta or Zoom" /></div>
      <div className="domain-chooser" role="group" aria-label="Spend areas">
        <button onClick={() => setDomain('all')} aria-pressed={domain === 'all'}><span className="domain-symbol" aria-hidden="true"><LayoutGrid /></span><span>All areas</span><small>{answered}/{CATEGORIES.length}</small></button>
        {DOMAINS.map(area => {
          const ids = new Set(CATEGORIES.filter(category => category.domain === area.id).map(category => category.id));
          const count = answeredCategoryCount(s.lines.filter(line => ids.has(line.categoryId)), s.dismissed.filter(id => ids.has(id)));
          return <button key={area.id} onClick={() => setDomain(area.id)} aria-pressed={domain === area.id} aria-label={`${area.name}: ${count} of ${ids.size} categories answered`}><DomainSymbol domain={area.id} /><span>{DOMAIN_LABELS[area.id]}</span><small>{count}/{ids.size}</small></button>;
        })}
      </div>
      <div className="filter-row" role="group" aria-label="Inventory status filter">{(['all', 'entered', 'unreviewed', 'excluded', 'uncertain'] as const).map(f => <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>{({ all: 'All items', entered: 'Entered', unreviewed: 'Unreviewed', excluded: 'Excluded / no purchase', uncertain: 'Missing amount' })[f]}</button>)}</div>
    </div>
    <div className="inventory-count"><span>{matches.length} categories shown</span><span>{answered} answered · {CATEGORIES.length - answered} unreviewed</span></div>
    <div className="inventory">{matches.map(category => <CategoryCard key={category.id} category={category} focusRequest={focusRequest.categoryId === category.id ? focusRequest.sequence : 0} onFocusHandled={focusHandled} />)}</div>
    {matches.length === 0 && <EmptyState title="Nothing here just yet.">Try another area or clear the filters. Your other entries are unchanged.<br /><Button variant="secondary" size="sm" onClick={() => { setSearch(''); setDomain('all'); setFilter('all'); searchField.current?.querySelector('input')?.focus(); }}>Clear filters</Button></EmptyState>}
    <p className="muted" style={{ marginTop: 20, fontSize: '.78rem' }}>No purchase does not mean planned adoption. Unreviewed categories stay unknown and never become savings.</p>
    <StepFooter nextLabel="Review Microsoft add-ons" onNext={() => s.setStep('addons')} />
  </>;
}
