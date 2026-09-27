import { useRef } from 'react';
import { PartyPopper, Scale, Sparkles, TrendingUp } from 'lucide-react';
import type { EngineResult } from '@/model/types';
import { formatCurrency } from '@/lib/format';
import { usePrefersReducedMotion } from '@/lib/motion';
import { Button } from '@/components/ui/Primitives';
import { CountUp } from './CountUp';
import { useCelebration } from './Confetti';
import { toneOf, TONE_WORD } from './tone';

export function celebrationKey(orgName: string, seats: number, result: EngineResult) {
  return [orgName.trim().toLowerCase(), seats, Math.round(result.netAnnualConservative), Math.round(result.tcoNetBenefit)].join('|');
}

export function VerdictHero({ result: r, currency, orgName }: { result: EngineResult; currency: string; orgName: string }) {
  const tone = toneOf(r.netAnnualConservative);
  const hero = useRef<HTMLElement>(null);
  const reduced = usePrefersReducedMotion();
  const replay = useCelebration(celebrationKey(orgName, r.seats, r), tone === 'gain', hero);
  const money = (value: number) => formatCurrency(value, currency);
  const net = Math.abs(r.netAnnualConservative);
  const pct = r.currentAnnualTotal > 0 ? Math.round(net / r.currentAnnualTotal * 100) : null;
  const Icon = tone === 'gain' ? Sparkles : tone === 'loss' ? TrendingUp : Scale;
  const sentence = tone === 'gain'
    ? `${pct === null ? 'Lower' : `${pct}% lower`} than staying as entered. Only eligible invoice retirements reduce this figure.`
    : tone === 'loss'
      ? `${pct === null ? 'Higher' : `${pct}% higher`} than staying as entered. The entered savings do not cover the additional licence cost.`
      : 'Current and future recurring totals are equal under these inputs.';
  const ring = Math.min(100, pct ?? 0);
  return <section ref={hero} className={`verdict-hero tone-${tone}`} aria-labelledby="verdict-label">
    <div className="verdict-copy">
      <p className="verdict-eyebrow"><Icon aria-hidden="true" />The verdict</p>
      <h2 id="verdict-label">{TONE_WORD[tone].label}</h2>
      {tone !== 'even' && <p className="verdict-amount"><CountUp value={net} format={money} /><small> {currency} / year {TONE_WORD[tone].less}</small></p>}
      <p className="verdict-sentence">{sentence}</p>
      <p className="verdict-route"><span>Today <strong>{money(r.currentAnnualTotal)}</strong></span><span aria-hidden="true">→</span><span>With E7 <strong>{money(r.futureAnnualTotal)}</strong></span></p>
      {tone === 'gain' && !reduced && <Button variant="ghost" size="sm" className="verdict-replay no-print" onClick={replay}><PartyPopper />Celebrate again</Button>}
    </div>
    <div className="verdict-ring" aria-hidden="true">
      <svg viewBox="0 0 120 120"><circle className="ring-track" cx="60" cy="60" r="50" pathLength={100} /><circle className="ring-value" cx="60" cy="60" r="50" pathLength={100} style={{ strokeDasharray: `${ring} 100` }} /></svg>
      <span><strong>{tone === 'even' || pct === null ? '0%' : `${tone === 'gain' ? '−' : '+'}${pct}%`}</strong><small>recurring cost</small></span>
    </div>
  </section>;
}
