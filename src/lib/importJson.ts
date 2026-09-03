import type { Assessment } from '@/model/types';
import { sanitizeAssessment } from '@/store/useAssessment';

export type ImportResult =
  | { ok: true; assessment: Assessment; warning?: string }
  | { ok: false; error: string };

const SCHEMA = 'me7-assessment/1';

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Looks like an assessment even without the export envelope, so a hand-edited or
 * hand-written file still works. Deliberately strict: sanitizeAssessment happily turns
 * anything into a valid default assessment, so an unrecognised file must be rejected here
 * or importing the wrong JSON would silently wipe the user's work.
 */
function looksLikeAssessment(v: unknown): v is Partial<Assessment> {
  if (!isRecord(v)) return false;
  const signals = ['baseline', 'seats', 'lines', 'addOns', 'assumptions', 'orgName'];
  return signals.filter((k) => k in v).length >= 2;
}

export function parseAssessmentExport(text: string): ImportResult {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: 'That file is empty.' };

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { ok: false, error: "That file isn't valid JSON. Pick a file exported from this app." };
  }

  let candidate: unknown = parsed;
  let warning: string | undefined;

  if (isRecord(parsed) && 'assessment' in parsed) {
    candidate = parsed.assessment;
    const schema = parsed.schema;
    if (typeof schema === 'string' && schema !== SCHEMA) {
      warning = `Saved by a different version of this app (${schema}). Anything unrecognised was reset to a default.`;
    }
  }

  if (!looksLikeAssessment(candidate)) {
    return {
      ok: false,
      error: "That JSON doesn't contain an assessment. Use a file exported with the JSON button.",
    };
  }

  const assessment = sanitizeAssessment(candidate);
  return warning ? { ok: true, assessment, warning } : { ok: true, assessment };
}

/** Describes what was recovered, so the user can tell at a glance whether it was the right file. */
export function describeImport(a: Assessment): string {
  const lines = a.lines.length;
  const addOns = a.addOns.length;
  const parts = [
    `${a.seats.toLocaleString()} seats`,
    `${lines} spend ${lines === 1 ? 'line' : 'lines'}`,
  ];
  if (addOns > 0) parts.push(`${addOns} Microsoft add-${addOns === 1 ? 'on' : 'ons'}`);
  return `Loaded ${a.orgName || 'assessment'} — ${parts.join(', ')}.`;
}
