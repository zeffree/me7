import type { ReactNode, ButtonHTMLAttributes, HTMLAttributes } from 'react';
import { cx } from '@/lib/format';

export function Button({ variant = 'primary', size = 'md', className, children, ...rest }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; size?: 'sm' | 'md' | 'lg' }) {
  return <button type="button" className={cx('button', `button-${variant}`, `button-${size}`, className)} {...rest}>{children}</button>;
}

export function Card({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('panel', className)} {...rest}>{children}</div>;
}

export function Badge({ tone = 'neutral', className, children }: { tone?: 'neutral' | 'brand' | 'positive' | 'warning' | 'danger' | 'muted'; className?: string; children: ReactNode }) {
  return <span className={cx('badge', `badge-${tone}`, className)}>{children}</span>;
}

export function Chip({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cx('chip', className)}>{children}</span>;
}

export function SectionHeading({ title, description, className }: { eyebrow?: string; title: string; description?: ReactNode; className?: string }) {
  return <div className={cx('section-heading', className)}><h1 tabIndex={-1}>{title}</h1>{description && <p>{description}</p>}</div>;
}

export function ProgressBar({ value, max, className, label }: { value: number; max: number; className?: string; label?: string }) {
  return <progress className={cx('progress', className)} value={value} max={Math.max(1, max)} aria-label={label ?? 'Reviewed categories'} />;
}

export function EmptyState({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return <div className="empty-state">{icon}<h3>{title}</h3>{children && <p>{children}</p>}</div>;
}

export function Note({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'warning' | 'danger' }) {
  return <div className={`note note-${tone}`}>{children}</div>;
}
