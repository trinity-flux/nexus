import { Card, EmptyState, ErrorState, Skeleton } from '@trinity-nexus/ui';
import { Lock, MessagesSquare } from 'lucide-react';
import { useEffect } from 'react';
import { Link } from 'react-router';

import { useI18n } from '@/shared/i18n/useI18n';

import { loadCategories } from '../application/forumCommands';
import { ForumBreadcrumbs } from './ForumBreadcrumbs';
import { useForumDispatch, useForumSelector } from './useForum';

export function CategoriesPage() {
  const dispatch = useForumDispatch();
  const { t } = useI18n();
  const { items, status } = useForumSelector((forum) => forum.categories);
  const error = useForumSelector((forum) => forum.error);

  useEffect(() => {
    dispatch(loadCategories());
  }, [dispatch]);

  if (status === 'failed') {
    return (
      <ErrorState
        description={error ?? t('error.generic.description')}
        onRetry={() => dispatch(loadCategories())}
        retryLabel={t('error.retry')}
        title={t('error.generic.title')}
      />
    );
  }

  if (status === 'idle' || status === 'loading') {
    return <CategoriesSkeleton loadingLabel={t('common.loading')} />;
  }

  if (items.length === 0) {
    return (
      <EmptyState
        description={t('categories.empty.description')}
        icon={MessagesSquare}
        title={t('categories.empty.title')}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <ForumBreadcrumbs />

      <h1 className="font-semibold text-2xl text-fg tracking-tight">{t('categories.heading')}</h1>

      <ul className="flex flex-col gap-3">
        {items.map((category) => (
          <li key={category.id}>
            <Card className="transition-colors duration-150 hover:border-border-strong" interactive>
              <Link
                className="flex items-start justify-between gap-4 p-4"
                to={`/c/${category.slug}`}
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="flex items-center gap-2 font-medium text-fg">
                    {category.name}
                    {category.isLocked ? (
                      <span className="inline-flex items-center gap-1 text-fg-subtle text-xs">
                        <Lock aria-hidden="true" className="size-3" />
                        {t('categories.locked')}
                      </span>
                    ) : null}
                  </span>
                  {category.description ? (
                    <span className="text-fg-muted text-sm">{category.description}</span>
                  ) : null}
                </div>

                <span className="shrink-0 whitespace-nowrap text-fg-subtle text-sm">
                  {t('categories.topicCount', { count: category.topicCount })}
                </span>
              </Link>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Shaped like the list it replaces, not a spinner: the height is reserved, so
 * nothing on the page moves when the data lands.
 */
function CategoriesSkeleton({ loadingLabel }: { loadingLabel: string }) {
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <Skeleton className="h-8 w-40" />
      <ul className="flex flex-col gap-3">
        {[0, 1, 2, 3, 4].map((row) => (
          <li key={row}>
            <Card className="flex items-start justify-between gap-4 p-4">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-72" />
              </div>
              <Skeleton className="h-4 w-16" />
            </Card>
          </li>
        ))}
      </ul>
      {/* Announced once for the whole region rather than once per rectangle. */}
      <span className="sr-only">{loadingLabel}</span>
    </div>
  );
}
