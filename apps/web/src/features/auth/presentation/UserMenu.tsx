import {
  Avatar,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@trinity-nexus/ui';
import { LogOut, Shield, User } from 'lucide-react';
import { Link } from 'react-router';

import { useI18n } from '@/shared/i18n/useI18n';

import { signOut } from '../application/authCommands';
import { useAuth, useAuthDispatch } from './useAuth';

export function UserMenu() {
  const { t } = useI18n();
  const dispatch = useAuthDispatch();
  const { member, isReady, isModerator } = useAuth();

  // Nothing is rendered until the stored session has been checked. Showing
  // "Sign in" first and swapping it for an avatar a moment later is a visible
  // flicker on every single page load.
  if (!isReady) {
    return <div aria-hidden="true" className="size-9" />;
  }

  if (!member) {
    return (
      <Button asChild size="sm" variant="secondary">
        <Link to="/sign-in">{t('nav.signIn')}</Link>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-label={t('nav.account')} size="icon-sm" variant="ghost">
          <Avatar name={member.displayName} size="sm" src={member.avatarUrl ?? undefined} />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent>
        <DropdownMenuLabel>
          <span className="flex items-center gap-2">
            {member.displayName}
            {isModerator ? (
              <Badge variant="accent">
                {member.role === 'admin' ? t('profile.role.admin') : t('profile.role.moderator')}
              </Badge>
            ) : null}
          </span>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/*
          The icon sits inside the Link rather than on the item: with asChild
          the item merges onto its single child, so an icon rendered beside it
          would be dropped. Keeping it here also keeps the whole row, icon
          included, inside the anchor's hit area.
        */}
        <DropdownMenuItem asChild>
          <Link className="flex items-center gap-2" to={`/u/${member.username}`}>
            <User aria-hidden="true" className="size-4 shrink-0" />
            {t('nav.profile')}
          </Link>
        </DropdownMenuItem>

        {isModerator ? (
          <DropdownMenuItem asChild>
            <Link className="flex items-center gap-2" to="/moderation">
              <Shield aria-hidden="true" className="size-4 shrink-0" />
              {t('moderation.heading')}
            </Link>
          </DropdownMenuItem>
        ) : null}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          icon={LogOut}
          onSelect={() => {
            dispatch(signOut());
          }}
        >
          {t('nav.signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
