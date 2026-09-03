import { useId, useState, type ReactNode } from 'react';
import { Info } from 'lucide-react';
import { cx, currencySymbol } from '@/lib/format';

const fieldBase =
  'w-full rounded-xl border border-subtle bg-[var(--surface-sunken)] px-3 py-2.5 text-sm ' +
  'text-[var(--text-primary)] transition-colors placeholder:text-muted ' +
  'focus:border-brand-500 focus:outline-none';

export function Label({
  htmlFor,
  children,
  hint,
}: {
  htmlFor?: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold">
      {children}
      {hint && <InfoTip>{hint}</InfoTip>}
    </label>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  className,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={className}>
      {label && (
        <Label htmlFor={id} hint={hint}>
          {label}
        </Label>
      )}
      <input
        id={id}
        type="text"
        className={fieldBase}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

/**
 * Numeric input that keeps its own draft string so the user can clear the field or type
 * "1." without React yanking the value back to 0 mid-keystroke.
 */
export function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  prefix,
  suffix,
  hint,
  currency,
  className,
  placeholder,
}: {
  label?: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  prefix?: string;
  suffix?: string;
  hint?: string;
  currency?: string;
  className?: string;
  placeholder?: string;
}) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? (Number.isFinite(value) ? String(value) : '');
  const lead = prefix ?? (currency ? currencySymbol(currency) : undefined);

  const commit = (raw: string) => {
    const parsed = Number.parseFloat(raw);
    if (Number.isNaN(parsed)) {
      onChange(min);
      return;
    }
    let next = parsed;
    if (min !== undefined) next = Math.max(min, next);
    if (max !== undefined) next = Math.min(max, next);
    onChange(next);
  };

  return (
    <div className={className}>
      {label && (
        <Label htmlFor={id} hint={hint}>
          {label}
        </Label>
      )}
      <div className="relative">
        {lead && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">
            {lead}
          </span>
        )}
        <input
          id={id}
          type="number"
          inputMode="decimal"
          className={cx(fieldBase, lead && 'pl-7', suffix && 'pr-12')}
          value={shown}
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
          onChange={(e) => {
            setDraft(e.target.value);
            if (e.target.value !== '') commit(e.target.value);
          }}
          onBlur={(e) => {
            commit(e.target.value);
            setDraft(null);
          }}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  hint,
  className,
}: {
  label?: string;
  value: T;
  onChange: (v: T) => void;
  options: ReadonlyArray<{ value: T; label: string }>;
  hint?: string;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={className}>
      {label && (
        <Label htmlFor={id} hint={hint}>
          {label}
        </Label>
      )}
      <select
        id={id}
        className={cx(fieldBase, 'cursor-pointer')}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Free-text input backed by a datalist of well-known vendors, so users can pick a
 * mainstream product fast but are never blocked from typing their own.
 */
export function VendorField({
  label,
  value,
  onChange,
  suggestions,
  className,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  suggestions: string[];
  className?: string;
}) {
  const id = useId();
  const listId = `${id}-vendors`;
  return (
    <div className={className}>
      {label && <Label htmlFor={id}>{label}</Label>}
      <input
        id={id}
        type="text"
        list={listId}
        className={fieldBase}
        value={value}
        placeholder="Vendor or product name"
        onChange={(e) => onChange(e.target.value)}
      />
      <datalist id={listId}>
        {suggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = 'md',
  className,
  ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: ReadonlyArray<{ value: T; label: string }>;
  size?: 'sm' | 'md';
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel ?? 'Options'}
      className={cx(
        'inline-flex rounded-xl border border-subtle bg-[var(--surface-sunken)] p-0.5',
        className,
      )}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={cx(
              'rounded-[10px] font-semibold transition-colors',
              size === 'sm' ? 'min-h-9 px-3 py-1.5 text-xs' : 'min-h-10 px-3.5 py-2 text-sm',
              active
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-secondary hover:text-[var(--text-primary)]',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex min-h-11 w-full items-start gap-3 rounded-xl py-2 text-left"
    >
      <span
        className={cx(
          'mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors',
          checked ? 'bg-brand-600' : 'bg-ink-500/30',
        )}
      >
        <span
          className={cx(
            'h-4 w-4 rounded-full bg-white shadow transition-transform',
            checked && 'translate-x-4',
          )}
        />
      </span>
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-secondary">{description}</span>}
      </span>
    </button>
  );
}

export function SliderField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  format,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
  hint?: string;
}) {
  const id = useId();
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <Label htmlFor={id} hint={hint}>
          {label}
        </Label>
        <output htmlFor={id} className="numeral text-sm font-bold text-brand-600 dark:text-brand-300">
          {format ? format(value) : value}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={format ? format(value) : undefined}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-ink-500/20 accent-brand-600"
      />
    </div>
  );
}

/** Small inline explainer. Hover or focus — keyboard users get it too. */
export function InfoTip({ children }: { children: ReactNode }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label="More information"
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        // The dot stays 20px visually, but ::after widens the hit area to 32px so it
        // clears the WCAG 2.2 target-size minimum on touch without shifting layout.
        className="relative inline-grid h-5 w-5 place-items-center rounded-full text-muted transition-colors after:absolute after:-inset-1.5 after:content-[''] hover:text-brand-600 dark:hover:text-brand-300"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false);
        }}
      >
        <Info className="h-3.5 w-3.5" aria-hidden />
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="surface-raised absolute bottom-full left-1/2 z-30 mb-2 w-64 -translate-x-1/2 rounded-xl border p-3 text-xs font-normal normal-case leading-relaxed tracking-normal text-secondary shadow-xl"
        >
          {children}
        </span>
      )}
    </span>
  );
}
