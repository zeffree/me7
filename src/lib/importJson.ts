import type { Assessment } from '@/model/types';
import { assessmentInputErrors, sanitizeAssessment } from '@/store/useAssessment';

export type ImportResult =
  | { ok: true; assessment: Assessment; warning?: string; warnings?: string[] }
  | { ok: false; error: string };

const SCHEMAS = ['me7-assessment/1', 'me7-assessment/2'];

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
    if (typeof schema === 'string' && !SCHEMAS.includes(schema)) {
      return { ok: false, error: `Unsupported assessment schema (${schema}). Your current assessment has not been replaced.` };
    }
  }

  if (!looksLikeAssessment(candidate)) {
    return {
      ok: false,
      error: "That JSON doesn't contain an assessment. Use a file exported with the JSON button.",
    };
  }

  const errors = assessmentInputErrors(candidate);
  if (errors.length) return { ok: false, error: `Assessment was not imported. ${errors.join(' ')}` };
  const assessment = sanitizeAssessment(candidate);
  const warnings = assessment.reviewWarnings ?? [];
  warning = warnings.length ? warnings.join(' ') : undefined;
  return { ok: true, assessment, warning, warnings };
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
