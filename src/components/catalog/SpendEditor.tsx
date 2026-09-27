import type { AddOnLine, SpendLine, SpendMode } from '@/model/types';
import { useAssessment } from '@/store/useAssessment';
import { NumberField, Segmented, SelectField } from '@/components/ui/Fields';
import { formatCurrency } from '@/lib/format';

type EditableLine = Pick<AddOnLine, 'annual' | 'pupm' | 'mode' | 'seats' | 'retainPct' | 'amountSource' | 'assumptionConfirmed' | 'savingsDelayMonths'>;
export function lineAnnual(line: EditableLine, orgSeats: number) {
  return line.mode === 'annual' ? line.annual ?? 0 : (line.pupm ?? 0) * (line.seats ?? orgSeats) * 12;
}
export function hasAmount(line: EditableLine) { return line.mode === 'annual' ? line.annual !== undefined : line.pupm !== undefined; }

export function SpendEditor<T extends AddOnLine | SpendLine>({ line, onChange, canRetire, label }: { line: T; onChange: (line: T) => void; canRetire: boolean; label: string }) {
  const s = useAssessment();
  const patch = (values: Partial<T>) => onChange({ ...line, assumptionConfirmed: false, ...values });
  const switchMode = (mode: SpendMode) => {
    if (mode === line.mode) return;
    const annual = hasAmount(line) ? lineAnnual(line, s.seats) : undefined;
    const seats = line.seats ?? s.seats;
    // Do not lose an annual invoice when zero product seats cannot express it per-seat.
    if (mode === 'pupm' && seats <= 0) return;
    onChange({ ...line, mode, annual, pupm: annual === undefined ? undefined : annual / (seats * 12) });
  };
  return <div className="entry-form">
    <Segmented ariaLabel={`${label} amount format`} value={line.mode} onChange={switchMode} options={[{ value: 'annual', label: 'Annual total' }, { value: 'pupm', label: 'Per seat / month' }]} />
    <div className="field-grid">
      <NumberField label={line.mode === 'annual' ? 'Annual invoice or estimate' : 'Price / seat / month'} currency={s.currency} step={0.01} max={line.mode === 'annual' ? 1e12 : 100_000}
        value={line.mode === 'annual' ? line.annual : line.pupm}
        onChange={v => patch((line.mode === 'annual' ? { annual: v } : { pupm: v }) as Partial<T>)} />
      <NumberField label="Seats on this product" hint={line.mode === 'annual' ? 'Used only if switching to per-seat pricing.' : `Defaults to ${s.seats.toLocaleString()} organization seats.`}
        value={line.seats ?? s.seats} min={1} max={5_000_000} onChange={v => patch({ seats: v } as Partial<T>)} />
      <SelectField label="Amount basis" value={line.amountSource ?? 'legacy'} onChange={v => patch({ amountSource: v } as Partial<T>)} options={[
        { value: 'customer', label: 'Customer invoice / contract amount' }, { value: 'benchmark', label: 'Estimate — not an invoice' }, { value: 'legacy', label: 'Imported amount — basis not reviewed' },
      ]} />
    </div>
    <div className="entry-status"><span>{hasAmount(line) ? 'Annual amount captured' : 'Amount not entered — still unknown'}</span><strong className="numeric">{hasAmount(line) ? formatCurrency(lineAnnual(line, s.seats), s.currency, 2) : '—'}</strong></div>
    {canRetire && <p className="muted">Full replacement is assumed. The whole eligible invoice offsets future cost; set any cancellation delay in Review.</p>}
    {!canRetire && <p className="muted">This category is not covered in the E7 model. Its full entered spend remains in future cost.</p>}
  </div>;
}
