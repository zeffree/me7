import LZString from 'lz-string';
import type { Assessment } from '@/model/types';

const PARAM = 'd';

/**
 * Share links carry the whole assessment in the URL fragment-adjacent query param,
 * compressed. Nothing is uploaded anywhere — the recipient's browser reconstructs
 * the assessment locally from the link itself.
 */
export function encodeAssessment(a: Assessment): string {
  return LZString.compressToEncodedURIComponent(JSON.stringify(a));
}

export function decodeAssessment(encoded: string): Assessment | null {
  try {
    // lz-string's URI-safe alphabet includes '+', which form-urlencoded parsing (and any
    // link-rewriting mail or chat client) happily turns into a space. Put them back before
    // decompressing, otherwise a perfectly good link fails for no visible reason.
    const repaired = encoded.replace(/ /g, '+');
    const json = LZString.decompressFromEncodedURIComponent(repaired);
    if (!json) return null;
    const parsed = JSON.parse(json) as Assessment;
    if (typeof parsed !== 'object' || parsed === null) return null;
    if (typeof parsed.seats !== 'number' || !Array.isArray(parsed.lines)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function buildShareUrl(a: Assessment): string {
  const url = new URL(window.location.href);
  url.searchParams.set(PARAM, encodeAssessment(a));
  return url.toString();
}

export function readShareParam(): Assessment | null {
  if (typeof window === 'undefined') return null;
  const encoded = new URLSearchParams(window.location.search).get(PARAM);
  return encoded ? decodeAssessment(encoded) : null;
}

/** Strip the share payload so a reload does not keep re-importing the same data. */
export function clearShareParam(): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(PARAM)) return;
  url.searchParams.delete(PARAM);
  window.history.replaceState({}, '', url.toString());
}
