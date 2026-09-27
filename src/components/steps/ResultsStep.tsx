import { useEffect, useState, type ReactNode } from 'react';
import { Download, FileSpreadsheet, Link2, Printer, Users, ArrowRight, Coins } from 'lucide-react';
import { useAssessment, toAssessment } from '@/store/useAssessment';
import { computeAssessment } from '@/model/engine';
import { computeTei } from '@/model/tei';
import { CATEGORIES } from '@/data/categories';
import { getBaseline } from '@/data/skus';
import { buildShareUrl } from '@/store/share';
import { copyToClipboard, exportCsv, exportJson, printBusinessCase } from '@/lib/export';
import { Button } from '@/components/ui/Primitives';
import { Toggle } from '@/components/ui/Fields';
import { ImportButton } from '@/components/ui/ImportButton';
import { Headline } from '@/components/results/Headline';
import { CostBridge } from '@/components/results/CostBridge';
import { StackSorter } from '@/components/results/StackSorter';
import { TcoChart } from '@/components/results/TcoChart';
import { LineDetail } from '@/components/results/Breakdown';
import { CostAvoidancePanel } from '@/components/results/CostAvoidance';
import { TeiPanel } from '@/components/results/TeiPanel';
import { SellerWorkspace } from '@/components/results/SellerWorkspace';
import { answeredCategoryCount } from '@/components/catalog/inventory';

function ActionCard({ icon, title, detail, onClick, primary }: { icon: ReactNode; title: string; detail: string; onClick: () => void; primary?: boolean }) {
  return <button type="button" className={`action-card${primary ? ' is-primary' : ''}`} onClick={onClick}>
    <span className="action-icon" aria-hidden="true">{icon}</span>
    <span className="action-copy"><strong>{title}</strong><small>{detail}</small></span>
  </button>;
}

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
  const baseline = getBaseline(s.baseline);
  const exportAction = (action: () => void) => {
    try { action(); setMessage('Download requested. Check your browser downloads to confirm the file was saved.'); }
    catch { setMessage('The download could not be created. Try again, or print this case to keep a copy.'); }
  };
  const share = async () => {
    try { setMessage(await copyToClipboard(buildShareUrl(a)) ? 'Share link copied. Anyone with the link can read these inputs; it is not encrypted.' : 'Copy failed. Your assessment is unchanged. Use JSON export instead.'); }
    catch { setMessage('Could not create a share link. Use JSON export instead.'); }
  };
  return <div className="results-page">
    <header className="results-title section-heading">
      <h1 tabIndex={-1}>{s.orgName || 'Your organization'}: the working business case.</h1>
      <ul className="title-chips" aria-label="Scenario">
        <li><Users aria-hidden="true" />{s.seats.toLocaleString()} seats</li>
        <li>{baseline.shortName}<ArrowRight aria-label="to" />Microsoft 365 E7</li>
        <li><Coins aria-hidden="true" />{s.currency}</li>
      </ul>
    </header>
    <details className="scope-note note note-warning print-expand" style={{ marginBottom: 22 }}><summary><strong>Provisional · {answered} of {CATEGORIES.length} spend categories answered</strong><span>{s.addOnsReviewed ? 'Add-on inventory reviewed' : 'Add-on review incomplete'}</span></summary>
      <p style={{ marginTop: 14 }}>USD comparison with full replacement assumed for eligible covered invoices. Missing inputs can materially change this comparison. These are estimates from entered items, not a complete statement of organization spend.</p><Button variant="ghost" size="sm" onClick={() => s.setStep('assumptions')}>Review assumptions</Button>
    </details>
    <Headline result={r} currency={s.currency} />
    <CostBridge result={r} currency={s.currency} />
    <StackSorter result={r} currency={s.currency} />
    <TcoChart result={r} currency={s.currency} />
    <LineDetail result={r} currency={s.currency} />
    <CostAvoidancePanel result={r} currency={s.currency} />
    <TeiPanel tei={tei} currency={s.currency} />
    {s.sellerMode && <SellerWorkspace result={r} />}
    <section className="output-bar no-print" aria-labelledby="keep-the-working">
      <h2 id="keep-the-working">Take it with you</h2>
      <p>Save it, share it or print it. JSON keeps everything editable.</p>
      <div className="action-grid">
        <ActionCard primary icon={<Printer />} title="Print business case" detail="A clean, full-detail copy for the room." onClick={printBusinessCase} />
        <ActionCard icon={<Download />} title="Save JSON" detail="Editable inputs you can restore later." onClick={() => exportAction(() => exportJson(a, r, tei))} />
        <ActionCard icon={<FileSpreadsheet />} title="Export CSV" detail="Calculation detail for a spreadsheet." onClick={() => exportAction(() => exportCsv(a, r, tei))} />
        <ActionCard icon={<Link2 />} title="Copy share link" detail="Contains sensitive assessment data. Send only to intended recipients." onClick={share} />
      </div>
      {s.sellerMode && <Toggle checked={includePresenter} onChange={setIncludePresenter} label="Include presenter content in print" description="Off by default. This does not make the presenter content confidential." />}
      {message && <p role="status" className="note" style={{ marginTop: 18 }}>{message}</p>}
      <details className="disclosure"><summary>How sharing works</summary><p className="detail-copy">New share payloads use the URL fragment; app calculations run locally. Browsers, extensions, recipients and any copied link can still expose the contents. Legacy query-based links may reach the host in request URLs.</p></details>
      <div className="button-row" style={{ marginTop: 22 }}><ImportButton label="Restore JSON" /><Button variant="ghost" onClick={() => s.setStep('assumptions')}>Edit assumptions</Button><Button variant="ghost" onClick={() => s.setStep('catalog')}>Add more spend</Button></div>
    </section>
  </div>;
}
