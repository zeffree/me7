import type { ReactNode } from 'react';
import { Check, LockKeyhole } from 'lucide-react';

export function ChoiceStrip<T extends string>({ label, value, options, onChange }: {
  label: string;
  value: T;
  options: readonly { value: T; label: string; detail?: string; unavailable?: string }[];
  onChange: (value: T) => void;
}) {
  return <fieldset className="lab-choice-field">
    <legend>{label}</legend>
    <div className="lab-choice-strip">{options.map(option => <button key={option.value} type="button"
      aria-pressed={value === option.value} onClick={() => onChange(option.value)}>
      <span>{value === option.value && <Check aria-hidden="true" />}{option.label}</span>
      {option.detail && <small>{option.detail}</small>}
      {option.unavailable && <small className="lab-availability"><LockKeyhole aria-hidden="true" />{option.unavailable}</small>}
    </button>)}</div>
  </fieldset>;
}

export function LabToggle({ label, detail, checked, onChange }: {
  label: string; detail?: string; checked: boolean; onChange: (value: boolean) => void;
}) {
  return <label className="lab-toggle">
    <input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} />
    <span><strong>{label}</strong>{detail && <small>{detail}</small>}</span>
  </label>;
}

export function ArtifactHeading({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return <div className="lab-artifact-heading"><span aria-hidden="true">{icon}</span><div><h3>{title}</h3>{children && <p>{children}</p>}</div></div>;
}

export function LabHint({ children }: { children: ReactNode }) {
  return <p className="lab-hint">{children}</p>;
}

export function SetupNotes({ children }: { children: ReactNode }) {
  return <details className="lab-setup-notes"><summary>Sample setup and licence boundaries</summary>{children}</details>;
}
