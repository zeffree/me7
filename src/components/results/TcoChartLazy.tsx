import { lazy, Suspense } from 'react';
import type { EngineResult } from '@/model/types';
import { Card } from '@/components/ui/Primitives';

const TcoChart = lazy(() =>
  import('@/components/results/TcoChart').then((m) => ({ default: m.TcoChart })),
);

/**
 * recharts is by far the heaviest dependency and it is only ever needed on the final
 * step, so it is split out of the initial bundle.
 */
export function TcoChartLazy(props: { result: EngineResult; currency: string }) {
  return (
    <Suspense
      fallback={
        <Card className="p-6">
          <div className="h-5 w-64 animate-pulse rounded bg-ink-500/10" />
          <div className="mt-3 h-4 w-96 max-w-full animate-pulse rounded bg-ink-500/10" />
          <div className="mt-6 h-72 animate-pulse rounded-xl bg-ink-500/[0.07]" />
          <span className="sr-only">Loading chart…</span>
        </Card>
      }
    >
      <TcoChart {...props} />
    </Suspense>
  );
}
