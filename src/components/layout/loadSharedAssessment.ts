import { assessmentInputErrors, useAssessment } from '@/store/useAssessment';
import { clearShareParam, hasShareParam, readShareParam } from '@/store/share';

export function loadSharedAssessment(): boolean {
  if (!hasShareParam()) return false;
  const current = useAssessment.getState();
  const shared = readShareParam();
  if (!shared) {
    current.setFlash('This shared assessment link is invalid or incomplete. Your current assessment was not replaced. Ask the sender for a new link or restore a JSON export.');
    clearShareParam();
    return false;
  }
  const errors = assessmentInputErrors(shared);
  if (errors.length) {
    current.setFlash(`The shared assessment could not be loaded. Your current assessment was not replaced. ${errors.join(' ')}`);
    clearShareParam();
    return false;
  }
  if (current.started && !window.confirm('Open this shared assessment? It will replace the assessment in this browser. Export your current work first if you need to keep it.')) {
    current.setFlash('Shared assessment not loaded. Your current assessment is unchanged. The link remains in the address bar if you choose to open it later.');
    return false;
  }
  const message = 'Shared assessment loaded. Review its prices, assumptions and completeness before relying on the result.';
  current.hydrate(shared, message);
  const loaded = useAssessment.getState();
  if (loaded.reviewWarnings?.length && !loaded.storageError) {
    loaded.setFlash(`${message} Review notes: ${loaded.reviewWarnings.join(' ')}`);
  }
  clearShareParam();
  return true;
}
