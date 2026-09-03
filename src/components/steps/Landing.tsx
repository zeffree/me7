import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Layers, Lock, PlayCircle, ShieldCheck, TrendingDown } from 'lucide-react';
import { useAssessment } from '@/store/useAssessment';
import { CATEGORIES } from '@/data/categories';
import { E7_SKU, PRICING_AS_OF } from '@/data/skus';

const BUCKETS = [
  {
    icon: TrendingDown,
    title: 'Already redundant today',
    body: 'Capabilities your current suite already includes but you still pay a vendor for. If you are on E5, this is usually the most uncomfortable number in the report — and the most useful.',
    tone: 'text-amber-500',
  },
  {
    icon: Layers,
    title: 'Unlocked by E7',
    body: 'What the upgrade newly covers. Copilot, Agent 365 and the full Entra Suite land here for everyone, plus the whole Defender and Purview stack if you are on E3 today.',
    tone: 'text-brand-400',
  },
  {
    icon: ShieldCheck,
    title: 'Not covered by E7',
    body: 'Sentinel, calling plans, e-signature, contact centre. Shown deliberately and scored at zero, because a business case that claims E7 replaces everything will not survive finance.',
    tone: 'text-rose-400',
  },
];

export function Landing() {
  const { start, loadDemo } = useAssessment();
  const reduceMotion = useReducedMotion();

  return (
    <div>
      <section className="hero-glow relative overflow-hidden border-b border-subtle">
        <div className="mx-auto max-w-5xl px-4 py-20 text-center sm:px-6 sm:py-28">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.5 }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-500 dark:text-brand-300">
              Microsoft 365 E7 · GA {E7_SKU.generalAvailability}
            </span>

            <h1 className="mt-6 text-4xl font-extrabold leading-[1.05] sm:text-6xl">
              E7 lists at{' '}
              <span className="numeral text-brand-500 dark:text-brand-300">$99</span>
              .
              <br />
              Find out what it actually costs you.
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-secondary sm:text-lg">
              Sticker price is the wrong number. Most organisations on O365 E3, M365 E3 or E5 are
              also paying for identity, endpoint, security, compliance, telephony, BI and AI tools
              that E7 either absorbs — or that their current suite already covered.
              This maps that spend and shows the net.
            </p>

            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={start}
                className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-brand-600 px-7 py-3.5 text-base font-bold text-white shadow-lg shadow-brand-900/25 transition-colors hover:bg-brand-500"
              >
                Start the assessment
                <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={loadDemo}
                className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-subtle px-6 py-3.5 text-base font-semibold text-secondary transition-colors hover:text-[var(--text-primary)]"
              >
                <PlayCircle className="h-4 w-4" aria-hidden />
                See a worked example
              </button>
            </div>

            <p className="mt-6 inline-flex items-center gap-1.5 text-xs text-muted">
              <Lock className="h-3 w-3" aria-hidden />
              Runs entirely in your browser. Your spend data is never uploaded anywhere.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-5 md:grid-cols-3">
          {BUCKETS.map((b, i) => (
            <motion.div
              key={b.title}
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.4, delay: reduceMotion ? 0 : 0.08 * i }}
              className="surface-raised rounded-2xl border p-6"
            >
              <b.icon className={`h-6 w-6 ${b.tone}`} aria-hidden />
              <h2 className="mt-4 text-lg font-bold">{b.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-secondary">{b.body}</p>
            </motion.div>
          ))}
        </div>

        <div className="surface-raised mt-6 grid gap-6 rounded-2xl border p-6 sm:grid-cols-3 sm:p-8">
          <Stat value={`${CATEGORIES.length}`} label="solution categories assessed" />
          <Stat value="7" label="domains, from AI to analytics" />
          <Stat value={PRICING_AS_OF} label="pricing baseline, fully editable" />
        </div>

        <p className="mt-8 text-center text-xs leading-relaxed text-muted">
          Every category explains what the solution class does, which E7 capability covers it, and
          which mainstream products sit in that space — so you can complete this even if you are not
          the person who signs the contracts.
        </p>
      </section>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <p className="numeral text-3xl font-extrabold text-brand-500 dark:text-brand-300">{value}</p>
      <p className="mt-1 text-sm text-secondary">{label}</p>
    </div>
  );
}
