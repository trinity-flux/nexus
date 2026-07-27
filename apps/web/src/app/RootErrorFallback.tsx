import { ErrorState } from '@trinity-nexus/ui';

import { useI18n } from '@/shared/i18n/useI18n';

/**
 * Shown when the error boundary catches something.
 *
 * It sits *inside* the i18n provider, so if the provider itself is what failed
 * this component would fail too. The boundary is mounted outside it deliberately
 * and this is rendered as its fallback child — React unmounts the broken
 * subtree, and the providers above it are re-created on retry.
 */
export function RootErrorFallback({ onRetry }: { onRetry: () => void }) {
  const { t } = useI18n();

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg items-center px-4">
      <ErrorState
        className="w-full"
        description={t('error.generic.description')}
        onRetry={onRetry}
        retryLabel={t('error.retry')}
        title={t('error.generic.title')}
      />
    </div>
  );
}
