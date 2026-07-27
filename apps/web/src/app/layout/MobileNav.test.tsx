import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@trinity-nexus/ui';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';

import { I18nProvider } from '@/shared/i18n/I18nProvider';

import { MobileNav } from './MobileNav';

function renderNav() {
  return render(
    <I18nProvider locale="en">
      <ThemeProvider>
        <MemoryRouter initialEntries={['/']}>
          <MobileNav />
          <Routes>
            <Route element={<h1>Home</h1>} path="/" />
            <Route element={<h1>Categories</h1>} path="/c" />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </I18nProvider>,
  );
}

async function openDrawer() {
  await userEvent.click(screen.getByRole('button', { name: 'Open menu' }));
}

describe('MobileNav', () => {
  it('reaches the forum from a phone, which the header alone could not', async () => {
    renderNav();
    await openDrawer();

    const nav = within(screen.getByRole('dialog')).getByRole('navigation', { name: 'Menu' });

    expect(within(nav).getByRole('link', { name: 'Categories' })).toBeInTheDocument();
  });

  it('closes itself once a link has navigated', async () => {
    renderNav();
    await openDrawer();

    await userEvent.click(screen.getByRole('link', { name: 'Categories' }));

    // The tap has to visibly do something. A drawer left open over the page it
    // just loaded reads as a dead control.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Categories' })).toBeInTheDocument();
  });

  it('reports which theme is in effect rather than relying on the tick alone', async () => {
    renderNav();
    await openDrawer();

    // `system` is the default, and it is the state a screen reader must be
    // able to hear: three buttons named Light, Dark and System are otherwise
    // indistinguishable from one another.
    expect(screen.getByRole('button', { name: 'System' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('moves the pressed state when a theme is chosen', async () => {
    renderNav();
    await openDrawer();

    await userEvent.click(screen.getByRole('button', { name: 'Dark' }));

    expect(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'System' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('offers every supported language', async () => {
    renderNav();
    await openDrawer();

    expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Español' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Français' })).toBeInTheDocument();
  });
});
