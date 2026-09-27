export interface ScenePalette {
  paper: string;
  ground: string;
  wash: string;
  ink: string;
  muted: string;
  rule: string;
  action: string;
  actionWash: string;
  note: string;
  noteInk: string;
  positive: string;
  negative: string;
  ledger: string;
}

const TOKENS: Record<keyof ScenePalette, string> = {
  paper: '--paper', ground: '--ground', wash: '--wash', ink: '--ink', muted: '--muted',
  rule: '--rule', action: '--action', actionWash: '--action-wash', note: '--note',
  noteInk: '--note-ink', positive: '--positive', negative: '--negative', ledger: '--ledger',
};

export function readScenePalette(element: HTMLElement): ScenePalette {
  const styles = getComputedStyle(element);
  const token = (name: keyof ScenePalette) => styles.getPropertyValue(TOKENS[name]).trim();
  return {
    paper: token('paper'), ground: token('ground'), wash: token('wash'), ink: token('ink'),
    muted: token('muted'), rule: token('rule'), action: token('action'),
    actionWash: token('actionWash'), note: token('note'), noteInk: token('noteInk'),
    positive: token('positive'), negative: token('negative'), ledger: token('ledger'),
  };
}

export function watchScenePalette(
  read: () => ScenePalette,
  subscribe: (refresh: () => void) => () => void,
  onChange: (palette: ScenePalette) => void,
): () => void {
  let previous = '';
  let disposed = false;
  const refresh = () => {
    if (disposed) return;
    const palette = read();
    const signature = JSON.stringify(palette);
    if (signature !== previous) {
      previous = signature;
      onChange(palette);
    }
  };
  const unsubscribe = subscribe(refresh);
  refresh();
  return () => { disposed = true; unsubscribe(); };
}

export function observeScenePalette(element: HTMLElement, onChange: (palette: ScenePalette) => void): () => void {
  return watchScenePalette(() => readScenePalette(element), refresh => {
    const observer = new MutationObserver(refresh);
    // Observe the actual inheritance chain, not React's earlier theme-prop commit.
    for (let ancestor: HTMLElement | null = element; ancestor; ancestor = ancestor.parentElement) {
      observer.observe(ancestor, { attributes: true, attributeFilter: ['class', 'style'] });
    }
    return () => observer.disconnect();
  }, onChange);
}
