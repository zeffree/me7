import { useId, useState, type CSSProperties } from 'react';
import { ArrowRight, Layers3, LockKeyhole } from 'lucide-react';
import { DOMAINS, type DomainId } from '@/data/categories';
import type { EngineResult } from '@/model/types';
import { formatCurrency } from '@/lib/format';
import { Segmented } from '@/components/ui/Fields';
import { DOMAIN_LABELS, DomainSymbol } from '@/components/ui/DomainSymbol';

export function stackPieces(result: EngineResult) {
  const pieces: { id: string; label: string; domain?: DomainId; count: number }[] = DOMAINS.map(domain => ({
    id: domain.id, label: DOMAIN_LABELS[domain.id], domain: domain.id,
    count: result.scoredLines.filter(line => line.category.domain === domain.id && line.annualCredit > 0).length,
  })).filter(piece => piece.count > 0);
  const addOns = result.scoredAddOns.filter(line => line.annualCredit > 0).length;
  if (addOns > 0) pieces.push({ id: 'addons', label: 'Add-ons', count: addOns });
  return pieces;
}

type PieceStyle = CSSProperties & { '--piece-x': string; '--piece-y': string; '--piece-tilt': string };

export function StackPlayground({ result }: { result: EngineResult }) {
  const [view, setView] = useState<'today' | 'e7'>('today');
  const id = useId();
  const pieces = stackPieces(result);
  const rows = Math.max(1, Math.ceil(pieces.length / 3));
  const count = pieces.reduce((sum, piece) => sum + piece.count, 0);
  const retained = result.thirdPartyAnnual + result.addOnAnnualTotal - result.totalAnnualSavings;
  return <figure className="stack-playground" aria-labelledby={id}>
    <div className="stack-play-controls">
      <figcaption id={id}>Try bringing it together.</figcaption>
      <Segmented ariaLabel="Illustrative stack view" value={view} onChange={setView} options={[
        { value: 'today', label: 'Current stack' }, { value: 'e7', label: 'With E7' },
      ]} />
    </div>
    <div className={`stack-board ${view === 'e7' ? 'is-consolidated' : ''}`} style={{ height: rows * 110 + 28 }} aria-hidden="true">
      {pieces.map((piece, index) => {
        const style: PieceStyle = {
          '--piece-x': `${((index % 3) - 1) * 32}cqw`,
          '--piece-y': `${(Math.floor(index / 3) - (rows - 1) / 2) * 110}px`,
          '--piece-tilt': `${[-5, 3, -3, 4, -2, 5, -4, 2][index]}deg`,
        };
        return <div className="stack-piece" style={style} key={piece.id}>
          {piece.domain ? <DomainSymbol domain={piece.domain} /> : <span className="domain-symbol"><Layers3 /></span>}
          <strong>{piece.label}</strong><small>{piece.count} {piece.count === 1 ? 'invoice' : 'invoices'}</small>
        </div>;
      })}
      <div className="stack-core"><span>E7</span><strong>A more connected stack.</strong><p>Microsoft 365 E5 + Copilot<br />Entra Suite + Agent 365</p></div>
    </div>
    <p className="stack-play-status" role="status">{view === 'today'
      ? `${count} retirement candidates across ${pieces.length} spend areas.`
      : `${count} candidate invoices brought into the E7 scenario. Full replacement assumed.`}</p>
    <p className="stack-retained"><LockKeyhole aria-hidden="true" /><span>Specialist services stay separate: <strong>{formatCurrency(retained, 'USD')} / year</strong>.</span></p>
    <div className="stack-cost-pair">
      <div><span>Today · USD / year</span><strong>{formatCurrency(result.currentAnnualTotal, 'USD')}</strong></div>
      <ArrowRight aria-hidden="true" />
      <div><span>With E7 · USD / year</span><strong>{formatCurrency(result.futureAnnualTotal, 'USD')}</strong></div>
    </div>
  </figure>;
}
