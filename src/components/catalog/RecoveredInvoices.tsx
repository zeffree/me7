import { useAssessment } from '@/store/useAssessment';
import { formatCurrency } from '@/lib/format';
import { Button, Note } from '@/components/ui/Primitives';
import { recoveredInvoices } from './inventory';

export function RecoveredInvoices() {
  const s = useAssessment();
  const invoices = recoveredInvoices(s);
  if (!invoices.length) return null;
  return <section className="section-block">
    <h2>Recovered invoices outside this catalog</h2>
    <Note tone="warning">These saved identifiers no longer match a catalog item. Their known amounts remain in both current and future cost, with no retirement credit. Keep them as retained spend, or remove an incorrect entry and add it under the correct catalog item.</Note>
    <div className="table-scroll" style={{ marginTop: 16 }}><table><caption>Unmapped saved inputs, {s.currency}. Unknown amounts are not zero.</caption><thead><tr><th scope="col">Saved invoice</th><th scope="col" className="numeric">Annual retained cost</th><th scope="col">Action</th></tr></thead><tbody>
      {invoices.map((invoice, index) => <tr key={`${invoice.kind}:${invoice.id}:${index}`}><td><strong>{invoice.name}</strong><small>{invoice.kind === 'microsoft' ? 'Microsoft add-on' : 'Third-party'} · identifier: {invoice.id}</small></td><td className="numeric">{invoice.annual === undefined ? 'Amount unknown' : formatCurrency(invoice.annual, s.currency, 2)}</td><td><Button variant="danger" size="sm" onClick={() => {
        if (window.confirm(`Remove saved entries with identifier "${invoice.id}"? Their retained costs will be removed from the comparison.`)) {
          if (invoice.kind === 'microsoft') s.removeAddOn(invoice.id);
          else s.removeLine(invoice.id);
        }
      }}>Remove saved entry</Button></td></tr>)}
    </tbody></table></div>
  </section>;
}
