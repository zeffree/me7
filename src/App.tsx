import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { FlaskConical } from 'lucide-react';
import { AppShell, Stepper, CostRail, MobileSummary } from '@/components/layout/AppShell';
import { Landing } from '@/components/steps/Landing';
import { ProfileStep } from '@/components/steps/ProfileStep';
import { CatalogStep } from '@/components/steps/CatalogStep';
import { AddOnsStep } from '@/components/steps/AddOnsStep';
import { AssumptionsStep } from '@/components/steps/AssumptionsStep';
import { ResultsStep } from '@/components/steps/ResultsStep';
import { LegacyCurrencyNotice } from '@/components/steps/LegacyCurrencyNotice';
import { ExperienceBoundary } from '@/components/experience/ExperienceBoundary';
import { useAssessment } from '@/store/useAssessment';
import { loadSharedAssessment } from '@/components/layout/loadSharedAssessment';
import { APP_ROUTES, readAppRoute, type AppPage } from '@/components/layout/appRoute';

const STEPS = { profile: ProfileStep, quick: CatalogStep, catalog: CatalogStep, addons: AddOnsStep, assumptions: AssumptionsStep, results: ResultsStep } as const;
const AuditPage = lazy(() => import('@/components/audit/AuditPage').then(module => ({ default: module.AuditPage })));
const ArchitecturePage = lazy(() => import('@/components/architecture/ArchitecturePage').then(module => ({ default: module.ArchitecturePage })));
const ExperiencePage = lazy(() => import('@/components/experience/ExperiencePage').then(module => ({ default: module.ExperiencePage })));
const CONTRACT = '<!-- THESIS: A decision folio, not a savings pitch. OWN-WORLD: Cool white working sheets, slate financial ledger, cobalt controls, yellow evidence notes, Public Sans. STORY: Capture invoices, test cancellation assumptions, compare cash, inspect evidence. FIRST VIEWPORT: The task and start action at left; a worked current/future folio at right; no unqualified savings claim. FORM: Procurement comparison docket, grounded candidate 4, fixed folio index and focused working sheet; seed 3f9ecc77. -->';

export default function App() {
  const { started, step, theme, flash, setFlash, currency } = useAssessment();
  const isDemo = useAssessment(s => 'isDemo' in s && s.isDemo === true);
  const [home, setHome] = useState(false);
  const [page, setPage] = useState<AppPage>(() => readAppRoute(window.location.hash) ?? 'assessment');
  const lastLocationRead = useRef<string | null>(null);
  const previousPage = useRef(page);
  const isLanding = home || !started;

  useEffect(() => {
    const openShared = () => {
      // A history traversal may emit both popstate and hashchange. Never ask twice.
      if (lastLocationRead.current === window.location.href) return;
      lastLocationRead.current = window.location.href;
      const nextPage = readAppRoute(window.location.hash);
      if (nextPage === 'audit' || nextPage === 'architecture' || nextPage === 'experience') {
        setPage(nextPage);
        return;
      }
      if (nextPage) setPage(nextPage);
      if (loadSharedAssessment()) {
        setHome(false);
        setPage('assessment');
      }
      lastLocationRead.current = window.location.href;
    };
    openShared();
    window.addEventListener('hashchange', openShared);
    window.addEventListener('popstate', openShared);
    return () => {
      window.removeEventListener('hashchange', openShared);
      window.removeEventListener('popstate', openShared);
    };
  }, []);

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('scoutTheme');
    const current = useAssessment.getState();
    if ((requested === 'light' || requested === 'dark') && current.theme !== requested) current.toggleTheme();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const returningToAssessment = previousPage.current !== page && page === 'assessment';
    previousPage.current = page;
    // Lazy reference pages focus their heading on mount, after their content is ready.
    if (page === 'assessment' && (!isLanding || returningToAssessment)) {
      document.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [step, isLanding, page]);

  const Step = STEPS[step];
  const resumeAssessment = () => {
    setHome(false);
    setPage('assessment');
    window.location.hash = APP_ROUTES.assessment.href;
  };
  return <AppShell page={page} onAssessment={resumeAssessment} onHome={() => {
    setHome(true);
    setPage('assessment');
    if (page !== 'assessment') window.location.hash = APP_ROUTES.assessment.href;
  }}>
    <div hidden dangerouslySetInnerHTML={{ __html: CONTRACT }} />
    {page === 'experience' ? <ExperienceBoundary><Suspense fallback={<p className="audit-page" role="status">Opening the E7 workplace...</p>}><ExperiencePage /></Suspense></ExperienceBoundary> : page === 'architecture' ? <Suspense fallback={<p className="audit-page" role="status">Loading E7 in action...</p>}><ArchitecturePage onBack={resumeAssessment} /></Suspense> : page === 'audit' ? <Suspense fallback={<p className="audit-page" role="status">Loading audit reference...</p>}><AuditPage onBack={() => { window.location.hash = APP_ROUTES.assessment.href; }} /></Suspense> : currency !== 'USD' ? <LegacyCurrencyNotice onStart={() => setHome(false)} /> : isLanding ? <>{flash && <div className="flash no-print" role="status"><span>{flash}</span><button onClick={() => setFlash(null)}>Dismiss</button></div>}<Landing onResume={() => setHome(false)} /></> : <>
      <Stepper />
      <div className={`workspace ${step === 'results' ? 'results-workspace' : ''}`}>
        {step !== 'results' && <MobileSummary />}
        <div className={step === 'results' ? '' : 'working-paper'}>
          {isDemo && <div className="demo-banner note note-warning"><FlaskConical aria-hidden="true" /><p><strong>Example mode.</strong> Synthetic USD inputs, not vendor quotes or a forecast.</p></div>}
          {flash && <div className="flash no-print" role="status"><span>{flash}</span><button onClick={() => setFlash(null)}>Dismiss</button></div>}
          <Step />
        </div>
        {step !== 'results' && <CostRail />}
      </div>
    </>}
  </AppShell>;
}
