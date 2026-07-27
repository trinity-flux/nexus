import { Button, Card, Field, Input, Separator } from '@trinity-nexus/ui';
import { type FormEvent, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router';
import type { TranslationKey } from '@/shared/i18n/translations';
import { useI18n } from '@/shared/i18n/useI18n';
import { signIn, signInWithDiscord } from '../application/authCommands';
import type { AuthFailure } from '../domain/entities';
import { useAuth, useAuthDispatch } from './useAuth';

/** The domain reports a reason; the UI decides what to say about it. */
const FAILURE_MESSAGES: Record<AuthFailure, TranslationKey> = {
  'invalid-credentials': 'auth.error.invalidCredentials',
  'email-taken': 'auth.error.emailTaken',
  'weak-password': 'auth.passwordHint',
  network: 'error.offline.description',
  unknown: 'error.generic.description',
};

export function SignInPage() {
  const { t } = useI18n();
  const dispatch = useAuthDispatch();
  const { isSignedIn, submitting, failure } = useAuth();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (isSignedIn) {
    // `replace` so the back button does not land on a sign-in form the member
    // has already passed.
    return <Navigate replace to={searchParams.get('next') ?? '/c'} />;
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    dispatch(signIn({ email, password }));
  };

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
      <h1 className="font-semibold text-2xl text-fg tracking-tight">{t('auth.signIn.heading')}</h1>

      <Button
        onClick={() => dispatch(signInWithDiscord())}
        type="button"
        variant="secondary"
        fullWidth
      >
        {t('auth.withDiscord')}
      </Button>

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-fg-subtle text-xs uppercase">{t('auth.or')}</span>
        <Separator className="flex-1" />
      </div>

      <Card className="p-5">
        <form className="flex flex-col gap-4" noValidate onSubmit={onSubmit}>
          <Field label={t('auth.email')} required>
            {(field) => (
              <Input
                {...field}
                autoComplete="email"
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                value={email}
              />
            )}
          </Field>

          <Field
            hint={t('auth.passwordHint')}
            label={t('auth.password')}
            required
            {...(failure ? { error: t(FAILURE_MESSAGES[failure]) } : {})}
          >
            {(field) => (
              <Input
                {...field}
                autoComplete="current-password"
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                value={password}
              />
            )}
          </Field>

          <Button
            disabled={email.trim() === '' || password === ''}
            fullWidth
            loading={submitting}
            loadingLabel={t('common.loading')}
            type="submit"
          >
            {t('nav.signIn')}
          </Button>
        </form>
      </Card>
    </div>
  );
}
