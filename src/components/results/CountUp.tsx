import { useCountUp } from '@/lib/motion';

/** Visual count-up; assistive technology only ever receives the final value. */
export function CountUp({ value, format, className }: { value: number; format: (value: number) => string; className?: string }) {
  const shown = useCountUp(value);
  return <span className={className}><span aria-hidden="true">{format(shown)}</span><span className="sr-only">{format(value)}</span></span>;
}
