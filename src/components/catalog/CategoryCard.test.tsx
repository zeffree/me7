import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CATEGORIES } from '@/data/categories';
import { CategoryCard } from './CategoryCard';

describe('catalog product examples', () => {
  it.each(CATEGORIES.map(category => [category.id, category] as const))('shows four or five explicitly labeled examples for %s', (_, category) => {
    const html = renderToStaticMarkup(<CategoryCard category={category} />);
    const examples = html.match(/class="product-examples">([^<]+)</)?.[1];
    expect(examples).toMatch(/^e\.g\. /);
    const names = examples!.replace(/^e\.g\. /, '').split(' · ');
    expect(names.length).toBeGreaterThanOrEqual(4);
    expect(names.length).toBeLessThanOrEqual(5);
  });
});
