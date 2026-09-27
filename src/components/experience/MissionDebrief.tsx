import { ArrowRight, BookmarkCheck, ExternalLink } from 'lucide-react';
import { getSource } from '@/data/sources';
import type { ExperienceMission, MissionProgress } from '@/data/experience/types';
import { hasMissionInteraction } from '@/lib/experienceEngine';

export function MissionDebrief({ mission, progress, onDiscover, onCatalog, onNext }: {
  mission: ExperienceMission; progress: MissionProgress; onDiscover: () => void; onCatalog: () => void; onNext: () => void;
}) {
  const sources = mission.sourceIds.flatMap(id => {
    const source = getSource(id);
    return source?.url ? [source] : [];
  });
  return <section className="lab-debrief" aria-labelledby="lab-debrief-title">
    <div className="lab-section-title"><h2 id="lab-debrief-title" tabIndex={-1}>What actually changed?</h2><span>Compare the capability, not just this outcome.</span></div>
    <div className="lab-comparison">
      <section><h3>Already possible with O365 E3</h3><p>{mission.comparison.o365e3}</p></section>
      <section><h3>The E7 difference</h3><p>{mission.comparison.m365e7}</p></section>
    </div>
    <div className="lab-reality">
      <div><h3>Still needs setting up</h3><ul>{mission.prerequisites.map(item => <li key={item}>{item}</li>)}</ul></div>
      <div><h3>Not a magic licence</h3><p>{mission.boundary}</p></div>
    </div>
    <p className="lab-takeaway"><BookmarkCheck aria-hidden="true" /><span><strong>Take this with you.</strong> {mission.takeaway}</span></p>
    <div className="lab-debrief-actions">
      <button type="button" className="lab-button lab-button-primary" disabled={progress.discovered || !hasMissionInteraction(progress)} onClick={onDiscover}>
        <BookmarkCheck aria-hidden="true" />{progress.discovered ? 'Discovery collected' : 'Keep this discovery'}
      </button>
      <button type="button" className="lab-button" onClick={onNext}>Try another space<ArrowRight aria-hidden="true" /></button>
      {!hasMissionInteraction(progress) && <p>Make a choice in the scene to collect this discovery.</p>}
    </div>
    <div className="lab-further">
      <button type="button" onClick={onCatalog}>Explore the capability index</button>
      <a href="#architecture">See the technical map</a><a href="#assessment">Explore the cost assessment</a>
    </div>
    <details className="lab-source-links"><summary>Sources behind this example</summary>
      <ul>{sources.map(source => <li key={source.id}><a href={source.url ?? undefined} target="_blank" rel="noreferrer">{source.title}<ExternalLink aria-hidden="true" /></a></li>)}</ul>
      <p>These sources describe particular capabilities, not a guarantee about your tenant. <a href="#audit">Full source and applicability reference</a>.</p>
    </details>
  </section>;
}
