import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from './ThemeProvider';
import { THEME_STORAGE_KEY } from './theme';
import { useTheme } from './useTheme';

/** Lets the tests drive `prefers-color-scheme` the way an OS setting would. */
function stubColourScheme(scheme: 'light' | 'dark') {
  const listeners = new Set<() => void>();

  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('light') ? scheme === 'light' : scheme === 'dark',
    media: query,
    onchange: null,
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));

  return {
    change(next: 'light' | 'dark') {
      stubColourScheme(next);
      for (const listener of listeners) {
        listener();
      }
    },
  };
}

function ThemeProbe() {
  const { preference, resolved, setPreference } = useTheme();

  return (
    <div>
      <span data-testid="preference">{preference}</span>
      <span data-testid="resolved">{resolved}</span>
      <button onClick={() => setPreference('light')} type="button">
        Light
      </button>
      <button onClick={() => setPreference('system')} type="button">
        System
      </button>
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.className = '';
  stubColourScheme('dark');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ThemeProvider', () => {
  it('follows the system by default', () => {
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('preference')).toHaveTextContent('system');
    expect(screen.getByTestId('resolved')).toHaveTextContent('dark');
  });

  it('resolves system to light when the OS asks for light', () => {
    stubColourScheme('light');

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('resolved')).toHaveTextContent('light');
  });

  it('puts the dark class and color-scheme on the document element', () => {
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(document.documentElement).toHaveClass('dark');
    // Without color-scheme the page is dark but the scrollbars and form
    // controls stay light.
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('persists an explicit choice under the key the anti-flash script reads', async () => {
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Light' }));

    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    expect(document.documentElement).not.toHaveClass('dark');
  });

  it('starts from the stored preference so the first paint already matches', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light');

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('resolved')).toHaveTextContent('light');
  });

  it('ignores a corrupted stored value instead of throwing', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'neon');

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('preference')).toHaveTextContent('system');
  });

  it('survives localStorage throwing, as it does in private mode', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });

    expect(() =>
      render(
        <ThemeProvider>
          <ThemeProbe />
        </ThemeProvider>,
      ),
    ).not.toThrow();
  });
});

describe('useTheme', () => {
  it('fails loudly outside a provider rather than returning undefined', () => {
    // React logs the thrown error; silence it so the run stays readable.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<ThemeProbe />)).toThrow(/ThemeProvider/);

    consoleError.mockRestore();
  });
});
