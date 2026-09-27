import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { StackPlayground, stackPieces } from './StackPlayground';
import { createDemoAssessment } from '@/data/demo';
import { computeAssessment } from '@/model/engine';
import { DOMAIN_LABELS, DomainSymbol } from '@/components/ui/DomainSymbol';
import { DOMAINS } from '@/data/categories';
import { InventoryProgress, inventoryMessage } from '@/components/catalog/InventoryProgress';
import { Stepper } from '@/components/layout/AppShell';

describe('playful, truthful assessment UI', () => {
  it('groups only actual retirement candidates without hiding retained services in the count', () => {
    const result = computeAssessment(createDemoAssessment());
    const pieces = stackPieces(result);
    expect(pieces.reduce((sum, piece) => sum + piece.count, 0)).toBe(10);
    expect(pieces).toHaveLength(6);
    expect(pieces.find(piece => piece.id === 'identity')?.count).toBe(4);
    expect(pieces.find(piece => piece.id === 'addons')?.count).toBe(1);
    expect(pieces.find(piece => piece.id === 'data')?.count).toBe(1);
  });

  it('leaves financial data unchanged and exposes both cost alternatives without interaction', () => {
    const result = computeAssessment(createDemoAssessment());
    const before = structuredClone(result);
    const html = renderToStaticMarkup(<StackPlayground result={result} />);
    expect(result).toEqual(before);
    expect(html).toContain('Current stack');
    expect(html).toContain('With E7');
    expect(html).toContain('$1,797,600');
    expect(html).toContain('$1,344,000');
    expect(html).toContain('$156,000');
    expect(html).toContain('Specialist services stay separate');
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).not.toContain('is-consolidated');
  });

  it('does not invent pieces for zero retirement credit', () => {
    const assessment = createDemoAssessment();
    assessment.lines = assessment.lines.filter(line => line.categoryId === 'siem-soar');
    assessment.addOns = [];
    expect(stackPieces(computeAssessment(assessment))).toEqual([]);
  });

  it.each(DOMAINS)('gives $id a consistent visual symbol without adding screen-reader noise', domain => {
    const html = renderToStaticMarkup(<DomainSymbol domain={domain.id} />);
    expect(DOMAIN_LABELS[domain.id]).toBeTruthy();
    expect(html).toContain(`data-domain="${domain.id}"`);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('<svg');
  });

  it('acknowledges real answers without presenting missing amounts as completion', () => {
    expect(inventoryMessage(0, 54, 0)).toBe('Your stack starts here.');
    expect(inventoryMessage(12, 54, 0)).toBe('Your stack is taking shape.');
    expect(inventoryMessage(54, 54, 2)).toBe('The map is here. Fill in the numbers.');
    expect(inventoryMessage(54, 54, 0)).toBe('Your inventory is mapped.');
    const html = renderToStaticMarkup(<InventoryProgress answered={12} total={54} missing={2} hasNext onNext={() => {}} />);
    expect(html).toContain('12 of 54 categories answered');
    expect(html).toContain('2 entered amounts are still unknown');
    expect(html).not.toContain('verified');
    expect(html).not.toContain('confirmed');
  });

  it('keeps the next-unreviewed shortcut unavailable when the current view has no candidate', () => {
    const html = renderToStaticMarkup(<InventoryProgress answered={12} total={54} missing={0} hasNext={false} onNext={() => {}} />);
    expect(html).toContain('disabled=""');
    expect(html).toContain('Next unreviewed');
  });

  it('keeps all five named stages and actual location instead of manufacturing completion', () => {
    const html = renderToStaticMarkup(<Stepper />);
    expect((html.match(/<li>/g) ?? []).length).toBe(5);
    expect((html.match(/aria-current="step"/g) ?? []).length).toBe(1);
    for (const name of ['Organization', 'Current spend', 'Microsoft add-ons', 'Review', 'Business case']) expect(html).toContain(name);
    expect(html).not.toContain('Completed');
  });
});
