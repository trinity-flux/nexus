import { Separator } from '@trinity-nexus/ui';
import { ArrowUp, ExternalLink } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { EXTERNAL_LINKS } from '@/shared/config/links';
import { useI18n } from '@/shared/i18n/useI18n';

export interface FooterProps {
  /** Id of the page's `<main>`, so "back to top" has somewhere to land. */
  mainId: string;
}

/**
 * The end of every page.
 *
 * A footer on a forum is not decoration: it is where someone lands after
 * reading a long thread, and it is the second place — after the header — that
 * people look for the parts of the site that are not the thing they are
 * reading. Two lines of unlinked text left them with nowhere to go but the
 * back button.
 *
 * Every destination here is a route that exists. A footer full of links to
 * pages that are not built yet is worse than a short one.
 */
export function Footer({ mainId }: FooterProps) {
  const { t } = useI18n();

  // Rendered through `String` on purpose. `translate()` formats numeric values
  // with `Intl.NumberFormat`, which is right for counts and wrong for a year:
  // it would print "2.026" in Spanish.
  const year = String(new Date().getFullYear());

  return (
    <footer className="mt-16 border-border-default border-t">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
          <div className="flex max-w-sm flex-col gap-1">
            <span className="font-semibold text-fg">{t('app.name')}</span>
            <p className="text-fg-muted text-sm">{t('app.tagline')}</p>
            <p className="text-fg-subtle text-sm">{t('footer.builtBy')}</p>
          </div>

          <div className="flex gap-12">
            <FooterNav label={t('footer.forum')}>
              <FooterLink to="/">{t('nav.home')}</FooterLink>
              <FooterLink to="/c">{t('nav.categories')}</FooterLink>
            </FooterNav>

            <FooterNav label={t('footer.community')}>
              <li>
                {/*
                  No `target="_blank"`. Opening a new tab takes the back button
                  away from the visitor and hands the choice to us; anyone who
                  wants a new tab already knows how to ask for one.
                */}
                <a
                  className="inline-flex items-center gap-1.5 text-fg-muted text-sm transition-colors duration-150 hover:text-fg"
                  href={EXTERNAL_LINKS.repository}
                  rel="noopener noreferrer"
                >
                  {t('footer.repository')}
                  <ExternalLink aria-hidden="true" className="size-3.5" />
                </a>
              </li>
            </FooterNav>
          </div>
        </div>

        <Separator />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="text-fg-subtle text-sm">{t('footer.copyright', { year })}</span>

          {/*
            An anchor rather than a button that calls `scrollTo`. A script
            scroll moves the viewport but leaves keyboard focus at the bottom
            of the page, so the next Tab drops the visitor back where they
            started. Following a real anchor moves both.
          */}
          <a
            className="inline-flex items-center gap-1.5 text-fg-muted text-sm transition-colors duration-150 hover:text-fg"
            href={`#${mainId}`}
          >
            <ArrowUp aria-hidden="true" className="size-3.5" />
            {t('footer.backToTop')}
          </a>
        </div>
      </div>
    </footer>
  );
}

function FooterNav({ label, children }: { label: string; children: ReactNode }) {
  return (
    <nav aria-label={label}>
      <h2 className="mb-3 font-medium text-fg text-sm">{label}</h2>
      <ul className="flex flex-col gap-2">{children}</ul>
    </nav>
  );
}

function FooterLink({ to, children }: { to: string; children: string }) {
  return (
    <li>
      <Link className="text-fg-muted text-sm transition-colors duration-150 hover:text-fg" to={to}>
        {children}
      </Link>
    </li>
  );
}
