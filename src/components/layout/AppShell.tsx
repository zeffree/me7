import { useEffect, type ReactNode } from 'react';
import { Check, Moon, Presentation, RotateCcw, Sun } from 'lucide-react';
import { STEP_ORDER, useAssessment, type StepId } from '@/store/useAssessment';
import { cx } from '@/lib/format';

const STEP_LABELS: Record<StepId, string> = {
  profile: 'Profile',
  quick: 'Quick scan',
  catalog: 'Full catalog',
  addons: 'Microsoft add-ons',
  assumptions: 'Assumptions',
  results: 'Results',
};

export function AppShell({ children }: { children: ReactNode }) {
  const { theme, toggleTheme, sellerMode, toggleSellerMode, reset, started } = useAssessment();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <div className="min-h-screen">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-brand-600 focus:px-4 focus:py-2.5 focus:text-sm focus:font-bold focus:text-white"
      >
        Skip to main content
      </a>
      <header className="no-print sticky top-0 z-40 border-b border-subtle bg-[var(--surface-sunken)]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 text-sm font-black text-white"
            >
              E7
            </span>
            <div className="leading-tight">
              <p className="text-sm font-bold">Consolidation Assessment</p>
              <p className="hidden text-xs text-muted sm:block">
                What Microsoft 365 E7 actually nets out to
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleSellerMode}
              aria-pressed={sellerMode}
              title="Seller / presenter mode: adds competitive battlecards and discovery questions to every catalog card, plus a full presenter workspace on the results — deal snapshot, talking points built from these numbers, objection handling and a copyable executive summary"
              className={cx(
                'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors',
                'min-h-10',
                sellerMode
                  ? 'border-brand-500 bg-brand-500/12 text-brand-700 dark:text-brand-300'
                  : 'border-subtle text-secondary hover:text-[var(--text-primary)]',
              )}
            >
              <Presentation className="h-3.5 w-3.5" aria-hidden />
              <span className="hidden sm:inline">Seller mode</span>
              {sellerMode && <Check className="h-3 w-3" aria-hidden />}
            </button>

            {started && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Clear this assessment and start over?')) reset();
                }}
                className="grid min-h-10 min-w-10 place-items-center rounded-lg border border-subtle p-2 text-secondary transition-colors hover:text-[var(--text-primary)]"
                aria-label="Start over"
                title="Start over"
              >
                <RotateCcw className="h-4 w-4" aria-hidden />
              </button>
            )}

            <button
              type="button"
              onClick={toggleTheme}
              className="grid min-h-10 min-w-10 place-items-center rounded-lg border border-subtle p-2 text-secondary transition-colors hover:text-[var(--text-primary)]"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" aria-hidden />
              ) : (
                <Moon className="h-4 w-4" aria-hidden />
              )}
            </button>
          </div>
        </div>
      </header>

      <main id="main-content">{children}</main>

      <footer className="border-t border-subtle px-4 py-8 text-center sm:px-6 print:py-4">
        <div className="mx-auto max-w-2xl space-y-3 text-xs leading-relaxed text-muted">
          <p className="no-print">
            Prices are date-stamped list prices and every figure is editable. Your spend data is
            stored in this browser and is never uploaded.
          </p>
          <p className="border-t border-subtle pt-3 print:border-0 print:pt-0 print:text-black">
            Estimates only — not an official Microsoft quote. This is a personal project by Zeffree
            Kan and is not affiliated with, endorsed by, or an official tool of Microsoft. Feedback
            and suggestions are welcome at{' '}
            <a
              href="mailto:zeffree@live.com?subject=M365%20E7%20savings%20tool%20feedback"
              className="rounded-sm font-medium text-secondary underline decoration-dotted underline-offset-2 transition-colors hover:text-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 dark:hover:text-brand-300 print:text-black"
            >
              zeffree@live.com
            </a>
            .
          </p>
        </div>
      </footer>
    </div>
  );
}

export function Stepper() {
  const { step, setStep } = useAssessment();
  const currentIndex = STEP_ORDER.indexOf(step);

  return (
    <nav aria-label="Assessment progress" className="no-print border-b border-subtle">
      <ol className="mx-auto flex max-w-7xl flex-wrap gap-1 px-4 py-3 sm:px-6">
        {STEP_ORDER.map((s, i) => {
          const state = i === currentIndex ? 'current' : i < currentIndex ? 'done' : 'todo';
          return (
            <li key={s} className="shrink-0">
              <button
                type="button"
                onClick={() => setStep(s)}
                aria-current={state === 'current' ? 'step' : undefined}
                className={cx(
                  'flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-colors',
                  state === 'current' && 'bg-brand-600 text-white',
                  state === 'done' &&
                    'text-brand-600 hover:bg-brand-500/10 dark:text-brand-300',
                  state === 'todo' && 'text-muted hover:text-secondary',
                )}
              >
                <span
                  className={cx(
                    'grid h-5 w-5 place-items-center rounded-full text-[10px] font-black',
                    state === 'current' && 'bg-white/25',
                    state === 'done' && 'bg-brand-500/20',
                    state === 'todo' && 'bg-ink-500/15',
                  )}
                >
                  {state === 'done' ? <Check className="h-3 w-3" aria-hidden /> : i + 1}
                </span>
                {STEP_LABELS[s]}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function StepFooter({
  onNext,
  nextLabel = 'Continue',
  nextDisabled,
  children,
}: {
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  children?: ReactNode;
}) {
  const { back, next, step } = useAssessment();
  const isFirst = STEP_ORDER.indexOf(step) === 0;

  return (
    <div className="no-print mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-subtle pt-6">
      <div>
        {!isFirst && (
          <button
            type="button"
            onClick={back}
            className="min-h-11 rounded-xl px-4 py-2.5 text-sm font-semibold text-secondary transition-colors hover:text-[var(--text-primary)]"
          >
            Back
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {children}
        <button
          type="button"
          onClick={onNext ?? next}
          disabled={nextDisabled}
          className="rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {nextLabel}
        </button>
      </div>
    </div>
  );
}

export function StepContainer({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">{children}</div>;
}
