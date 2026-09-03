import { motion, useReducedMotion } from 'framer-motion';
import { TrendingDown, Wallet, Gift, Sparkles } from 'lucide-react';
import type { EngineResult } from '@/model/types';
import { Card, Badge } from '@/components/ui/Primitives';
import { SliderField } from '@/components/ui/Fields';
import { formatCurrency, formatPupm, cx } from '@/lib/format';
import { E7_SKU } from '@/data/skus';
import { useAssessment } from '@/store/useAssessment';

export function Headline({ result, currency }: { result: EngineResult; currency: string }) {
  const { assumptions, setAssumptions } = useAssessment();
  const positive = result.netAnnualConservative >= 0;
  const reduceMotion = useReducedMotion();
  const selectedCount = result.avoidedCosts.filter((a) => a.selected).length;

  return (
    <div className="space-y-5">
      <Card className="print-keep relative overflow-hidden p-6 sm:p-8">
        <div className="hero-glow" aria-hidden />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="brand">The headline</Badge>
            <span className="text-xs text-muted">{result.seats.toLocaleString()} seats</span>
          </div>

          <p className="mt-4 max-w-2xl text-lg font-medium text-secondary sm:text-xl">
            Microsoft 365 E7 lists at{' '}
            <span className="numeral font-bold text-[var(--text-primary)]">
              {formatPupm(E7_SKU.listPricePupm, currency)}
            </span>{' '}
            per user per month. After the spend it lets you cancel, it effectively nets to
          </p>

          <motion.p
            key={result.effectiveNetPupmConservative.toFixed(2)}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.35, ease: 'easeOut' }}
            className="numeral mt-3 break-words text-[clamp(2.6rem,13vw,4.5rem)] font-extrabold leading-none text-brand-600 dark:text-brand-300 sm:text-6xl"
          >
            {formatPupm(result.effectiveNetPupmConservative, currency)}
          </motion.p>

          <p className="mt-3 text-sm text-secondary">
            per user per month for you, once the spend below stops.
          </p>

          {!positive && (
            <p className="mt-4 max-w-2xl rounded-xl border border-amber-500/30 bg-amber-500/[0.07] p-4 text-sm leading-relaxed text-secondary">
              <span className="font-semibold text-[var(--text-primary)]">
                Read these two numbers together.
              </span>{' '}
              E7 is worth far more than its {formatPupm(result.e7NetPupm, currency)} sticker once
              consolidation lands — but on the spend you have captured so far, your total outlay
              still rises by{' '}
              <span className="numeral font-semibold">
                {formatCurrency(Math.abs(result.netAnnualConservative), currency)}
              </span>{' '}
              a year. That is the honest answer. Capturing more of your existing spend, or
              negotiating a deeper discount, is what closes the gap.
            </p>
          )}
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          icon={<Wallet className="h-4 w-4" aria-hidden />}
          label="Current annual run-rate"
          value={formatCurrency(result.currentAnnualTotal, currency)}
          sub="Suite + Microsoft add-ons + third-party"
        />
        <Stat
          icon={<Sparkles className="h-4 w-4" aria-hidden />}
          label="E7 annual licence cost"
          value={formatCurrency(result.e7Annual, currency)}
          sub={`${formatPupm(result.e7NetPupm, currency)} after your discount`}
        />
        <Stat
          icon={<TrendingDown className="h-4 w-4" aria-hidden />}
          label="Net annual impact"
          value={formatCurrency(result.netAnnualConservative, currency)}
          sub="Spend cancelled, less the E7 uplift"
          tone={positive ? 'positive' : 'danger'}
        />
        <Stat
          icon={<Gift className="h-4 w-4" aria-hidden />}
          label="Capability you stop having to buy"
          value={formatCurrency(result.avoidedAnnualSelected, currency)}
          sub={
            result.avoidedAnnualSelected > 0
              ? `${selectedCount} new ${selectedCount === 1 ? 'capability' : 'capabilities'} at third-party list prices`
              : 'Pick what you would switch on, below'
          }
          tone={result.avoidedAnnualSelected > 0 ? 'positive' : 'neutral'}
        />
      </div>

      <Card className="no-print p-6">
        <h2 className="text-base font-bold">What if you negotiate harder?</h2>
        <p className="mt-1 text-sm text-secondary">
          Drag to see how your E7 discount moves the headline. Everything on this page updates live.
        </p>
        <div className="mt-5 grid items-end gap-6 sm:grid-cols-[2fr_1fr]">
          <SliderField
            label="Discount off E7 list price"
            value={assumptions.e7DiscountPct}
            onChange={(e7DiscountPct) => setAssumptions({ e7DiscountPct })}
            min={0}
            max={40}
            format={(v) => `${v}%`}
          />
          <div className="rounded-xl border border-subtle bg-[var(--surface-sunken)] p-4 text-right">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
              Effective net
            </p>
            <p className="numeral text-2xl font-extrabold text-brand-500 dark:text-brand-300">
              {formatPupm(result.effectiveNetPupmConservative, currency)}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  sub,
  tone = 'neutral',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  tone?: 'neutral' | 'positive' | 'danger';
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 text-muted">
        {icon}
        <p className="text-[11px] font-bold uppercase tracking-wide">{label}</p>
      </div>
      <p
        className={cx(
          'numeral mt-2.5 text-2xl font-extrabold',
          tone === 'positive' && 'text-accent-700 dark:text-accent-300',
          tone === 'danger' && 'text-rose-700 dark:text-rose-400',
        )}
      >
        {value}
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-secondary">{sub}</p>
    </Card>
  );
}
