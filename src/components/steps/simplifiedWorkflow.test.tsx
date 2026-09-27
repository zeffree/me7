import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProfileStep } from './ProfileStep';
import { Landing } from './Landing';
import { SpendEditor } from '@/components/catalog/SpendEditor';
import { BenchmarkContext } from '@/components/catalog/BenchmarkContext';
import { CategoryDiscussion } from '@/components/catalog/CategoryDiscussion';
import { CATEGORIES } from '@/data/categories';
import { createDemoAssessment } from '@/data/demo';
import { computeAssessment } from '@/model/engine';
import { formatCurrency } from '@/lib/format';
import type { SpendLine } from '@/model/types';

describe('simplified assessment entry', () => {
  it('offers neither a currency selector nor price-confirmation checkbox', () => {
    const html = renderToStaticMarkup(<ProfileStep />);
    expect(html).toContain('US dollars (USD)');
    expect(html).not.toContain('<select');
    expect(html).not.toContain('type="checkbox"');
    expect(html).not.toContain('confirm the customer amounts');
  });

  it('does not show retained-share or amount-confirmation controls on an invoice', () => {
    const line: SpendLine = { categoryId: 'edr-xdr', vendor: 'Example', mode: 'annual', annual: 10_000, retainPct: 80 };
    const html = renderToStaticMarkup(<SpendEditor line={line} onChange={() => {}} canRetire label="Endpoint" />);
    expect(html).toContain('Full replacement is assumed');
    expect(html).not.toContain('Share of spend');
    expect(html).not.toContain('type="checkbox"');
    expect(html).toContain('Amount basis');
  });

  it.each(CATEGORIES)('explains the actual benchmark basis for $id without attributing an invented vendor price', category => {
    const html = renderToStaticMarkup(<BenchmarkContext category={category} seats={100} />);
    expect(html).toContain('No single product.');
    expect(html).toContain('not a vendor list price or quote');
    expect(html).toContain('e.g.');
    if (category.benchmarkPupm > 0) {
      expect(html).toContain(formatCurrency(category.benchmarkPupm * 100 * 12, 'USD'));
      expect(html).toContain('100 users');
    } else {
      expect(html).toContain('does not mean the service is free');
    }
  });

  it('renders the landing headlines from the actual shared demo calculations', () => {
    const result = computeAssessment(createDemoAssessment());
    const html = renderToStaticMarkup(<Landing onResume={() => {}} />);
    for (const amount of [result.currentAnnualTotal, result.futureAnnualTotal, result.recurringAnnualBenefit, result.tcoNetBenefit]) {
      expect(html).toContain(formatCurrency(amount, 'USD'));
    }
    expect(html).toContain(`Month ${result.paybackMonths}`);
    expect(html).toContain('Synthetic USD inputs');
    expect(html).toContain('Backup and e-signature stay paid');
  });

  it('gives category notes a workflow, capability route and acceptance-test prompt', () => {
    const category = CATEGORIES.find(item => item.id === 'edr-xdr')!;
    const html = renderToStaticMarkup(<CategoryDiscussion category={category} scored={null} />);
    expect(html).toContain('Lead with the workflow');
    expect(html).toContain('E7 capability to evaluate');
    expect(html).toContain('acceptance test');
    expect(html).toContain('Capture the actual invoice');
  });
});
