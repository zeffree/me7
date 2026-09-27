import { ArrowDown, Shapes } from 'lucide-react';
import { Button } from '@/components/ui/Primitives';

export function inventoryMessage(answered: number, total: number, missing: number) {
  if (answered === 0) return 'Your stack starts here.';
  if (answered === total && missing === 0) return 'Your inventory is mapped.';
  if (answered === total) return 'The map is here. Fill in the numbers.';
  return 'Your stack is taking shape.';
}

export function InventoryProgress({ answered, total, missing, hasNext, onNext }: {
  answered: number; total: number; missing: number; hasNext: boolean; onNext: () => void;
}) {
  return <section className="inventory-progress" aria-label="Inventory progress">
    <Shapes className="inventory-progress-mark" aria-hidden="true" />
    <div className="inventory-progress-copy" role="status">
      <strong>{inventoryMessage(answered, total, missing)}</strong>
      <p>{answered === 0 ? 'Start with a tool you know. The rest can follow.' : `${answered} of ${total} categories answered. ${missing > 0 ? `${missing} entered ${missing === 1 ? 'amount is' : 'amounts are'} still unknown.` : 'Each answer makes the comparison clearer.'}`}</p>
    </div>
    <Button variant="secondary" size="sm" disabled={!hasNext} onClick={onNext}><ArrowDown />Next unreviewed</Button>
  </section>;
}
