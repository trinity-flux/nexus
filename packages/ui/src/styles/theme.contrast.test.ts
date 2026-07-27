// @vitest-environment node
//
// This test reads a file off disk and never touches the DOM. Under jsdom,
// `import.meta.url` is an http: URL and `fileURLToPath` rejects it.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * Contrast is checked against the stylesheet itself rather than a duplicated
 * table of values, so there is nothing to keep in sync: change a hex code in
 * theme.css and this test re-reads it.
 *
 * WCAG 2.2 AA wants 4.5:1 for body text and 3:1 for large text and UI
 * boundaries. Every pair below is text, so 4.5:1 applies to all of them.
 */

const AA_NORMAL_TEXT = 4.5;

const themeCss = readFileSync(fileURLToPath(new URL('./theme.css', import.meta.url)), 'utf8');

/** Reads the custom properties declared in one selector block. */
function readTokens(selector: string): Record<string, string> {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const block = new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\n\\}`).exec(themeCss);

  if (!block?.[1]) {
    throw new Error(`No "${selector}" block found in theme.css.`);
  }

  const tokens: Record<string, string> = {};
  for (const line of block[1].split('\n')) {
    const declaration = /^\s*--([a-z0-9-]+):\s*([^;]+);/.exec(line);
    if (declaration?.[1] && declaration[2]) {
      tokens[declaration[1]] = declaration[2].trim();
    }
  }
  return tokens;
}

/** Relative luminance, per the WCAG 2.x definition. */
function relativeLuminance(hex: string): number {
  const value = hex.replace('#', '');
  const channels = [0, 2, 4].map((offset) => {
    const channel = Number.parseInt(value.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });

  const [r, g, b] = channels as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(foreground: string, background: string): number {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** Every foreground/background combination the design system actually renders. */
const TEXT_PAIRS: ReadonlyArray<readonly [foreground: string, background: string]> = [
  ['fg', 'bg'],
  ['fg', 'surface'],
  ['fg', 'surface-raised'],
  ['fg-muted', 'bg'],
  ['fg-muted', 'surface'],
  ['fg-muted', 'surface-raised'],
  ['fg-subtle', 'bg'],
  ['fg-subtle', 'surface'],
  ['fg-subtle', 'surface-raised'],

  // Filled controls: the label against its own fill.
  ['primary-fg', 'primary'],
  ['accent-fg', 'accent'],
  ['success-fg', 'success'],
  ['warning-fg', 'warning'],
  ['danger-fg', 'danger'],

  // Coloured text on page and card surfaces: links, status labels, counters.
  ['primary-text', 'bg'],
  ['primary-text', 'surface'],
  ['accent-text', 'bg'],
  ['accent-text', 'surface'],
  ['success-text', 'bg'],
  ['success-text', 'surface'],
  ['warning-text', 'bg'],
  ['warning-text', 'surface'],
  ['danger-text', 'bg'],
  ['danger-text', 'surface'],
];

describe.each([
  ['light', ':root'],
  ['dark', '.dark'],
])('%s theme', (_themeName, selector) => {
  const tokens = readTokens(selector);

  it.each(TEXT_PAIRS)('--%s on --%s meets WCAG AA', (foreground, background) => {
    const foregroundValue = tokens[foreground];
    const backgroundValue = tokens[background];

    expect(foregroundValue, `--${foreground} is not declared in ${selector}`).toBeDefined();
    expect(backgroundValue, `--${background} is not declared in ${selector}`).toBeDefined();
    expect(
      foregroundValue,
      `--${foreground} must be a hex colour for contrast to be checkable`,
    ).toMatch(/^#[0-9a-f]{6}$/);
    expect(
      backgroundValue,
      `--${background} must be a hex colour for contrast to be checkable`,
    ).toMatch(/^#[0-9a-f]{6}$/);

    const ratio = contrastRatio(foregroundValue as string, backgroundValue as string);

    expect(
      Number(ratio.toFixed(2)),
      `--${foreground} (${foregroundValue}) on --${background} (${backgroundValue})`,
    ).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });
});

describe('theme completeness', () => {
  const light = readTokens(':root');
  const dark = readTokens('.dark');

  it('declares every colour token in both themes', () => {
    const colourTokens = Object.keys(light).filter(
      (name) => light[name]?.startsWith('#') || light[name]?.startsWith('rgb'),
    );

    const missing = colourTokens.filter((name) => !(name in dark));

    expect(missing, 'tokens declared in :root but not in .dark').toEqual([]);
  });
});
