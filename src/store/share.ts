import LZString from 'lz-string';
import type { Assessment } from '@/model/types';

const PARAM = 'd';

/**
 * New links keep the payload in the fragment, which browsers do not send in HTTP
 * requests. Compression is not encryption: anyone with the link can read it.
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
  url.searchParams.delete(PARAM);
  const fragment = new URLSearchParams();
  fragment.set(PARAM, encodeAssessment(a));
  url.hash = fragment.toString();
  return url.toString();
}

export function readShareParam(): Assessment | null {
  if (typeof window === 'undefined') return null;
  const url = new URL(window.location.href);
  const fragment = new URLSearchParams(url.hash.slice(1));
  // Read old query links, but never put their payload into a newly shared URL.
  const encoded = fragment.has(PARAM)
    ? fragment.get(PARAM)
    : url.searchParams.get(PARAM);
  return encoded ? decodeAssessment(encoded) : null;
}

export function hasShareParam(): boolean {
  if (typeof window === 'undefined') return false;
  const url = new URL(window.location.href);
  return url.searchParams.has(PARAM) || new URLSearchParams(url.hash.slice(1)).has(PARAM);
}

/** Strip the share payload so a reload does not keep re-importing the same data. */
export function clearShareParam(): void {
  const url = new URL(window.location.href);
  const fragment = new URLSearchParams(url.hash.slice(1));
  if (!url.searchParams.has(PARAM) && !fragment.has(PARAM)) return;
  url.searchParams.delete(PARAM);
  if (fragment.has(PARAM)) {
    fragment.delete(PARAM);
    url.hash = fragment.toString();
  }
  window.history.replaceState({}, '', url.toString());
}
