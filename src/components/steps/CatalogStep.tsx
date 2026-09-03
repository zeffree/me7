import { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronDown, Search } from 'lucide-react';
import { CATEGORIES, DOMAINS, type DomainId } from '@/data/categories';
import { SectionHeading, Badge } from '@/components/ui/Primitives';
import { CategoryCard } from '@/components/catalog/CategoryCard';
import { StepContainer, StepFooter } from '@/components/layout/AppShell';
import { useAssessment } from '@/store/useAssessment';
import { COVERAGE_META } from '@/lib/coverage';
import { cx, formatCurrency } from '@/lib/format';
import { annualiseLine } from '@/model/engine';

export function CatalogStep() {
  const { lines, seats, currency, baseline } = useAssessment();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<DomainId[]>(['ai']);
  const reduceMotion = useReducedMotion();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CATEGORIES;
    return CATEGORIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.whatItIs.toLowerCase().includes(q) ||
        c.e7Component.toLowerCase().includes(q) ||
        c.examples.some((e) => e.toLowerCase().includes(q)),
    );
  }, [query]);

  const captured = lines.reduce((acc, l) => acc + annualiseLine(l, seats), 0);
  const searching = query.trim().length > 0;

  const toggle = (id: DomainId) =>
    setOpen((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]));

  return (
    <StepContainer>
      <SectionHeading
        eyebrow="Step 3"
        title="The full catalog"
        description={`${CATEGORIES.length} categories across ${DOMAINS.length} domains. Every card explains what the solution class does, which E7 capability covers it, and the mainstream products in that space — so you can fill this in without being the person who signs the contracts.`}
      />

      <div className="sticky top-14 z-30 -mx-4 mt-6 border-y border-subtle bg-[var(--surface-sunken)]/95 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-0 flex-[1_1_16rem]">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search categories or products — try “Okta”, “Zscaler”, “Tableau”"
              aria-label="Search categories"
              className="w-full rounded-xl border border-subtle bg-[var(--surface)] py-2.5 pl-9 pr-3 text-sm placeholder:text-muted focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div className="text-right">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
              {lines.length} {lines.length === 1 ? 'line' : 'lines'} captured
            </p>
            <p className="numeral text-lg font-extrabold">{formatCurrency(captured, currency)}</p>
          </div>
        </div>
      </div>

      {searching ? (
        <div className="mt-6 space-y-4">
          {filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted">
              No categories match “{query}”.
            </p>
          ) : (
            filtered.map((c) => <CategoryCard key={c.id} category={c} />)
          )}
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {DOMAINS.map((domain) => {
            const cats = CATEGORIES.filter((c) => c.domain === domain.id);
            const isOpen = open.includes(domain.id);
            const panelId = `domain-${domain.id}-panel`;
            const capturedInDomain = lines.filter((l) =>
              cats.some((c) => c.id === l.categoryId),
            ).length;
            const alreadyCount = cats.filter(
              (c) => c.coverage[baseline] === 'already',
            ).length;

            return (
              <div key={domain.id} className="surface-raised overflow-hidden rounded-2xl border">
                <button
                  type="button"
                  onClick={() => toggle(domain.id)}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  className="flex w-full items-center gap-4 p-5 text-left transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                >
                  <ChevronDown
                    className={cx(
                      'h-5 w-5 shrink-0 text-muted transition-transform',
                      isOpen && 'rotate-180',
                      reduceMotion && 'transition-none',
                    )}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-bold">{domain.name}</h2>
                      <span className="text-xs text-muted">{cats.length} categories</span>
                      {capturedInDomain > 0 && (
                        <Badge tone="brand">{capturedInDomain} captured</Badge>
                      )}
                      {alreadyCount > 0 && (
                        <Badge tone="warning">
                          {alreadyCount} already in your suite
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-secondary">{domain.blurb}</p>
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: reduceMotion ? 0 : 0.25, ease: 'easeOut' }}
                      className="overflow-hidden"
                      id={panelId}
                    >
                      <div className="space-y-3 border-t border-subtle bg-[var(--surface-sunken)] p-4">
                        {cats.map((c) => (
                          <CategoryCard key={c.id} category={c} headingLevel={3} />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      <div className="surface-raised mt-8 rounded-2xl border p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-muted">How to read the badges</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {(Object.keys(COVERAGE_META) as Array<keyof typeof COVERAGE_META>).map((k) => (
            <div key={k} className="flex gap-3">
              <Badge tone={COVERAGE_META[k].tone}>{COVERAGE_META[k].label}</Badge>
              <p className="flex-1 text-xs leading-relaxed text-secondary">
                {COVERAGE_META[k].blurb}
              </p>
            </div>
          ))}
        </div>
      </div>

      <StepFooter nextLabel="Continue to Microsoft add-ons" />
    </StepContainer>
  );
}
