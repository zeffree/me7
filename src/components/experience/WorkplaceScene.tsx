import { ArrowUpRight, Check, Sparkles } from 'lucide-react';
import type { ExperienceMission, ExperienceState, MissionId } from '@/data/experience/types';
import { getRolePath } from '@/data/experience/roles';
import { getMissionStatus } from '@/lib/experienceEngine';
import { IllustrationBoundary } from './ExperienceBoundary';

const PLACES: Record<MissionId, { left: string; top: string }> = {
  brief: { left: '3%', top: '1%' },
  device: { left: '27%', top: '4%' },
  access: { left: '51%', top: '1%' },
  incident: { left: '75%', top: '4%' },
  sharing: { left: '3%', top: '53%' },
  agent: { left: '27%', top: '56%' },
  insights: { left: '51%', top: '53%' },
  calling: { left: '75%', top: '56%' },
};

function Desk({ monitor = true }: { monitor?: boolean }) {
  return <g>
    <path d="M38 87v35m108-56v34m-33 13v26" fill="none" stroke="var(--cp-border-strong)" strokeWidth="4" />
    <path d="m21 79 73-32 74 33-74 33Z" fill="var(--cp-surface)" stroke="var(--cp-border-strong)" strokeWidth="2" />
    {monitor && <g>
      <path d="M90 79v10l15 7" fill="none" stroke="var(--cp-text-muted)" strokeWidth="3" />
      <path d="m61 29 60 27v38L61 68Z" fill="var(--cp-bg-elevated)" stroke="var(--cp-text-muted)" strokeWidth="2.5" />
      <path d="m69 42 43 19m-43-9 30 14m-30-4 38 17" fill="none" stroke="var(--cp-accent)" strokeWidth="3" />
    </g>}
  </g>;
}

export function RoomArt({ id }: { id: MissionId }) {
  return <svg className="lab-room-art" viewBox="0 0 190 150" aria-hidden="true" focusable="false">
    <path d="m8 106 86-39 87 40-87 40Z" fill="var(--cp-surface-soft)" stroke="var(--cp-border)" />
    {id === 'brief' && <g><Desk /><path d="m37 80 22-10 27 12-22 10Z" fill="var(--cp-accent-soft)" stroke="var(--cp-accent)" /><path d="m137 99 20-9 17 8-20 9Z" fill="var(--cp-surface)" stroke="var(--cp-border-strong)" /><circle cx="151" cy="42" r="14" fill="var(--cp-accent-soft)" /><path d="M151 34v16m-8-8h16" stroke="var(--cp-accent)" strokeWidth="2.5" /></g>}
    {id === 'device' && <g><Desk monitor={false} /><path d="m67 31 49 22v41L67 72Z" fill="var(--cp-bg-elevated)" stroke="var(--cp-text-muted)" strokeWidth="2.5" /><path d="m66 73-20 9 49 23 22-11" fill="var(--cp-surface)" stroke="var(--cp-text-muted)" strokeWidth="2" /><path d="m82 62 7 7 13-11" fill="none" stroke="var(--cp-accent)" strokeWidth="4" /><path d="m133 62 16-7 14 6v32l-16 8-14-7Z" fill="var(--cp-accent-soft)" stroke="var(--cp-accent)" strokeWidth="2" /></g>}
    {id === 'access' && <g><path d="M52 110V29l46-20 43 21v81l-43 20Z" fill="var(--cp-surface)" stroke="var(--cp-border-strong)" strokeWidth="2" /><path d="M67 115V41l31-14 27 13v76" fill="var(--cp-bg-elevated)" stroke="var(--cp-border)" strokeWidth="2" /><path d="M98 27v104" stroke="var(--cp-border-strong)" strokeWidth="2" /><circle cx="113" cy="81" r="4" fill="var(--cp-accent)" /><path d="m29 84 17 8v28l-17-8Z" fill="var(--cp-accent-soft)" stroke="var(--cp-accent)" /><path d="M36 102v6" stroke="var(--cp-accent)" strokeWidth="3" /></g>}
    {id === 'incident' && <g><path d="m35 26 112 45v-7L35 19Z" fill="var(--cp-border)" /><path d="m35 26 112 45v53L35 79Z" fill="var(--cp-bg-elevated)" stroke="var(--cp-border-strong)" strokeWidth="2" /><path d="m54 49 17 7v13l-17-7Zm36 14 16 7v13l-16-7Zm34 26 12 5v12l-12-5Z" fill="var(--cp-accent-soft)" stroke="var(--cp-accent)" /><path d="m70 62 20 8m17 10 18 15" stroke="var(--cp-accent)" strokeWidth="2" /><path d="M48 89v31m91-9v25" stroke="var(--cp-border-strong)" strokeWidth="3" /><circle cx="51" cy="109" r="13" fill="var(--cp-surface)" stroke="var(--cp-text-muted)" strokeWidth="3" /><path d="m61 119 11 12" stroke="var(--cp-text-muted)" strokeWidth="5" /></g>}
    {id === 'sharing' && <g><path d="m39 38 58-26 55 25v84l-56 26-57-26Z" fill="var(--cp-surface)" stroke="var(--cp-border-strong)" strokeWidth="2" /><path d="M96 65v82m-57-26 57 26 56-26M39 38l57 27 56-28M39 67l57 26 56-27M39 95l57 26 56-27" fill="none" stroke="var(--cp-border)" strokeWidth="2" /><path d="m57 72 21 9m35 5 18-8m-73 23 19 9" stroke="var(--cp-accent)" strokeWidth="3" /><path d="m108 22 19 9v18c0 13-19 17-19 17s-18-18-18-30V14Z" fill="var(--cp-accent-soft)" stroke="var(--cp-accent)" strokeWidth="2" /><path d="m101 34 7 9 10-8" fill="none" stroke="var(--cp-accent)" strokeWidth="3" /></g>}
    {id === 'agent' && <g><Desk monitor={false} /><path d="M90 40V23m-5 0h10" stroke="var(--cp-accent)" strokeWidth="3" /><path d="m67 41 24-11 27 12v32L93 86 67 73Z" fill="var(--cp-surface)" stroke="var(--cp-accent)" strokeWidth="2.5" /><path d="m80 52 10 5 16-7v13L91 70l-11-5Z" fill="var(--cp-accent-soft)" /><circle cx="87" cy="59" r="2.5" fill="var(--cp-accent)" /><circle cx="102" cy="57" r="2.5" fill="var(--cp-accent)" /><path d="m57 87-15 7m88-3 18 8" stroke="var(--cp-text-muted)" strokeWidth="4" /><path d="m134 32 18-8 15 7v24l-16 8-17-8Z" fill="var(--cp-bg-elevated)" stroke="var(--cp-border-strong)" /><path d="m143 42 6 7 9-8" fill="none" stroke="var(--cp-accent)" strokeWidth="2.5" /></g>}
    {id === 'insights' && <g><path d="m33 23 123 54v53L33 77Z" fill="var(--cp-surface)" stroke="var(--cp-border-strong)" strokeWidth="2" /><path d="M46 71V50l14 6v21Zm27 12V43l15 7v40Zm30 12V67l15 7v28Zm28 12V82l13 6v25Z" fill="var(--cp-accent-soft)" stroke="var(--cp-accent)" strokeWidth="2" /><path d="M49 87v33m88-1v19" stroke="var(--cp-border-strong)" strokeWidth="3" /><path d="m59 119 24-11 30 13-25 11Z" fill="var(--cp-surface)" stroke="var(--cp-border-strong)" /></g>}
    {id === 'calling' && <g><path d="m25 82 67-30 74 34-71 33Z" fill="var(--cp-surface)" stroke="var(--cp-border-strong)" strokeWidth="2" /><path d="M39 91v34m113-31v32m-56-7v24" stroke="var(--cp-border-strong)" strokeWidth="4" /><path d="m69 57 40 19-8 19-39-18Z" fill="var(--cp-bg-elevated)" stroke="var(--cp-text-muted)" strokeWidth="2" /><path d="m72 65 8 11 10 5 10-3" fill="none" stroke="var(--cp-accent)" strokeWidth="5" strokeLinecap="round" /><path d="M132 53c10 2 15 10 14 18m-11-27c16 4 23 16 20 29" fill="none" stroke="var(--cp-accent)" strokeWidth="2.5" /><path d="m22 47 34 15V36L22 21Z" fill="var(--cp-accent-soft)" stroke="var(--cp-accent)" strokeWidth="2" /></g>}
  </svg>;
}

export function WorkplaceScene({ missions, state, onEnter }: {
  missions: readonly ExperienceMission[]; state: ExperienceState; onEnter: (id: MissionId) => void;
}) {
  const path = getRolePath(state.role);
  const recommended = path.missions.find(id => !state.missions[id].discovered) ?? path.missions[0];
  return <section className="lab-workplace" aria-labelledby="lab-workplace-title">
    <div className="lab-workplace-heading"><h2 id="lab-workplace-title">The Northstar workplace</h2><span><Sparkles aria-hidden="true" />Eight spaces. Your own way through.</span></div>
    <div className="lab-spaces">
      <svg className="lab-floor" viewBox="0 0 1000 550" preserveAspectRatio="none" aria-hidden="true">
        <path d="M9 40 475 12 992 53v462l-471 25L9 500Z" fill="var(--cp-bg-elevated)" stroke="var(--cp-border)" strokeWidth="2" />
        <path d="m9 250 512 36 471-24v38l-471 25L9 287Z" fill="var(--cp-surface-soft)" />
        <path d="M247 28v225m251-239v257M745 33v241M248 305v211m252-192v215m245-230v218" stroke="var(--cp-border)" strokeWidth="2" />
        <path d="m20 45 17 1v174l-17-1Zm950 15 17 1v174l-17-1Zm-950 282 17 1v141l-17-1Z" fill="var(--cp-accent-soft)" />
      </svg>
      {missions.map(mission => {
        const status = getMissionStatus(state.missions[mission.id]);
        return <button key={mission.id} type="button" className={`lab-space ${recommended === mission.id ? 'lab-space-recommended' : ''}`}
          style={PLACES[mission.id]} onClick={() => onEnter(mission.id)}
          aria-label={`${status === 'untouched' ? 'Enter' : 'Resume'} ${mission.title}. ${status === 'discovered' ? 'Discovery collected.' : mission.room}`}>
          <IllustrationBoundary><RoomArt id={mission.id} /></IllustrationBoundary>
          <span className="lab-space-name">{mission.room}<ArrowUpRight aria-hidden="true" /></span>
          <span className="lab-space-task">{mission.shortTitle}</span>
          <span className="lab-space-status">{status === 'discovered' ? <><Check aria-hidden="true" />Discovered</> : recommended === mission.id ? <><Sparkles aria-hidden="true" />{status === 'untouched' ? 'Start here' : 'Pick up here'}</> : status === 'in-progress' ? 'Your scene is waiting' : 'Step inside'}</span>
        </button>;
      })}
    </div>
    <p className="lab-floor-note">A fictional office, not a network diagram. Every space has a task you can try.</p>
  </section>;
}
