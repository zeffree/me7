import type { ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Building2, ChartNoAxesCombined, Layers3, Moon, Presentation, RotateCcw, SlidersHorizontal, Sun, WalletCards } from 'lucide-react';
import { useAssessment, toAssessment, type StepId } from '@/store/useAssessment';
import { computeAssessment } from '@/model/engine';
import { CATEGORIES } from '@/data/categories';
import { formatCurrency } from '@/lib/format';
import { Button, ProgressBar } from '@/components/ui/Primitives';
import { answeredCategoryCount } from '@/components/catalog/inventory';
import { APP_ROUTES, type AppPage } from './appRoute';

const STAGES: { id: StepId; label: string }[] = [
  { id: 'profile', label: 'Organization' }, { id: 'quick', label: 'Current spend' },
  { id: 'addons', label: 'Microsoft add-ons' }, { id: 'assumptions', label: 'Review' }, { id: 'results', label: 'Business case' },
];
const STAGE_ICONS = [Building2, WalletCards, Layers3, SlidersHorizontal, ChartNoAxesCombined];

export function AppShell({ children, onHome, onAssessment, page = 'assessment' }: {
  children: ReactNode; onHome: () => void; onAssessment: () => void; page?: AppPage;
}) {
  const state = useAssessment();
  const storageError = 'storageError' in state && typeof state.storageError === 'string' ? state.storageError : null;
  const assessmentMode = page === 'assessment';
  const showAssessmentControls = page !== 'architecture' && page !== 'experience';
  const { mainId } = APP_ROUTES[page];
  return <div className="app-shell">
    <a href={`#${mainId}`} className="skip-link">Skip to main content</a>
    <header className="site-header no-print">
      <div className="header-inner">
        <button className="wordmark" onClick={onHome} aria-label="E7 assessment home"><span className="wordmark-mark">E7</span><span><strong>Consolidation assessment</strong><small>An independent financial working tool</small></span></button>
        <nav className="page-nav" aria-label="Main navigation">
          <a href={APP_ROUTES.assessment.href} onClick={event => {
            if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            onAssessment();
          }} aria-current={assessmentMode ? 'page' : undefined}>Assessment</a>
          <a href={APP_ROUTES.experience.href} aria-current={page === 'experience' ? 'page' : undefined}>Experience E7</a>
          <a href={APP_ROUTES.architecture.href} aria-current={page === 'architecture' ? 'page' : undefined}>E7 in action</a>
        </nav>
        <div className="header-actions">
          {showAssessmentControls && <span className={`save-status ${storageError ? 'error' : ''}`}>{storageError ? 'Not saved · export a copy' : 'Local browser workspace'}</span>}
          {showAssessmentControls && <Button variant="ghost" size="sm" className={state.sellerMode ? 'active' : ''} aria-pressed={state.sellerMode} aria-label="Toggle presenter guidance" onClick={state.toggleSellerMode}><Presentation /><span className="header-action-label">Presenter</span></Button>}
          {showAssessmentControls && state.started && <Button variant="ghost" className="icon-button" aria-label="Start a new assessment" onClick={() => {
            if (window.confirm('Clear this assessment and start again? Export a JSON copy first if you want to keep it.')) { state.reset(); onHome(); }
          }}><RotateCcw /></Button>}
          <Button variant="ghost" className="icon-button" onClick={state.toggleTheme} aria-label={`Use ${state.theme === 'dark' ? 'light' : 'dark'} theme`}>{state.theme === 'dark' ? <Sun /> : <Moon />}</Button>
        </div>
      </div>
    </header>
    {showAssessmentControls && storageError && <div className="flash no-print" role="alert">{storageError}</div>}
    <main id={mainId} tabIndex={-1}>{children}</main>
    <footer className="site-footer">
      {showAssessmentControls && <p className="no-print">Assessment calculations run in your browser. Local storage can be unavailable or cleared. Export a JSON copy to keep your work. Shared links contain your inputs and are not encrypted.</p>}
      <p>Estimates only — not an official Microsoft quote. This is a personal project by Zeffree Kan, not affiliated with, endorsed by, or an official tool of Microsoft. Feedback: <a href="mailto:zeffree@live.com?subject=M365%20E7%20assessment%20feedback">zeffree@live.com</a>.</p>
      <p className="no-print"><a href={APP_ROUTES.audit.href} aria-current={page === 'audit' ? 'page' : undefined}>Audit &amp; review reference</a></p>
    </footer>
  </div>;
}

export function Stepper() {
  const s = useAssessment();
  const reviewed = answeredCategoryCount(s.lines, s.dismissed);
  const descriptions = {
    profile: `${s.seats.toLocaleString()} seats · ${s.currency}`,
    quick: `${reviewed}/${CATEGORIES.length} categories answered`,
    addons: `${s.addOns.length} invoice lines`,
    assumptions: 'Prices, overlap & timing',
    results: 'Entered items only',
  };
  return <nav className="stage-nav no-print" aria-label="Assessment stages"><ol>{STAGES.map((stage, i) => {
    const active = s.step === stage.id || (stage.id === 'quick' && s.step === 'catalog');
    const Icon = STAGE_ICONS[i];
    return <li key={stage.id}><button onClick={() => s.setStep(stage.id)} aria-current={active ? 'step' : undefined}><span className="stage-number" aria-hidden="true"><Icon /></span><span><strong><span className="stage-order">{i + 1}.</span> {stage.label}</strong><small>{descriptions[stage.id as keyof typeof descriptions]}</small></span></button></li>;
  })}</ol></nav>;
}

function Ledger() {
  const s = useAssessment();
  const r = computeAssessment(toAssessment(s));
  const benefit = r.netAnnualConservative;
  return <div className="ledger">
    <div className="ledger-caption"><h2>Working estimate</h2><span>{s.currency} / year</span></div>
    <dl><div><dt>Current recurring spend</dt><dd>{formatCurrency(r.currentAnnualTotal, s.currency)}</dd></div>
      <div><dt>Future recurring spend</dt><dd>{formatCurrency(r.currentAnnualTotal - benefit, s.currency)}</dd></div>
      <div className="ledger-net"><dt>{benefit > 0 ? 'Estimated annual reduction' : benefit < 0 ? 'Estimated annual increase' : 'Annual change'}</dt><dd>{formatCurrency(Math.abs(benefit), s.currency)}</dd></div></dl>
    <small>Based on entered items and eligible assumptions. Unreviewed spend is not zero.</small>
    <button onClick={() => s.setStep('assumptions')}>Review what is counted →</button>
  </div>;
}

export function CostRail() {
  const s = useAssessment();
  const reviewed = answeredCategoryCount(s.lines, s.dismissed);
  return <aside className="cost-rail no-print" aria-label="Persistent cost summary"><Ledger /><div className="rail-note"><strong>{reviewed} of {CATEGORIES.length} spend categories answered</strong><p>You can continue with a partial inventory. Your business case will stay marked provisional.</p><ProgressBar value={reviewed} max={CATEGORIES.length} /></div><div className="rail-note"><strong>Full replacement scenario</strong><p>Covered invoices are modeled as fully replaced. Not-covered services stay paid. Add cancellation delays and transition costs in Review.</p></div></aside>;
}

export function MobileSummary() {
  const s = useAssessment();
  const r = computeAssessment(toAssessment(s));
  return <details className="mobile-summary no-print"><summary>Working estimate · {formatCurrency(Math.abs(r.netAnnualConservative), s.currency)} annual {r.netAnnualConservative >= 0 ? 'reduction' : 'increase'}</summary><Ledger /></details>;
}

export function StepFooter({ onNext, nextLabel = 'Continue', nextDisabled, children }: { onNext?: () => void; nextLabel?: string; nextDisabled?: boolean; children?: ReactNode }) {
  const s = useAssessment();
  const current = STAGES.findIndex(x => x.id === (s.step === 'catalog' ? 'quick' : s.step));
  return <div className="step-footer no-print"><div>{current > 0 && <Button variant="ghost" onClick={() => s.setStep(STAGES[current - 1].id)}><ArrowLeft />Back</Button>}</div><div className="button-row">{children}<Button disabled={nextDisabled} onClick={onNext ?? (() => s.setStep(STAGES[Math.min(current + 1, STAGES.length - 1)].id))}>{nextLabel}<ArrowRight /></Button></div></div>;
}

export function StepContainer({ children }: { children: ReactNode }) { return <>{children}</>; }
