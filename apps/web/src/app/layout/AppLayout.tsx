import { SkipLink } from '@trinity-nexus/ui';
import { Outlet } from 'react-router';

import { useI18n } from '@/shared/i18n/useI18n';

import { Header } from './Header';

const MAIN_ID = 'main-content';

export function AppLayout() {
  const { t } = useI18n();

  return (
    <div className="flex min-h-dvh flex-col">
      {/* First focusable element on the page, so a keyboard user is not made to
          tab through the whole header on every navigation. */}
      <SkipLink targetId={MAIN_ID}>{t('nav.skipToContent')}</SkipLink>

      <Header />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6" id={MAIN_ID}>
        <Outlet />
      </main>

      <footer className="border-border-default border-t">
        <div className="mx-auto flex max-w-5xl flex-col gap-1 px-4 py-6 text-fg-subtle text-sm sm:px-6">
          <span>{t('app.name')}</span>
          <span>{t('app.tagline')}</span>
        </div>
      </footer>
    </div>
  );
}
