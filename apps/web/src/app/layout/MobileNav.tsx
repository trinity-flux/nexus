import { Button, Separator, Sheet, SheetContent, SheetTrigger, useTheme } from '@trinity-nexus/ui';
import { Check, Menu, Monitor, Moon, Sun } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router';

import { LOCALE_NAMES, LOCALES } from '@/shared/i18n/locales';
import { useI18n } from '@/shared/i18n/useI18n';

/**
 * Navigation for screens too narrow for a menu bar.
 *
 * Below `sm` the header's links were simply hidden, which left a phone with no
 * way into the forum at all except the wordmark — the single most common
 * device for reading a forum had the least navigation. Everything the header
 * offers on a wide screen is reachable here.
 *
 * Theme and language live in this panel rather than as icon buttons in the bar
 * because a 375px header cannot hold five controls without shrinking them
 * below the size of a thumb.
 */
export function MobileNav() {
  const { t, locale, setLocale } = useI18n();
  const { preference, setPreference } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const { key: locationKey } = useLocation();

  // A drawer that stays open over the page it just navigated to looks like the
  // tap did nothing. Keyed on the navigation rather than on the link's onClick
  // so that the browser's back and forward buttons close it too.
  //
  // `location.key` and not the location object: the object is a fresh identity
  // on renders that are not navigations, which would re-run this effect and
  // slam the drawer shut in the same commit that opened it.
  //
  // biome-ignore lint/correctness/useExhaustiveDependencies: the navigation is the trigger, not a value the effect reads
  useEffect(() => {
    setIsOpen(false);
  }, [locationKey]);

  return (
    <Sheet onOpenChange={setIsOpen} open={isOpen}>
      <SheetTrigger asChild>
        <Button aria-label={t('nav.openMenu')} className="sm:hidden" size="icon" variant="ghost">
          <Menu aria-hidden="true" className="size-5" />
        </Button>
      </SheetTrigger>

      <SheetContent
        closeLabel={t('nav.closeMenu')}
        description={t('app.tagline')}
        title={t('app.name')}
      >
        <div className="flex flex-col gap-6">
          <nav aria-label={t('nav.menu')}>
            <ul className="flex flex-col gap-1">
              <li>
                <DrawerLink end to="/">
                  {t('nav.home')}
                </DrawerLink>
              </li>
              <li>
                <DrawerLink to="/c">{t('nav.categories')}</DrawerLink>
              </li>
            </ul>
          </nav>

          <Separator />

          <OptionGroup label={t('theme.label')}>
            <ChoiceRow
              icon={<Sun aria-hidden="true" className="size-4" />}
              isSelected={preference === 'light'}
              label={t('theme.light')}
              onSelect={() => {
                setPreference('light');
              }}
            />
            <ChoiceRow
              icon={<Moon aria-hidden="true" className="size-4" />}
              isSelected={preference === 'dark'}
              label={t('theme.dark')}
              onSelect={() => {
                setPreference('dark');
              }}
            />
            <ChoiceRow
              icon={<Monitor aria-hidden="true" className="size-4" />}
              isSelected={preference === 'system'}
              label={t('theme.system')}
              onSelect={() => {
                setPreference('system');
              }}
            />
          </OptionGroup>

          <Separator />

          <OptionGroup label={t('locale.label')}>
            {LOCALES.map((code) => (
              <ChoiceRow
                isSelected={code === locale}
                key={code}
                label={LOCALE_NAMES[code]}
                onSelect={() => {
                  setLocale(code);
                }}
              />
            ))}
          </OptionGroup>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DrawerLink({ to, end, children }: { to: string; end?: boolean; children: string }) {
  return (
    <NavLink
      className={({ isActive }) =>
        [
          // 44px tall. These are the primary targets in the panel and they are
          // reached with a thumb, not a cursor.
          'flex h-11 items-center rounded-md px-3 font-medium text-sm transition-colors duration-150',
          isActive ? 'bg-surface-raised text-fg' : 'text-fg-muted hover:text-fg',
        ].join(' ')
      }
      end={end ?? false}
      to={to}
    >
      {children}
    </NavLink>
  );
}

function OptionGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="px-3 pb-1 font-medium text-fg-subtle text-xs uppercase tracking-wide">
        {label}
      </span>
      {children}
    </div>
  );
}

/**
 * One setting in a group where exactly one option is in effect.
 *
 * `aria-pressed` rather than a tick alone: the tick tells a sighted reader
 * which language is on, and without the state on the control itself a screen
 * reader announces three identical-sounding buttons.
 */
function ChoiceRow({
  label,
  icon,
  isSelected,
  onSelect,
}: {
  label: string;
  icon?: ReactNode;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      aria-pressed={isSelected}
      className="flex h-11 w-full cursor-pointer items-center gap-3 rounded-md px-3 text-left text-fg-muted text-sm transition-colors duration-150 hover:bg-surface-raised hover:text-fg aria-pressed:text-fg"
      onClick={onSelect}
      type="button"
    >
      {icon}
      <span className="flex-1">{label}</span>
      {isSelected ? <Check aria-hidden="true" className="size-4 text-primary-text" /> : null}
    </button>
  );
}
