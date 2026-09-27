import { useId, useState, type ReactNode } from 'react';
import { cx } from '@/lib/format';

export function Label({ htmlFor, children }: { htmlFor?: string; children: ReactNode }) {
  return <label htmlFor={htmlFor} className="field-label">{children}</label>;
}

function FieldSupport({ id, hint, error }: { id: string; hint?: string; error?: string }) {
  return <div className="field-support">
    {hint && <p className="field-hint" id={`${id}-hint`}>{hint}</p>}
    {error && <p className="field-error" id={`${id}-error`} role="alert">{error}</p>}
  </div>;
}

export function TextField({ label, value, onChange, placeholder, hint, className }: { label?: string; value: string; onChange: (v: string) => void; placeholder?: string; hint?: string; className?: string }) {
  const id = useId();
  return <div className={cx('field', className)}><Label htmlFor={id}>{label}</Label><input id={id} value={value} placeholder={placeholder} aria-describedby={hint ? `${id}-hint` : undefined} onChange={e => onChange(e.target.value)} /><FieldSupport id={id} hint={hint} /></div>;
}

export function NumberField({ label, value, onChange, min = 0, max = 1e12, step = 1, prefix, suffix, hint, currency, className, placeholder }: {
  label?: string; value: number | undefined; onChange: (v: number) => void; min?: number; max?: number; step?: number; prefix?: string; suffix?: string; hint?: string; currency?: string; className?: string; placeholder?: string;
}) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState('');
  const valid = (raw: string) => raw.trim() !== '' && Number.isFinite(Number(raw)) && Number(raw) >= min && Number(raw) <= max && (step !== 1 || Number.isInteger(Number(raw)));
  return <div className={cx('field', className)}>
    <Label htmlFor={id}>{label}</Label>
    <div className="number-field">
      {(prefix || currency) && <span aria-hidden="true">{prefix || currency}</span>}
      <input id={id} type="text" inputMode={step === 1 ? 'numeric' : 'decimal'} value={draft ?? (value === undefined ? '' : String(value))}
        placeholder={placeholder ?? 'Not entered'} aria-invalid={!!error} aria-describedby={[hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined}
        onChange={e => {
          const raw = e.target.value;
          setDraft(raw);
          setError('');
          if (valid(raw)) onChange(Number(raw));
        }}
        onBlur={e => {
          if (valid(e.target.value)) { onChange(Number(e.target.value)); setDraft(null); setError(''); }
          else if (e.target.value === '' && value === undefined) { setDraft(null); }
          else { setError(`Enter ${step === 1 ? 'a whole number' : 'an amount'} from ${min.toLocaleString()} to ${max.toLocaleString()}. Your last valid value is unchanged.`); }
        }} />
      {suffix && <span aria-hidden="true">{suffix}</span>}
    </div>
    <FieldSupport id={id} hint={hint} error={error} />
  </div>;
}

export function SelectField<T extends string>({ label, value, onChange, options, hint, className }: { label?: string; value: T; onChange: (v: T) => void; options: ReadonlyArray<{ value: T; label: string }>; hint?: string; className?: string }) {
  const id = useId();
  return <div className={cx('field', className)}><Label htmlFor={id}>{label}</Label><select id={id} value={value} aria-describedby={hint ? `${id}-hint` : undefined} onChange={e => onChange(e.target.value as T)}>{options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select><FieldSupport id={id} hint={hint} /></div>;
}

export function VendorField({ label = 'Vendor or product', value, onChange, suggestions, className }: { label?: string; value: string; onChange: (v: string) => void; suggestions: string[]; className?: string }) {
  const id = useId();
  return <div className={cx('field', className)}><Label htmlFor={id}>{label}</Label><input id={id} list={`${id}-vendors`} value={value} placeholder="Enter a product or invoice name" onChange={e => onChange(e.target.value)} /><div className="field-support"><datalist id={`${id}-vendors`}>{suggestions.map(s => <option key={s} value={s} />)}</datalist></div></div>;
}

export function Segmented<T extends string>({ value, onChange, options, className, ariaLabel }: { value: T; onChange: (v: T) => void; options: ReadonlyArray<{ value: T; label: string }>; size?: 'sm' | 'md'; className?: string; ariaLabel?: string }) {
  return <div role="group" aria-label={ariaLabel ?? 'View'} className={cx('segmented', className)}>{options.map(o => <button type="button" key={o.value} aria-pressed={o.value === value} onClick={() => onChange(o.value)}>{o.label}</button>)}</div>;
}

export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return <label className="check-field"><input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} /><span><strong>{label}</strong>{description && <small>{description}</small>}</span></label>;
}

export function SliderField({ label, value, onChange, min, max, step = 1, format, hint }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step?: number; format?: (v: number) => string; hint?: string }) {
  const id = useId();
  return <div className="field"><Label htmlFor={id}>{label} <output>{format ? format(value) : value}</output></Label><input id={id} type="range" min={min} max={max} step={step} value={value} aria-describedby={hint ? `${id}-hint` : undefined} onChange={e => onChange(Number(e.target.value))} /><FieldSupport id={id} hint={hint} /></div>;
}

export function InfoTip({ children }: { children: ReactNode }) {
  return <details className="inline-help"><summary>Details</summary><div>{children}</div></details>;
}
