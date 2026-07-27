import { describe, expect, it } from 'vitest';

import { cn } from './cn';

describe('cn', () => {
  it('joins class names', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('drops falsy values so conditional classes read cleanly at the call site', () => {
    expect(cn('a', false && 'b', undefined, null, 'c')).toBe('a c');
  });

  it('lets a later Tailwind utility win over an earlier one in the same group', () => {
    // This is the whole reason cn exists rather than a plain join: without it
    // `className` props could not reliably override a component's defaults.
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
  });

  it('keeps utilities from different groups side by side', () => {
    expect(cn('text-fg', 'bg-surface')).toBe('text-fg bg-surface');
  });
});
