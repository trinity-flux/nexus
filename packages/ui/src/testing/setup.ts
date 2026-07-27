import { afterEach, vi } from 'vitest';

/**
 * Shared Vitest setup for every package in the monorepo.
 *
 * Guarded on the presence of a DOM because not every test needs one: anything
 * that reads a file, checks the token table or exercises a pure use case runs
 * under the `node` environment, where importing Testing Library throws.
 */
const hasDom = typeof window !== 'undefined';

if (hasDom) {
  await import('@testing-library/jest-dom/vitest');
  const { cleanup } = await import('@testing-library/react');

  afterEach(() => {
    cleanup();
  });

  // jsdom implements neither of these, and Radix primitives and the theme
  // provider both call them on mount. Without the stubs every component test
  // that opens a dialog fails on an unrelated TypeError.
  if (!window.matchMedia) {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  }

  if (!window.ResizeObserver) {
    window.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }

  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = vi.fn();
  }

  // jsdom does not implement the Pointer Capture API. Radix calls it on every
  // menu and dialog dismissal, and the resulting TypeError surfaces as an
  // unhandled rejection that fails the run even when every assertion passed.
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false;
    Element.prototype.setPointerCapture = () => {};
    Element.prototype.releasePointerCapture = () => {};
  }
}
