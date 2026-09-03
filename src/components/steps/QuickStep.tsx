import { ArrowRight, Zap } from 'lucide-react';
import { CATEGORIES, DOMAINS, QUICK_ASSESS_CATEGORIES } from '@/data/categories';
import { SectionHeading, ProgressBar } from '@/components/ui/Primitives';
import { CategoryCard } from '@/components/catalog/CategoryCard';
import { StepContainer, StepFooter } from '@/components/layout/AppShell';
import { useAssessment } from '@/store/useAssessment';
import { formatCurrency } from '@/lib/format';
import { annualiseLine } from '@/model/engine';

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

function numberWord(n: number): string {
  return WORDS[n] ?? String(n);
}

export function QuickStep() {
  const { lines, dismissed, seats, currency, setStep } = useAssessment();

  const answered = QUICK_ASSESS_CATEGORIES.filter(
    (c) => lines.some((l) => l.categoryId === c.id) || dismissed.includes(c.id),
  ).length;

  const captured = lines
    .filter((l) => QUICK_ASSESS_CATEGORIES.some((c) => c.id === l.categoryId))
    .reduce((acc, l) => acc + annualiseLine(l, seats), 0);

  return (
    <StepContainer>
      <SectionHeading
        eyebrow="Step 2"
        title={`The ${numberWord(QUICK_ASSESS_CATEGORIES.length)} that matter most`}
        description="These categories carry the largest dollars in most organisations. Answer them and you already have a defensible headline number — then expand into the full catalog for the long tail."
      />

      <div className="surface-raised mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-5">
        <div className="min-w-[220px] flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm font-semibold">
              {answered} of {QUICK_ASSESS_CATEGORIES.length} answered
            </span>
            <span className="text-xs text-muted">Nothing here is mandatory</span>
          </div>
          <ProgressBar
            className="mt-2"
            value={answered}
            max={QUICK_ASSESS_CATEGORIES.length}
            label="Quick scan progress"
          />
        </div>
        <div className="text-right">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">Captured so far</p>
          <p className="numeral text-2xl font-extrabold">{formatCurrency(captured, currency)}</p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {QUICK_ASSESS_CATEGORIES.map((c) => (
          <CategoryCard key={c.id} category={c} />
        ))}
      </div>

      <div className="surface-raised mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-brand-500/30 bg-brand-500/[0.06] p-6">
        <div className="flex items-start gap-3">
          <Zap className="mt-0.5 h-5 w-5 shrink-0 text-brand-500 dark:text-brand-300" aria-hidden />
          <div>
            <p className="font-bold">Want the complete picture?</p>
            <p className="mt-1 max-w-xl text-sm text-secondary">
              The full catalog covers {CATEGORIES.length} categories across {DOMAINS.length}{' '}
              domains — compliance, telephony, file storage, automation and the rest of the long
              tail where duplicated spend hides.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setStep('catalog')}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-500"
        >
          Open full catalog
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <StepFooter nextLabel="Continue to full catalog">
        <button
          type="button"
          onClick={() => setStep('results')}
          className="rounded-xl border border-subtle px-5 py-2.5 text-sm font-semibold text-secondary transition-colors hover:text-[var(--text-primary)]"
        >
          Skip to results
        </button>
      </StepFooter>
    </StepContainer>
  );
}
