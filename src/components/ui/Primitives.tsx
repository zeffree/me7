import type { ReactNode, ButtonHTMLAttributes, HTMLAttributes } from 'react';
import { cx } from '@/lib/format';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-brand-600 text-white hover:bg-brand-500 active:bg-brand-700 shadow-sm shadow-brand-900/30 disabled:hover:bg-brand-600',
  secondary:
    'surface-raised border text-[var(--text-primary)] hover:border-brand-400 hover:text-brand-500',
  ghost: 'text-secondary hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5',
  danger: 'text-rose-600 dark:text-rose-400 hover:bg-rose-500/10',
};

const SIZES: Record<Size, string> = {
  sm: 'min-h-10 text-xs px-3 py-2 gap-1.5 rounded-lg',
  md: 'min-h-11 text-sm px-4 py-2.5 gap-2 rounded-xl',
  lg: 'min-h-12 text-base px-6 py-3.5 gap-2.5 rounded-xl',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      className={cx(
        'inline-flex items-center justify-center font-semibold transition-colors duration-150',
        'disabled:cursor-not-allowed disabled:opacity-45',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Card({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx('surface-raised rounded-2xl border shadow-sm', className)}
      {...rest}
    >
      {children}
    </div>
  );
}

type Tone = 'neutral' | 'brand' | 'positive' | 'warning' | 'danger' | 'muted';

const TONES: Record<Tone, string> = {
  neutral: 'bg-ink-500/10 text-secondary ring-ink-500/20',
  brand: 'bg-brand-500/12 text-brand-700 dark:text-brand-300 ring-brand-500/25',
  positive: 'bg-accent-500/12 text-accent-700 dark:text-accent-300 ring-accent-500/25',
  // amber-700 on the 12% amber wash measures 4.25:1 at the badge's 11px, just under AA. amber-800
  // clears it without changing the tone's read.
  warning: 'bg-amber-500/12 text-amber-800 dark:text-amber-300 ring-amber-500/25',
  danger: 'bg-rose-500/12 text-rose-700 dark:text-rose-300 ring-rose-500/25',
  muted: 'bg-ink-500/8 text-muted ring-ink-500/15',
};

export function Badge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Chip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-lg border border-subtle bg-black/[0.03] px-2 py-1 text-xs font-medium text-secondary dark:bg-white/[0.04]',
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx('max-w-3xl', className)}>
      {eyebrow && (
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-brand-700 dark:text-brand-300">
          {eyebrow}
        </p>
      )}
      {/*
       * h1, not h2: exactly one of these renders per step and it is that screen's document
       * title, so starting the outline at h2 left every page without a level-one heading.
       */}
      <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
      {description && <p className="mt-3 text-sm leading-relaxed text-secondary">{description}</p>}
    </div>
  );
}

export function ProgressBar({
  value,
  max,
  className,
  label,
}: {
  value: number;
  max: number;
  className?: string;
  label?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      className={cx('h-1.5 w-full overflow-hidden rounded-full bg-ink-500/15', className)}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? 'Progress'}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500 transition-[width] duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  children,
}: {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-subtle px-6 py-12 text-center">
      {icon && <div className="mb-3 text-muted">{icon}</div>}
      <p className="font-semibold">{title}</p>
      {children && <p className="mt-1.5 max-w-md text-sm text-secondary">{children}</p>}
    </div>
  );
}
