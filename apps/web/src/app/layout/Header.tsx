import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  useTheme,
} from '@trinity-nexus/ui';
import { Check, Languages, Monitor, Moon, Search, Sun } from 'lucide-react';
import { Link, NavLink } from 'react-router';

import { UserMenu } from '@/features/auth';

import { LOCALE_NAMES, LOCALES } from '@/shared/i18n/locales';
import { useI18n } from '@/shared/i18n/useI18n';

import { HeaderSearch } from './HeaderSearch';
import { MobileNav } from './MobileNav';

export function Header() {
  const { t, locale, setLocale } = useI18n();
  const { preference, setPreference } = useTheme();

  return (
    <header className="sticky top-0 z-40 border-border-default border-b bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-2 px-4 sm:gap-4 sm:px-6">
        {/* First in the source order as well as on screen: on a phone this is
            the only way into the forum, so it must also be the first thing a
            screen reader reaches after the skip link. */}
        <MobileNav />

        <NavLink className="shrink-0 font-semibold text-fg tracking-tight" to="/">
          {t('app.name')}
        </NavLink>

        <nav aria-label={t('nav.mainNavigation')} className="hidden items-center gap-1 sm:flex">
          <HeaderLink to="/">{t('nav.home')}</HeaderLink>
          <HeaderLink to="/c">{t('nav.categories')}</HeaderLink>
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <div className="hidden md:block">
            <HeaderSearch />
          </div>

          {/* Below `md` the box does not fit, so the icon leads to the page
              that is nothing but the box. A search someone cannot reach on a
              phone is a search that does not exist. */}
          <Button
            aria-label={t('nav.search')}
            asChild
            className="md:hidden"
            size="icon-sm"
            variant="ghost"
          >
            <Link to="/search">
              <Search aria-hidden="true" className="size-4" />
            </Link>
          </Button>

          {/* Hidden on a phone, where the same two settings live in the
              navigation drawer. Five controls in a 375px bar means five
              controls too small to hit. */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                aria-label={t('locale.label')}
                className="hidden sm:inline-flex"
                size="icon-sm"
                variant="ghost"
              >
                <Languages aria-hidden="true" className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>{t('locale.label')}</DropdownMenuLabel>
              {LOCALES.map((code) => (
                <DropdownMenuItem
                  key={code}
                  onSelect={() => {
                    setLocale(code);
                  }}
                >
                  <span className="flex-1">{LOCALE_NAMES[code]}</span>
                  {code === locale ? <ActiveMark label={t('locale.label')} /> : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                aria-label={t('theme.label')}
                className="hidden sm:inline-flex"
                size="icon-sm"
                variant="ghost"
              >
                <Sun aria-hidden="true" className="size-4 dark:hidden" />
                <Moon aria-hidden="true" className="hidden size-4 dark:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>{t('theme.label')}</DropdownMenuLabel>
              <DropdownMenuItem
                icon={Sun}
                onSelect={() => {
                  setPreference('light');
                }}
              >
                <span className="flex-1">{t('theme.light')}</span>
                {preference === 'light' ? <ActiveMark label={t('theme.label')} /> : null}
              </DropdownMenuItem>
              <DropdownMenuItem
                icon={Moon}
                onSelect={() => {
                  setPreference('dark');
                }}
              >
                <span className="flex-1">{t('theme.dark')}</span>
                {preference === 'dark' ? <ActiveMark label={t('theme.label')} /> : null}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                icon={Monitor}
                onSelect={() => {
                  setPreference('system');
                }}
              >
                <span className="flex-1">{t('theme.system')}</span>
                {preference === 'system' ? <ActiveMark label={t('theme.label')} /> : null}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <UserMenu />
        </div>
      </div>
    </header>
  );
}

/**
 * Marks the option currently in effect.
 *
 * A tick rather than a bullet, and it carries a screen-reader label: without
 * one, "Dark" and "Dark, selected" sound identical, and the whole point of the
 * mark is to say which one is on.
 */
function ActiveMark({ label }: { label: string }) {
  return (
    <>
      <Check aria-hidden="true" className="size-4 shrink-0 text-primary-text" />
      <span className="sr-only">({label})</span>
    </>
  );
}

function HeaderLink({ to, children }: { to: string; children: string }) {
  return (
    <NavLink
      className={({ isActive }) =>
        [
          'rounded-md px-3 py-2 text-sm transition-colors duration-150',
          isActive ? 'bg-surface-raised text-fg' : 'text-fg-muted hover:text-fg',
        ].join(' ')
      }
      // `end` so "/" is not marked active on every nested route.
      end={to === '/'}
      to={to}
    >
      {children}
    </NavLink>
  );
}
