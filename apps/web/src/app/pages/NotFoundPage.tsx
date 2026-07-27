import { Button, EmptyState } from '@trinity-nexus/ui';
import { Compass } from 'lucide-react';
import { Link } from 'react-router';

import { useI18n } from '@/shared/i18n/useI18n';

export function NotFoundPage() {
  const { t } = useI18n();

  return (
    <EmptyState
      action={
        <Button asChild variant="secondary">
          <Link to="/c">{t('error.notFound.action')}</Link>
        </Button>
      }
      description={t('error.notFound.description')}
      icon={Compass}
      title={t('error.notFound.title')}
    />
  );
}
