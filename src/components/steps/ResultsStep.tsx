import { useEffect, useState } from 'react';
import { Download, FileSpreadsheet, Link2, Printer } from 'lucide-react';
import { useAssessment, toAssessment } from '@/store/useAssessment';
import { computeAssessment } from '@/model/engine';
import { computeTei } from '@/model/tei';
import { CATEGORIES } from '@/data/categories';
import { getBaseline } from '@/data/skus';
import { buildShareUrl } from '@/store/share';
import { copyToClipboard, exportCsv, exportJson, printBusinessCase } from '@/lib/export';
import { SectionHeading, Button } from '@/components/ui/Primitives';
import { Toggle } from '@/components/ui/Fields';
import { ImportButton } from '@/components/ui/ImportButton';
import { Headline } from '@/components/results/Headline';
import { TcoChart } from '@/components/results/TcoChart';
import { LineDetail } from '@/components/results/Breakdown';
import { CostAvoidancePanel } from '@/components/results/CostAvoidance';
import { TeiPanel } from '@/components/results/TeiPanel';
import { SellerWorkspace } from '@/components/results/SellerWorkspace';
import { answeredCategoryCount } from '@/components/catalog/inventory';

export function ResultsStep() {
  const s = useAssessment();
  const [message, setMessage] = useState('');
  const [includePresenter, setIncludePresenter] = useState(false);
  useEffect(() => {
    document.body.classList.toggle('include-presenter-print', includePresenter && s.sellerMode);
    return () => document.body.classList.remove('include-presenter-print');
  }, [includePresenter, s.sellerMode]);
  useEffect(() => {
    let openedForPrint: HTMLDetailsElement[] = [];
    const before = () => {
      openedForPrint = [...document.querySelectorAll<HTMLDetailsElement>('details.print-expand:not([open])')];
      openedForPrint.forEach(detail => { detail.open = true; });
    };
    const after = () => { openedForPrint.forEach(detail => { detail.open = false; }); openedForPrint = []; };
    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint', after);
    return () => { window.removeEventListener('beforeprint', before); window.removeEventListener('afterprint', after); };
  }, []);
  const a = toAssessment(s);
  const r = computeAssessment(a);
  const tei = computeTei(a, r);
  const answered = answeredCategoryCount(s.lines, s.dismissed);
  const exportAction = (action: () => void) => {
    try { action(); setMessage('Download requested. Check your browser downloads to confirm the file was saved.'); }
    catch { setMessage('The download could not be created. Try again, or print this case to keep a copy.'); }
  };
  const print = () => {
    printBusinessCase();
  };
  return <div className="results-page">
    <div className="results-title"><SectionHeading title={`${s.orgName || 'Your organization'}: the working business case.`}
      description={`${s.seats.toLocaleString()} seats · ${getBaseline(s.baseline).name} → Microsoft 365 E7 · ${s.currency}`} /></div>
    <details className="scope-note note note-warning print-expand" style={{ marginBottom: 22 }}><summary><strong>Provisional · {answered} of {CATEGORIES.length} spend categories answered</strong><span>{s.addOnsReviewed ? 'Add-on inventory reviewed' : 'Add-on review incomplete'}</span></summary>
      <p style={{ marginTop: 14 }}>USD comparison with full replacement assumed for eligible covered invoices. Missing inputs can materially change this comparison. These are estimates from entered items, not a complete statement of organization spend.</p><Button variant="ghost" size="sm" onClick={() => s.setStep('assumptions')}>Review assumptions</Button>
    </details>
    <Headline result={r} currency={s.currency} />
    <TcoChart result={r} currency={s.currency} />
    <LineDetail result={r} currency={s.currency} />
    <CostAvoidancePanel result={r} currency={s.currency} />
    <TeiPanel tei={tei} currency={s.currency} />
    {s.sellerMode && <SellerWorkspace result={r} />}
    <section className="output-bar no-print">
      <h2>Keep the working</h2>
      <p style={{ margin: '10px 0 20px' }}>JSON preserves editable inputs. CSV contains the calculation detail. Shared links contain sensitive assessment data; send them only to intended recipients.</p>
      <div className="button-row">
        <Button variant="secondary" onClick={() => exportAction(() => exportJson(a, r, tei))}><Download />Save JSON</Button>
        <Button variant="secondary" onClick={() => exportAction(() => exportCsv(a, r, tei))}><FileSpreadsheet />Export CSV</Button>
        <Button variant="secondary" onClick={async () => {
          try { setMessage(await copyToClipboard(buildShareUrl(a)) ? 'Share link copied. Anyone with the link can read these inputs; it is not encrypted.' : 'Copy failed. Your assessment is unchanged. Use JSON export instead.'); }
          catch { setMessage('Could not create a share link. Use JSON export instead.'); }
        }}><Link2 />Copy share link</Button>
        <Button onClick={print}><Printer />Print business case</Button>
        <ImportButton label="Restore JSON" />
      </div>
      {s.sellerMode && <Toggle checked={includePresenter} onChange={setIncludePresenter} label="Include presenter content in print" description="Off by default. This does not make the presenter content confidential." />}
      {message && <p role="status" className="note" style={{ marginTop: 18 }}>{message}</p>}
      <p>New share payloads use the URL fragment; app calculations run locally. Browsers, extensions, recipients and any copied link can still expose the contents. Legacy query-based links may reach the host in request URLs.</p>
      <div className="button-row" style={{ marginTop: 22 }}><Button variant="ghost" onClick={() => s.setStep('assumptions')}>Edit assumptions</Button><Button variant="ghost" onClick={() => s.setStep('catalog')}>Add more spend</Button></div>
    </section>
  </div>;
}
