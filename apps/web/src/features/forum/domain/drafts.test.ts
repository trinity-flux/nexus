import { describe, expect, it } from 'vitest';

import {
  BODY_MAX_LENGTH,
  isSubmittable,
  TITLE_MAX_LENGTH,
  validateBody,
  validateTitle,
  validateTopicDraft,
} from './drafts';

describe('validateTitle', () => {
  it('accepts an ordinary title', () => {
    expect(validateTitle('Where do I find copper ore?')).toBeNull();
  });

  it('rejects a title that is too short', () => {
    expect(validateTitle('ab')).toBe('title-too-short');
  });

  it('rejects a title of nothing but whitespace', () => {
    // Otherwise a topic list shows a blank row that is still a link.
    expect(validateTitle('     ')).toBe('title-too-short');
  });

  it('measures the title trimmed', () => {
    expect(validateTitle('   abc   ')).toBeNull();
  });

  it('rejects a title past the column limit', () => {
    expect(validateTitle('a'.repeat(TITLE_MAX_LENGTH + 1))).toBe('title-too-long');
  });

  it('accepts a title exactly at the limit', () => {
    expect(validateTitle('a'.repeat(TITLE_MAX_LENGTH))).toBeNull();
  });
});

describe('validateBody', () => {
  it('accepts an ordinary message', () => {
    expect(validateBody('Take the boat from Menethil.')).toBeNull();
  });

  it('rejects an empty message', () => {
    expect(validateBody('')).toBe('body-empty');
  });

  it('rejects a message of nothing but whitespace', () => {
    expect(validateBody('  \n\n  ')).toBe('body-empty');
  });

  it('measures length untrimmed, since that is what gets stored', () => {
    const body = `${' '.repeat(10)}${'a'.repeat(BODY_MAX_LENGTH - 9)}`;

    expect(validateBody(body)).toBe('body-too-long');
  });
});

describe('validateTopicDraft', () => {
  it('reports both problems at once rather than one at a time', () => {
    // Fixing one error only to be shown the next is the most tiring possible
    // way to fill in a form.
    expect(validateTopicDraft('ab', '')).toEqual({
      title: 'title-too-short',
      body: 'body-empty',
    });
  });

  it('is submittable when nothing is wrong', () => {
    expect(isSubmittable(validateTopicDraft('A good title', 'A message.'))).toBe(true);
  });

  it('is not submittable while anything is wrong', () => {
    expect(isSubmittable(validateTopicDraft('A good title', ''))).toBe(false);
  });
});
