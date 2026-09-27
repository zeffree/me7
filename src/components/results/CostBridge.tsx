import type { CSSProperties } from 'react';
import { Layers3, Receipt, ReceiptText } from 'lucide-react';
import type { DomainId } from '@/data/categories';
import type { EngineResult } from '@/model/types';
import { formatCurrency } from '@/lib/format';
import { useSeen } from '@/lib/motion';
import { DOMAIN_LABELS, DomainSymbol } from '@/components/ui/DomainSymbol';

export interface BridgeStep {
  key: string;
  kind: 'total' | 'down' | 'up';
  label: string;
  amount: number;
  domain?: DomainId;
  seg?: 'addon' | 'uplift' | 'current' | 'future';
  from: number;
  to: number;
}

/** Today → each retirement → licence change → With E7. The steps reconcile exactly to the ledger. */
export function bridgeSteps(r: EngineResult): BridgeStep[] {
  const steps: BridgeStep[] = [{ key: 'current', kind: 'total', label: 'Stay as entered', amount: r.currentAnnualTotal, seg: 'current', from: 0, to: r.currentAnnualTotal }];
  let running = r.currentAnnualTotal;
  const down = (step: Omit<BridgeStep, 'kind' | 'from' | 'to'>) => {
    steps.push({ ...step, kind: 'down', from: running - step.amount, to: running });
    running -= step.amount;
  };
  [...r.domains].filter(d => d.conservativeCredit > 0).sort((a, b) => b.conservativeCredit - a.conservativeCredit)
    .forEach(d => down({ key: d.domain, label: `${DOMAIN_LABELS[d.domain]} retired`, amount: d.conservativeCredit, domain: d.domain }));
  if (r.addOnAnnualAbsorbed > 0) down({ key: 'addons', label: 'Microsoft add-ons retired', amount: r.addOnAnnualAbsorbed, seg: 'addon' });
  if (r.uplift > 0) { steps.push({ key: 'uplift', kind: 'up', label: 'E7 licence uplift', amount: r.uplift, seg: 'uplift', from: running, to: running + r.uplift }); running += r.uplift; }
  else if (r.uplift < 0) down({ key: 'uplift', label: 'Suite licence reduction', amount: -r.uplift, seg: 'uplift' });
  steps.push({ key: 'future', kind: 'total', label: 'Move to E7', amount: r.futureAnnualTotal, seg: 'future', from: 0, to: r.futureAnnualTotal });
  return steps;
}

type RowStyle = CSSProperties & { '--i': number; '--edge': string };

export function CostBridge({ result, currency }: { result: EngineResult; currency: string }) {
  const [ref, seen] = useSeen<HTMLOListElement>();
  const steps = bridgeSteps(result);
  const max = Math.max(1, ...steps.map(step => Math.max(step.from, step.to)));
  const pct = (value: number) => `${Math.max(0, value) / max * 100}%`;
  const retirements = steps.filter(step => step.kind === 'down' && step.key !== 'uplift').length;
  return <section className="section-block bridge-section" aria-labelledby="cost-bridge-title">
    <div className="bc-heading"><span className="bc-icon" data-tone="bridge" aria-hidden="true"><ReceiptText /></span><div>
      <h2 id="cost-bridge-title">Where the difference comes from</h2>
      <p>{retirements ? `Walk from today’s recurring cost to E7: ${retirements} ${retirements === 1 ? 'area of' : 'areas of'} retired spend, then the licence change.` : 'No retired spend is entered yet, so the licence change is the whole difference.'}</p>
    </div></div>
    <ol ref={ref} className={`bridge ${seen ? 'is-seen' : ''}`}>
      {steps.map((step, index) => {
        const edge = step.kind === 'total' ? step.to : step.kind === 'down' ? step.from : step.to;
        const style: RowStyle = { '--i': index, '--edge': pct(edge) };
        const sign = step.kind === 'down' ? '−' : step.kind === 'up' ? '+' : '';
        return <li key={step.key} className={`bridge-row kind-${step.kind}`} data-domain={step.domain} data-seg={step.seg} style={style}>
          <span className="bridge-label">
            {step.domain ? <DomainSymbol domain={step.domain} /> : <span className="domain-symbol" data-seg={step.seg} aria-hidden="true">{step.seg === 'addon' ? <Layers3 /> : <Receipt />}</span>}
            <span>{step.label}</span>
          </span>
          <span className="bridge-track" aria-hidden="true"><span className="bridge-bar" style={{ left: pct(step.from), width: pct(step.to - step.from) }} /></span>
          <strong className="bridge-amount">{sign}{sign && ' '}{formatCurrency(step.amount, currency)}</strong>
        </li>;
      })}
    </ol>
    <p className="bridge-foot">Annual recurring {currency}. Full replacement assumed for eligible invoices; retained services stay in both totals.</p>
  </section>;
}
