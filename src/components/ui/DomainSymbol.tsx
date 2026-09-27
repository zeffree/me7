import { Bot, ChartNoAxesCombined, Fingerprint, KeyRound, LaptopMinimal, MessagesSquare, ShieldCheck } from 'lucide-react';
import type { DomainId } from '@/data/categories';

export const DOMAIN_LABELS: Record<DomainId, string> = {
  ai: 'AI & agents', identity: 'Identity', endpoint: 'Devices', threat: 'Security',
  data: 'Data', comms: 'Collaboration', analytics: 'Analytics',
};

const SYMBOLS = {
  ai: Bot, identity: KeyRound, endpoint: LaptopMinimal, threat: ShieldCheck,
  data: Fingerprint, comms: MessagesSquare, analytics: ChartNoAxesCombined,
};

export function DomainSymbol({ domain }: { domain: DomainId }) {
  const Icon = SYMBOLS[domain];
  return <span className="domain-symbol" data-domain={domain} aria-hidden="true"><Icon /></span>;
}
