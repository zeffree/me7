import type { EngineResult } from '@/model/types';
import { useAssessment } from '@/store/useAssessment';
import { formatCurrency } from '@/lib/format';
import { Toggle } from '@/components/ui/Fields';
import { Note } from '@/components/ui/Primitives';
import { BenchmarkContext } from '@/components/catalog/BenchmarkContext';

export function CostAvoidancePanel({ result }: { result: EngineResult; currency: string }) {
  const s = useAssessment();
  return <details className="disclosure section-block"><summary>Optional · planned capability value</summary>
    <h2>Value you might add, not cash you save</h2>
    <p className="detail-copy" style={{ margin: '12px 0 18px' }}>Select only capabilities you actually intend to adopt and would otherwise buy. No-purchase answers do not select these for you. Existing invoices and known add-on overlaps are excluded from the candidates.</p>
    <Note>These illustrative planning values stay in <strong>USD</strong>. They never reduce cash cost, TCO or payback.</Note>
    {result.avoidedCosts.length ? <div style={{ marginTop: 18 }}>{result.avoidedCosts.map(item => <div className="study-line" key={item.category.id}>
      <Toggle checked={item.selected} onChange={() => s.togglePlannedCapability(item.category.id)} label={item.category.name}
        description={`${item.licensedSeats.toLocaleString()} modeled seats × USD ${formatCurrency(item.benchmarkPupm, 'USD', 2)} × 12 = USD ${formatCurrency(item.avoidedAnnual, 'USD')} / year. Select to include this planning estimate.`} />
      <details className="disclosure"><summary>What is this illustrative amount based on?</summary><BenchmarkContext category={item.category} seats={item.licensedSeats} /><p className="detail-copy">This optional estimate uses {Math.round(item.adoptionPct * 100)}% of the workforce as an illustrative adoption assumption, not measured usage.</p></details>
    </div>)}</div> : <p className="note" style={{ marginTop: 18 }}>No eligible unpurchased capabilities remain in this scenario.</p>}
    <p className="formula">Selected planning value: <strong>USD {formatCurrency(result.avoidedAnnualSelected, 'USD')} / year</strong> · separate from the {s.currency} cash comparison.</p>
  </details>;
}
