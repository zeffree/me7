import { CATEGORIES } from '@/data/categories';
import { MS_ADD_ONS } from '@/data/msAddOns';
import type { Assessment } from '@/model/types';

const categoryIds = new Set(CATEGORIES.map(category => category.id));
const addOnIds = new Set(MS_ADD_ONS.map(addOn => addOn.id));
export const isKnownCategory = (id: string) => categoryIds.has(id);
export const isKnownAddOn = (id: string) => addOnIds.has(id);

export function answeredCategoryCount(lines: Assessment['lines'], dismissed: readonly string[]): number {
  return new Set([...lines.map(line => line.categoryId), ...dismissed].filter(isKnownCategory)).size;
}

export interface RecoveredInvoice {
  kind: 'third-party' | 'microsoft';
  id: string;
  name: string;
  annual: number | undefined;
}

export function recoveredInvoices(assessment: Pick<Assessment, 'lines' | 'addOns' | 'seats'>): RecoveredInvoice[] {
  const annual = (line: Assessment['lines'][number] | Assessment['addOns'][number]) =>
    line.mode === 'annual' ? line.annual : line.pupm === undefined ? undefined : line.pupm * (line.seats ?? assessment.seats) * 12;
  return [
    ...assessment.lines.filter(line => !isKnownCategory(line.categoryId)).map(line => ({
      kind: 'third-party' as const, id: line.categoryId, name: line.vendor || line.categoryId, annual: annual(line),
    })),
    ...assessment.addOns.filter(line => !isKnownAddOn(line.addOnId)).map(line => ({
      kind: 'microsoft' as const, id: line.addOnId, name: line.addOnId, annual: annual(line),
    })),
  ];
}
