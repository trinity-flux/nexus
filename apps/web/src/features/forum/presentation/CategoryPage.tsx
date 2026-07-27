import { Badge, Button, Card, EmptyState, ErrorState, Skeleton } from '@trinity-nexus/ui';
import { Lock, MessageSquare, Pin } from 'lucide-react';
import { useEffect } from 'react';
import { Link, useParams } from 'react-router';

import { useI18n } from '@/shared/i18n/useI18n';

import { loadTopics } from '../application/forumCommands';
import { ForumBreadcrumbs } from './ForumBreadcrumbs';
import { useCategory } from './useCategory';
import { useForumDispatch, useForumSelector } from './useForum';

export function CategoryPage() {
  const { categorySlug = '' } = useParams();
  const dispatch = useForumDispatch();
  const { t, formatRelativeTime } = useI18n();

  const sort = useForumSelector((forum) => forum.topics.sort);
  const bucket = useForumSelector((forum) => forum.topics.byCategory[categorySlug]);
  const category = useCategory(categorySlug);
  const error = useForumSelector((forum) => forum.error);

  useEffect(() => {
    dispatch(loadTopics({ categorySlug, sort }));
  }, [dispatch, categorySlug, sort]);

  const status = bucket?.status ?? 'idle';

  if (status === 'failed') {
    return (
      <ErrorState
        description={error ?? t('error.generic.description')}
        onRetry={() => dispatch(loadTopics({ categorySlug, sort }))}
        retryLabel={t('error.retry')}
        title={t('error.generic.title')}
      />
    );
  }

  const topics = bucket?.items ?? [];
  const isFirstLoad = status !== 'ready' && topics.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <ForumBreadcrumbs current={category?.name ?? categorySlug} />

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-semibold text-2xl text-fg tracking-tight">
            {category?.name ?? categorySlug}
          </h1>
          {category?.description ? (
            <p className="text-fg-muted text-sm">{category.description}</p>
          ) : null}
        </div>

        {category?.isLocked ? (
          <Badge variant="neutral">
            <Lock aria-hidden="true" className="size-3" />
            {t('categories.locked')}
          </Badge>
        ) : (
          <Button asChild size="sm">
            <Link to={`/c/${categorySlug}/new`}>{t('topics.new')}</Link>
          </Button>
        )}
      </header>

      {isFirstLoad ? (
        <TopicsSkeleton loadingLabel={t('common.loading')} />
      ) : topics.length === 0 ? (
        <EmptyState
          action={
            category?.isLocked ? undefined : <Button size="sm">{t('topics.empty.action')}</Button>
          }
          description={t('topics.empty.description')}
          icon={MessageSquare}
          title={t('topics.empty.title')}
        />
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {topics.map((topic) => (
              <li key={topic.id}>
                <Card interactive>
                  <Link
                    className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
                    to={`/c/${categorySlug}/${topic.slug}`}
                  >
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="flex flex-wrap items-center gap-2">
                        {topic.isPinned ? (
                          <Pin aria-hidden="true" className="size-3.5 text-accent-text" />
                        ) : null}
                        <span className="font-medium text-fg">{topic.title}</span>
                        {topic.isLocked ? (
                          <Badge variant="neutral">{t('topics.locked')}</Badge>
                        ) : null}
                      </span>
                      <span className="text-fg-subtle text-xs">
                        {t('topics.startedBy', { author: topic.author?.displayName ?? '—' })} ·{' '}
                        {t('topics.lastActivity', {
                          when: formatRelativeTime(topic.lastActivityAt),
                        })}
                      </span>
                    </div>

                    <span className="shrink-0 whitespace-nowrap text-fg-subtle text-sm">
                      {t('topics.replyCount', { count: topic.replyCount })}
                    </span>
                  </Link>
                </Card>
              </li>
            ))}
          </ul>

          {bucket?.nextCursor ? (
            <Button
              loading={status === 'loading'}
              onClick={() =>
                dispatch(loadTopics({ categorySlug, sort, cursor: bucket.nextCursor }))
              }
              variant="secondary"
            >
              {t('topics.loadMore')}
            </Button>
          ) : null}
        </>
      )}
    </div>
  );
}

function TopicsSkeleton({ loadingLabel }: { loadingLabel: string }) {
  return (
    <div aria-busy="true" className="flex flex-col gap-2">
      {[0, 1, 2, 3].map((row) => (
        <Card className="flex items-center justify-between gap-4 p-4" key={row}>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-64" />
            <Skeleton className="h-3 w-40" />
          </div>
          <Skeleton className="h-4 w-20" />
        </Card>
      ))}
      <span className="sr-only">{loadingLabel}</span>
    </div>
  );
}
