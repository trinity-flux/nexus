import { describe, expect, it } from 'vitest';

import { findMatchRanges, parseSearchTerms, splitByRanges } from './highlight';

describe('parseSearchTerms', () => {
  it('splits on any run of whitespace', () => {
    expect(parseSearchTerms('  northrend   boat ')).toEqual(['northrend', 'boat']);
  });

  it('yields nothing for a query of only spaces', () => {
    expect(parseSearchTerms('   ')).toEqual([]);
  });
});

describe('findMatchRanges', () => {
  it('finds a term regardless of case', () => {
    expect(findMatchRanges('Getting to Northrend', ['northrend'])).toEqual([
      { start: 11, end: 20 },
    ]);
  });

  it('finds every occurrence, not just the first', () => {
    expect(findMatchRanges('boat, boat, boat', ['boat'])).toEqual([
      { start: 0, end: 4 },
      { start: 6, end: 10 },
      { start: 12, end: 16 },
    ]);
  });

  it('merges overlapping terms into one run', () => {
    // Two terms where one contains the other would otherwise produce nested
    // marks, and nested marks render as a double-highlighted fragment.
    expect(findMatchRanges('Northrend', ['north', 'northrend'])).toEqual([{ start: 0, end: 9 }]);
  });

  it('merges terms that touch', () => {
    expect(findMatchRanges('boathouse', ['boat', 'house'])).toEqual([{ start: 0, end: 9 }]);
  });

  it('returns the ranges in order even when the terms are not', () => {
    expect(findMatchRanges('alpha beta', ['beta', 'alpha'])).toEqual([
      { start: 0, end: 5 },
      { start: 6, end: 10 },
    ]);
  });

  it('treats regular expression characters as literal text', () => {
    // The search box accepts anything anyone types. Building a RegExp from it
    // would turn "c++" into a syntax error and ".*" into a match on
    // everything.
    expect(findMatchRanges('Is c++ allowed?', ['c++'])).toEqual([{ start: 3, end: 6 }]);
    expect(findMatchRanges('plain text', ['.*'])).toEqual([]);
  });

  it('finds nothing when nothing matches', () => {
    expect(findMatchRanges('Getting to Northrend', ['outland'])).toEqual([]);
  });

  it('ignores an empty term', () => {
    expect(findMatchRanges('anything', [''])).toEqual([]);
  });
});

describe('splitByRanges', () => {
  it('returns the whole string as one plain segment when nothing matched', () => {
    expect(splitByRanges('Getting to Northrend', [])).toEqual([
      { text: 'Getting to Northrend', isMatch: false },
    ]);
  });

  it('alternates plain and matching segments', () => {
    expect(splitByRanges('Getting to Northrend', [{ start: 11, end: 20 }])).toEqual([
      { text: 'Getting to ', isMatch: false },
      { text: 'Northrend', isMatch: true },
    ]);
  });

  it('handles a match at the very start', () => {
    expect(splitByRanges('Northrend boat', [{ start: 0, end: 9 }])).toEqual([
      { text: 'Northrend', isMatch: true },
      { text: ' boat', isMatch: false },
    ]);
  });

  it('reassembles into exactly the original text', () => {
    const text = 'How do I get to Northrend at level 68?';
    const ranges = findMatchRanges(text, ['northrend', 'level']);

    expect(
      splitByRanges(text, ranges)
        .map((segment) => segment.text)
        .join(''),
    ).toBe(text);
  });

  it('survives a range that runs past the end of the text', () => {
    // The real adapter computes offsets in Postgres. A stale or mismatched
    // one must degrade to a shorter highlight, never to reordered text.
    expect(splitByRanges('short', [{ start: 2, end: 99 }])).toEqual([
      { text: 'sh', isMatch: false },
      { text: 'ort', isMatch: true },
    ]);
  });

  it('drops a range that starts past the end of the text', () => {
    expect(splitByRanges('short', [{ start: 50, end: 60 }])).toEqual([
      { text: 'short', isMatch: false },
    ]);
  });
});
