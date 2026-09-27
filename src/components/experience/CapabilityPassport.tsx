import { ArrowRight, BookmarkCheck } from 'lucide-react';
import { EXPERIENCE_MISSIONS } from '@/data/experience/missions';
import type { ExperienceState, MissionId } from '@/data/experience/types';
import { countDiscoveries, getMissionStatus } from '@/lib/experienceEngine';
import { RoomArt } from './WorkplaceScene';
import { IllustrationBoundary } from './ExperienceBoundary';

export function CapabilityPassport({ state, onMission }: { state: ExperienceState; onMission: (id: MissionId) => void }) {
  return <section aria-label="Your capability passport">
    <p><strong>{countDiscoveries(state)} of {EXPERIENCE_MISSIONS.length} discoveries collected.</strong> A record of what you explored, not a certification or a readiness score.</p>
    <ol className="lab-passport-list">{EXPERIENCE_MISSIONS.map(mission => {
      const progress = state.missions[mission.id];
      const status = getMissionStatus(progress);
      return <li key={mission.id}>
        <IllustrationBoundary><RoomArt id={mission.id} /></IllustrationBoundary>
        <div><h2>{mission.title}</h2><p>{progress.discovered ? mission.takeaway : mission.objective}</p>
          <span className="lab-passport-status">{progress.discovered ? <><BookmarkCheck aria-hidden="true" />Discovery collected</> : status === 'in-progress' ? 'Your scene is waiting. Compare both suites to collect the takeaway.' : 'Ready whenever you are.'}</span>
        </div>
        <button type="button" className="lab-button" onClick={() => onMission(mission.id)}>{progress.discovered ? 'Revisit' : status === 'in-progress' ? 'Resume' : 'Step inside'}<ArrowRight aria-hidden="true" /></button>
      </li>;
    })}</ol>
  </section>;
}
