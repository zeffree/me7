import { Download } from 'lucide-react';
import { useAssessment, toAssessment } from '@/store/useAssessment';
import { exportInputRecovery } from '@/lib/export';
import { Button, SectionHeading } from '@/components/ui/Primitives';

export function LegacyCurrencyNotice({ onStart }: { onStart: () => void }) {
  const state = useAssessment();
  return <section className="audit-page">
    <SectionHeading title={`Your saved ${state.currency} inputs are safe.`} description="This assessment now works in USD only. Your original numbers have not been converted or relabeled, and the saved assessment has not been discarded." />
    <p>Download the original inputs before starting a new USD assessment. No calculation is shown here because applying USD references to these amounts could produce a misleading comparison.</p>
    <div className="button-row section-block">
      <Button variant="secondary" onClick={() => {
        try {
          exportInputRecovery(toAssessment(state));
          state.setFlash('Recovery download requested. Check your browser downloads before clearing the original assessment.');
        } catch (error) {
          state.setFlash(`Recovery download failed: ${error instanceof Error ? error.message : 'the browser could not create the file'}. Your saved assessment is unchanged.`);
        }
      }}><Download />Download original {state.currency} inputs</Button>
      <Button onClick={() => {
        if (window.confirm(`Clear the saved ${state.currency} assessment and start a new USD assessment? Download your original inputs first if you want to keep them.`)) {
          state.reset();
          useAssessment.getState().start();
          onStart();
        }
      }}>Start a new USD assessment</Button>
    </div>
    {state.flash && <p role="status" className="note section-block">{state.flash}</p>}
  </section>;
}
