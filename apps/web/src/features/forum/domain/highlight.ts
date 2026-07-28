/**
 * Locating the query terms inside a search result.
 *
 * Ranges, not marked-up HTML. A repository that returned `<mark>` around the
 * match would be handing markup built from text a stranger wrote straight to
 * the renderer, and the only safe way to draw that is to sanitise it again on
 * the way out. Offsets cannot carry a payload: the presentation layer builds
 * real elements around them and there is nothing to escape.
 *
 * It also keeps the decision where it belongs. Whether a match is drawn as a
 * `<mark>`, a bold run or a coloured background is a presentation question,
 * and the adapter should not be answering it.
 */

export interface TextRange {
  start: number;
  /** Exclusive, like `String.prototype.slice`. */
  end: number;
}

/** Splits a raw query into the terms to look for. */
export function parseSearchTerms(query: string): string[] {
  return query.trim().split(/\s+/).filter(Boolean);
}

/**
 * Every place in `text` where one of `terms` occurs, case-insensitively.
 *
 * Overlapping and adjacent hits are merged, so searching "north northrend"
 * marks one run rather than two nested ones.
 */
export function findMatchRanges(text: string, terms: readonly string[]): TextRange[] {
  const haystack = foldCase(text);
  const found: TextRange[] = [];

  for (const term of terms) {
    const needle = foldCase(term);
    if (needle.length === 0) {
      continue;
    }

    let from = 0;
    while (from <= haystack.length - needle.length) {
      const at = haystack.indexOf(needle, from);
      if (at === -1) {
        break;
      }
      found.push({ start: at, end: at + needle.length });
      // Advances by one rather than by the term's length so that overlapping
      // occurrences ("aa" in "aaa") are all found; merging cleans up after.
      from = at + 1;
    }
  }

  return mergeRanges(found);
}

export interface TextSegment {
  text: string;
  /** True when this segment is one of the query terms. */
  isMatch: boolean;
}

/**
 * Cuts `text` into alternating plain and matching segments.
 *
 * Returns a single unmatched segment when nothing matched, so a caller can
 * render the result of this function unconditionally.
 */
export function splitByRanges(text: string, ranges: readonly TextRange[]): TextSegment[] {
  const segments: TextSegment[] = [];
  let cursor = 0;

  for (const range of mergeRanges([...ranges])) {
    // Defensive: ranges may have been computed against a different string —
    // by a server, in the real adapter — and a stale offset must not silently
    // produce a segment that reorders the text.
    const start = clamp(range.start, cursor, text.length);
    const end = clamp(range.end, start, text.length);
    if (start === end) {
      continue;
    }

    if (start > cursor) {
      segments.push({ text: text.slice(cursor, start), isMatch: false });
    }
    segments.push({ text: text.slice(start, end), isMatch: true });
    cursor = end;
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), isMatch: false });
  }

  return segments;
}

/**
 * Lowercases without changing the string's length.
 *
 * A handful of characters grow when lowercased — Turkish `İ` becomes two code
 * units — which shifts every offset after them and marks the wrong span. When
 * that happens the comparison falls back to case-sensitive, which finds fewer
 * matches but never highlights the wrong text.
 */
function foldCase(value: string): string {
  const lowered = value.toLowerCase();
  return lowered.length === value.length ? lowered : value;
}

function mergeRanges(ranges: TextRange[]): TextRange[] {
  if (ranges.length === 0) {
    return [];
  }

  const sorted = [...ranges].sort((a, b) => a.start - b.start || a.end - b.end);
  const merged: TextRange[] = [];

  for (const range of sorted) {
    const last = merged[merged.length - 1];
    if (last && range.start <= last.end) {
      last.end = Math.max(last.end, range.end);
    } else {
      merged.push({ ...range });
    }
  }

  return merged;
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), high);
}
