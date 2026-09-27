import { useMemo, useState } from 'react';
import { ArrowUpRight, Bot, ChartNoAxesCombined, ChevronDown, Fingerprint, KeyRound, LaptopMinimal, MessagesSquare, Search, ShieldCheck } from 'lucide-react';
import { CATEGORIES, DOMAINS, type Category, type Coverage, type DomainId } from '@/data/categories';
import { describeCapability, filterCapabilities, isCapabilityCoverage, isCapabilityDomain, LAB_COVERAGE_LABELS } from '@/data/experience/capabilities';
import type { MissionId } from '@/data/experience/types';

const DOMAIN_ICONS = { ai: Bot, identity: KeyRound, endpoint: LaptopMinimal, threat: ShieldCheck, data: Fingerprint, comms: MessagesSquare, analytics: ChartNoAxesCombined };
const COVERAGE_OPTIONS: readonly Coverage[] = ['already', 'unlocked', 'upgrade', 'not-covered'];

function CapabilityDetail({ category, onMission }: { category: Category; onMission: (id: MissionId) => void }) {
  const detail = describeCapability(category);
  const Icon = DOMAIN_ICONS[category.domain];
  return <details className="lab-capability">
    <summary><Icon aria-hidden="true" /><span>{category.name}</span><span>{LAB_COVERAGE_LABELS[detail.coverage]}</span><ChevronDown aria-hidden="true" /></summary>
    <div className="lab-capability-body">
      <p>{category.whatItIs}</p>
      <dl><dt>With O365 E3</dt><dd>{detail.baseline}</dd>
        <dt>E7 offering</dt><dd>{category.e7Component}</dd>
        <dt>Keep in mind</dt><dd>{category.caveat ?? detail.conditions[0] ?? 'Check the actual licence, configured workload, permissions and service limits before relying on this capability.'}</dd>
      </dl>
      {detail.conditions.length > 0 && <details className="lab-source-links"><summary>Scope and prerequisites to review</summary><ul>{detail.conditions.map(condition => <li key={condition}>{condition}</li>)}</ul></details>}
      <div className="lab-button-row">
        {detail.missions.map(mission => <button key={mission.id} type="button" className="lab-button" onClick={() => onMission(mission.id)}>Try it in {mission.room.toLocaleLowerCase()}<ArrowUpRight aria-hidden="true" /></button>)}
        <a href="#audit">Sources and applicability</a>
      </div>
    </div>
  </details>;
}

export function CapabilityIndex({ onMission, initialCoverage = 'all' }: { onMission: (id: MissionId) => void; initialCoverage?: Coverage | 'all' }) {
  const [query, setQuery] = useState('');
  const [domain, setDomain] = useState<DomainId | 'all'>('all');
  const [coverage, setCoverage] = useState<Coverage | 'all'>(initialCoverage);
  const results = useMemo(() => filterCapabilities(query, domain, coverage), [query, domain, coverage]);
  return <section aria-label="Capability index">
    <p>Every category in this app, including the things E7 does not replace. This is an O365 E3 comparison, not an exhaustive Microsoft licensing guide.</p>
    <div className="lab-catalog-tools">
      <label htmlFor="lab-capability-search">Find a capability<input id="lab-capability-search" type="search" value={query} placeholder="Try Copilot, access, backup..." onChange={event => setQuery(event.target.value)} /></label>
      <label htmlFor="lab-domain">Capability area<select id="lab-domain" value={domain} onChange={event => { if (isCapabilityDomain(event.target.value)) setDomain(event.target.value); }}>
        <option value="all">All areas</option>{DOMAINS.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select></label>
      <label htmlFor="lab-coverage">What changes?<select id="lab-coverage" value={coverage} onChange={event => { if (isCapabilityCoverage(event.target.value)) setCoverage(event.target.value); }}>
        <option value="all">Every offering</option>{COVERAGE_OPTIONS.map(item => <option key={item} value={item}>{LAB_COVERAGE_LABELS[item]}</option>)}
      </select></label>
    </div>
    <p className="lab-catalog-count" role="status">{results.length} of {CATEGORIES.length} categories shown. The existing assessment's inputs are unchanged.</p>
    {results.length ? <div className="lab-capability-list">{results.map(category => <CapabilityDetail key={category.id} category={category} onMission={onMission} />)}</div>
      : <div className="lab-empty"><Search aria-hidden="true" /><h2>No matching capabilities</h2><p>Try a product name or clear the filters to explore every area.</p><button type="button" className="lab-button" onClick={() => { setQuery(''); setDomain('all'); setCoverage('all'); }}>Clear search and filters</button></div>}
  </section>;
}
