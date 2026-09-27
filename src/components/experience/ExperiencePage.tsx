import { lazy, Suspense, useEffect, useReducer, useRef, useState, type Dispatch } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, BookmarkCheck, BookOpen, Check, CircleHelp, House, Play, ShieldCheck } from 'lucide-react';
import { useAssessment } from '@/store/useAssessment';
import { EXPERIENCE_MISSIONS, getExperienceMission } from '@/data/experience/missions';
import { getRolePath } from '@/data/experience/roles';
import { WORKPLACE } from '@/data/experience/fixtures';
import type { Coverage } from '@/data/categories';
import type { ExperienceAction, ExperienceState, MissionInput, MissionOutcome } from '@/data/experience/types';
import { countDiscoveries, createExperienceState, experienceReducer, getCurrentSnapshot } from '@/lib/experienceEngine';
import { evaluateExperience } from '@/lib/experienceEvaluation';
import { clearExperienceProgress, loadExperienceProgress, saveExperienceProgress } from '@/store/experienceProgress';
import { WorkplaceScene } from './WorkplaceScene';
import { CaseSelector, ReplayControls, RolePaths, RunSuiteSelect, SuiteSwitch, SUITE_LABELS } from './ExperienceControls';
import { MissionDebrief } from './MissionDebrief';
import { CapabilityIndex } from './CapabilityIndex';
import { CapabilityPassport } from './CapabilityPassport';
import './experience.css';

const BriefActivity = lazy(() => import('./activities/ProductivityActivities').then(module => ({ default: module.BriefActivity })));
const InsightsActivity = lazy(() => import('./activities/ProductivityActivities').then(module => ({ default: module.InsightsActivity })));
const CallingActivity = lazy(() => import('./activities/ProductivityActivities').then(module => ({ default: module.CallingActivity })));
const DeviceActivity = lazy(() => import('./activities/ItAccessActivities').then(module => ({ default: module.DeviceActivity })));
const AccessActivity = lazy(() => import('./activities/ItAccessActivities').then(module => ({ default: module.AccessActivity })));
const IncidentActivity = lazy(() => import('./activities/ProtectionActivities').then(module => ({ default: module.IncidentActivity })));
const SharingActivity = lazy(() => import('./activities/ProtectionActivities').then(module => ({ default: module.SharingActivity })));
const AgentActivity = lazy(() => import('./activities/ProtectionActivities').then(module => ({ default: module.AgentActivity })));

const LAB_STORAGE = {
  getItem: (key: string) => window.localStorage.getItem(key),
  setItem: (key: string, value: string) => window.localStorage.setItem(key, value),
  removeItem: (key: string) => window.localStorage.removeItem(key),
};
const CONTRACT = '<!-- THESIS: The same workplace, the same task, a different suite; not a feature checklist. OWN-WORLD: Warm paper and charcoal, rose controls, Segoe UI, an authored SVG workplace. STORY: Enter a space, manipulate real sample artifacts, compare O365 E3 and E7, keep a qualified takeaway. FIRST VIEWPORT: A living workplace and a visible first task, with a persistent suite switch; no compulsory onboarding. FORM: Explorable workplace, candidate 4, resumable-index staging, seed ee3bdc69. -->';
const OUTCOME_LABELS: Record<MissionOutcome['status'], string> = {
  ready: 'Ready to try', success: 'Sample task completed', review: 'Human review needed',
  blocked: 'A boundary held', 'needs-setup': 'A prerequisite is missing', separate: 'A separate offering is needed',
};

function Activity({ input, state, dispatch }: { input: MissionInput; state: ExperienceState; dispatch: Dispatch<ExperienceAction> }) {
  const common = { suite: state.suite, variant: state.missions[state.missionId].variant };
  const onChange = (next: MissionInput) => dispatch({ type: 'edit', input: next });
  switch (input.kind) {
    case 'brief': return <BriefActivity {...common} input={input} onChange={onChange} />;
    case 'device': return <DeviceActivity {...common} input={input} onChange={onChange} />;
    case 'access': return <AccessActivity {...common} input={input} onChange={onChange} />;
    case 'incident': return <IncidentActivity {...common} input={input} onChange={onChange} />;
    case 'sharing': return <SharingActivity {...common} input={input} onChange={onChange} />;
    case 'agent': return <AgentActivity {...common} input={input} onChange={onChange} />;
    case 'insights': return <InsightsActivity {...common} input={input} onChange={onChange} />;
    case 'calling': return <CallingActivity {...common} input={input} onChange={onChange} />;
  }
}

function Outcome({ outcome, onCompare }: { outcome: MissionOutcome; onCompare: () => void }) {
  return <section className="lab-outcome" aria-labelledby="lab-outcome-title" data-outcome={outcome.status}>
    <span className="lab-outcome-status">{outcome.status === 'success' ? <Check aria-hidden="true" /> : <CircleHelp aria-hidden="true" />}{OUTCOME_LABELS[outcome.status]}</span>
    <h2 id="lab-outcome-title" tabIndex={-1}>{outcome.title}</h2><p>{outcome.summary}</p>
    <ul>{outcome.explanation.map(line => <li key={line}>{line}</li>)}</ul>
    {outcome.facts && <dl>{outcome.facts.map(fact => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>}
    <p className="lab-next-action"><strong>Try next.</strong> {outcome.nextAction}</p>
    <button type="button" className="lab-button" onClick={onCompare}>Compare both workflows<ArrowRight aria-hidden="true" /></button>
    <button type="button" className="lab-button lab-adjust-setup" onClick={() => {
      const activity = document.getElementById('lab-mission-activity');
      activity?.scrollIntoView({ block: 'start', behavior: 'instant' });
      activity?.focus({ preventScroll: true });
    }}>Back to your setup<ArrowLeft aria-hidden="true" /></button>
  </section>;
}

export function ExperiencePage() {
  const [restored] = useState(() => typeof window === 'undefined'
    ? { state: createExperienceState(), warning: null, blocked: false }
    : loadExperienceProgress(LAB_STORAGE));
  const [state, dispatch] = useReducer(experienceReducer, restored.state);
  const [storageWarning, setStorageWarning] = useState<string | null>(restored.warning);
  const [storageBlocked, setStorageBlocked] = useState(restored.blocked);
  const [recoveryRequired, setRecoveryRequired] = useState(restored.blocked);
  const [catalogCoverage, setCatalogCoverage] = useState<Coverage | 'all'>('all');
  const headingRef = useRef<HTMLHeadingElement>(null);
  const debriefRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const theme = useAssessment(store => store.theme);
  const mission = getExperienceMission(state.missionId);
  const progress = state.missions[state.missionId];
  const snapshot = getCurrentSnapshot(state);
  const outcome = state.screen === 'mission' && snapshot.attempted ? evaluateExperience(snapshot.input, state.suite, progress.variant) : null;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Experience E7 | The living workplace';
    return () => { document.title = previousTitle; };
  }, []);

  useEffect(() => {
    if (storageBlocked) return;
    const warning = saveExperienceProgress(LAB_STORAGE, state);
    setStorageWarning(warning);
    if (warning) setStorageBlocked(true);
  }, [state, storageBlocked]);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [state.screen, state.missionId]);

  const resetLab = () => {
    if (!window.confirm('Clear only your capability lab progress and start fresh? Your assessment and technical map will not change.')) return;
    const warning = clearExperienceProgress(LAB_STORAGE);
    setStorageWarning(warning);
    if (warning) return;
    setRecoveryRequired(false);
    setStorageBlocked(false);
    dispatch({ type: 'reset' });
  };
  const compare = () => {
    dispatch({ type: 'compare' });
    requestAnimationFrame(() => {
      debriefRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' });
      debriefRef.current?.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
    });
  };
  const runMobile = () => {
    dispatch({ type: 'attempt' });
    requestAnimationFrame(() => {
      document.querySelector('.lab-outcome')?.scrollIntoView({ block: 'start', behavior: 'instant' });
      document.getElementById('lab-outcome-title')?.focus({ preventScroll: true });
    });
  };
  const nextMission = () => {
    const path = getRolePath(state.role).missions;
    const next = path.find(id => id !== state.missionId && !state.missions[id].discovered)
      ?? EXPERIENCE_MISSIONS.find(item => item.id !== state.missionId && !state.missions[item.id].discovered)?.id;
    if (next) dispatch({ type: 'enter', id: next });
    else dispatch({ type: 'screen', screen: 'passport' });
  };
  const openCatalog = (coverage: Coverage | 'all' = 'all') => {
    setCatalogCoverage(coverage);
    dispatch({ type: 'screen', screen: 'catalog' });
  };
  const titles = { workplace: 'A workplace you can play with.', mission: mission.title, catalog: 'Find your next possibility.', passport: 'Keep the discoveries. Not the jargon.' };
  const subtitles = {
    workplace: 'Pick a space. Make a choice. Rewind it with Office 365 E3 or Microsoft 365 E7.',
    mission: mission.intro,
    catalog: 'What you already have, what E7 adds, and what still needs its own plan.',
    passport: 'Each takeaway comes from something you tried and a comparison you explored.',
  };

  return <div className="experience-page" data-screen={state.screen} data-mission={state.missionId} data-suite={state.suite} data-case={progress.variant}>
    <div hidden dangerouslySetInnerHTML={{ __html: CONTRACT }} />
    <nav className="lab-top-nav" aria-label="Capability lab">
      <button type="button" aria-current={state.screen === 'workplace' || state.screen === 'mission' ? 'page' : undefined} onClick={() => dispatch({ type: 'screen', screen: 'workplace' })}><House aria-hidden="true" />Workplace</button>
      <button type="button" aria-current={state.screen === 'catalog' ? 'page' : undefined} onClick={() => openCatalog()}><BookOpen aria-hidden="true" />Capabilities</button>
      <button type="button" aria-label="My discoveries" aria-current={state.screen === 'passport' ? 'page' : undefined} onClick={() => dispatch({ type: 'screen', screen: 'passport' })}><BookmarkCheck aria-hidden="true" />Discoveries<span className="lab-nav-count">{countDiscoveries(state)}/{EXPERIENCE_MISSIONS.length}</span></button>
    </nav>
    {storageWarning && <div className="lab-storage-warning" role="alert"><p>{storageWarning}</p><button type="button" className="lab-button" onClick={recoveryRequired ? resetLab : () => setStorageBlocked(false)}>{recoveryRequired ? 'Start a fresh lab workspace' : 'Try saving progress again'}</button></div>}
    <header className="lab-page-heading"><div>
      {state.screen === 'mission' && <button type="button" className="lab-button lab-button-quiet lab-back" onClick={() => dispatch({ type: 'screen', screen: 'workplace' })}><ArrowLeft aria-hidden="true" />Back to the workplace</button>}
      <h1 ref={headingRef} tabIndex={-1}>{titles[state.screen]}</h1><p>{subtitles[state.screen]}</p>
    </div>{(state.screen === 'workplace' || state.screen === 'mission') && <SuiteSwitch suite={state.suite} onChange={suite => dispatch({ type: 'suite', suite })} />}</header>
    <p className="lab-disclaimer">{WORKPLACE.disclaimer} No AI runs behind these examples.</p>
    <motion.div key={`${state.screen}-${state.screen === 'mission' ? state.missionId : ''}`}
      initial={state.screen === 'mission' && !reducedMotion ? { opacity: .85, clipPath: 'inset(0% 0% 5% 0% round 16px)' } : false}
      animate={{ opacity: 1, clipPath: 'inset(0% 0% 0% 0% round 0px)' }}
      transition={{ duration: reducedMotion ? 0 : .28, ease: [.16, 1, .3, 1] }}>
      {state.screen === 'workplace' && <>
        <RolePaths role={state.role} onChange={role => dispatch({ type: 'role', role })} />
        <WorkplaceScene missions={EXPERIENCE_MISSIONS} state={state} onEnter={id => dispatch({ type: 'enter', id })} />
        <div className="lab-story-footer"><p><strong>No perfect score to chase.</strong> A blocked request can be the right result. Discover the capability, the setup it needs, and the things a licence alone cannot fix.</p><button type="button" className="lab-button" onClick={() => openCatalog('not-covered')}>What stays separate?<ArrowRight aria-hidden="true" /></button></div>
      </>}
      {state.screen === 'mission' && <>
        <CaseSelector mission={mission} state={state} dispatch={dispatch} />
        <div className="lab-mobile-task"><RunSuiteSelect id="lab-mobile-suite" suite={state.suite} onChange={suite => dispatch({ type: 'suite', suite })} /><button type="button" className="lab-button lab-button-primary" onClick={runMobile}><Play aria-hidden="true" />Try this setup</button></div>
        <div className="lab-mission-layout">
          <div id="lab-mission-activity" className="lab-mission-stage" tabIndex={-1}><Suspense fallback={<div className="lab-activity" role="status">Opening the sample workbench...</div>}><Activity input={snapshot.input} state={state} dispatch={dispatch} /></Suspense>
            <ReplayControls state={state} dispatch={dispatch} onReset={() => { if (window.confirm('Restart both suite runs for this mission and clear its discovery? Other spaces and your assessment stay unchanged.')) dispatch({ type: 'reset-mission' }); }} />
          </div>
          <aside className="lab-mission-sidebar" aria-label="Your mission and sample outcome">
            <div className="lab-objective"><h2>Your task</h2><p>{mission.objective}</p><small>{mission.product}</small></div>
            <RunSuiteSelect id="lab-sidebar-suite" suite={state.suite} onChange={suite => dispatch({ type: 'suite', suite })} />
            <button type="button" className="lab-button lab-button-primary lab-attempt" onClick={() => dispatch({ type: 'attempt' })}><Play aria-hidden="true" />Try this setup</button>
            <p className="lab-attempt-note">{SUITE_LABELS[state.suite]} suite-only example. This runs a prepared local scenario, not a Microsoft service.</p>
            {outcome && <Outcome outcome={outcome} onCompare={compare} />}
          </aside>
        </div>
        {progress.compared && snapshot.attempted && <div ref={debriefRef}><MissionDebrief mission={mission} progress={progress}
          onDiscover={() => dispatch({ type: 'discover' })} onCatalog={() => openCatalog()} onNext={nextMission} /></div>}
      </>}
      {state.screen === 'catalog' && <CapabilityIndex key={catalogCoverage} initialCoverage={catalogCoverage} onMission={id => dispatch({ type: 'enter', id })} />}
      {state.screen === 'passport' && <CapabilityPassport state={state} onMission={id => dispatch({ type: 'enter', id })} />}
    </motion.div>
    <div className="lab-save-line"><span><ShieldCheck aria-hidden="true" /> {storageBlocked ? 'Progress is only available for this visit until saving is restored.' : 'Lab progress is saved in this browser, separately from your assessment. Browser storage can be cleared.'}</span><button type="button" onClick={resetLab}>Reset only the lab</button></div>
    <div className="lab-announcement" role="status" aria-live="polite" aria-atomic="true">{state.message}{outcome ? ` ${outcome.title}. ${outcome.summary}` : ''}</div>
  </div>;
}
