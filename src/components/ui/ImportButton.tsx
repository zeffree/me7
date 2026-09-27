import { useRef, useState } from 'react';
import { AlertCircle, Upload } from 'lucide-react';
import { Button } from '@/components/ui/Primitives';
import { describeImport, parseAssessmentExport } from '@/lib/importJson';
import { useAssessment } from '@/store/useAssessment';
import { cx } from '@/lib/format';

// Only failures render here. A success unmounts this component, so it reports via the store.
type Status = { message: string } | null;

/**
 * Restores a previously exported JSON assessment. Everything is parsed and sanitised before it
 * reaches the store, so a wrong or hand-edited file reports an error rather than corrupting state.
 */
export function ImportButton({
  variant = 'secondary',
  size = 'sm',
  label = 'Load saved JSON',
  className,
  onImported,
}: {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md';
  label?: string;
  className?: string;
  onImported?: () => void;
}) {
  const hydrate = useAssessment((s) => s.hydrate);
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>(null);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setStatus(null);
    let text: string;
    try {
      text = await file.text();
    } catch {
      setStatus({ message: "That file couldn't be read." });
      return;
    }
    const result = parseAssessmentExport(text);
    if (!result.ok) {
      setStatus({ message: result.error });
      return;
    }
    // Success unmounts this button — hydrate jumps to the results step — so the confirmation
    // travels with it and is shown where the user actually lands.
    const summary = describeImport(result.assessment);
    if (useAssessment.getState().started && !window.confirm('Restore this file and replace the current assessment? Export your current work first if you need to keep it.')) return;
    hydrate(result.assessment, result.warning ? `${summary} ${result.warning}` : summary);
    onImported?.();
  };

  return (
    <div className={cx('inline-flex flex-col items-start gap-1.5', className)}>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          void onFile(e.target.files?.[0]);
          // Allows re-picking the same file after a failed attempt.
          e.target.value = '';
        }}
      />
      <Button
        variant={variant}
        size={size}
        onClick={() => inputRef.current?.click()}
        aria-describedby={status ? 'import-status' : undefined}
      >
        <Upload className="h-3.5 w-3.5" aria-hidden />
        {label}
      </Button>
      {status && (
        <p
          id="import-status"
          role="alert"
          className="flex max-w-md items-start gap-1.5 text-xs font-medium text-rose-700 dark:text-rose-400"
        >
          <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
          {status.message}
        </p>
      )}
    </div>
  );
}
