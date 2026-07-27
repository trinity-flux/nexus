import { SkipLink } from '@trinity-nexus/ui';
import { Outlet } from 'react-router';

import { useI18n } from '@/shared/i18n/useI18n';

import { Footer } from './Footer';
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

      {/* `tabIndex={-1}` is what makes the skip link and the footer's "back to
          top" actually move focus. Without it the browser scrolls the landmark
          into view but leaves focus where it was, so the next Tab returns the
          keyboard user to the header they were trying to skip. */}
      <main
        className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6"
        id={MAIN_ID}
        tabIndex={-1}
      >
        <Outlet />
      </main>

      <Footer mainId={MAIN_ID} />
    </div>
  );
}
