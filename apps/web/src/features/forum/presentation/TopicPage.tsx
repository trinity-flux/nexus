import { Avatar, Badge, Button, Card, ErrorState, Separator, Skeleton } from '@trinity-nexus/ui';
import { Lock, Pin } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router';

import { useI18n } from '@/shared/i18n/useI18n';
import { loadThread, stopWatching, watchThread } from '../application/forumCommands';
import type { Post } from '../domain/entities';
import { buildThreadTree, type ThreadNode } from '../domain/threadTree';
import { useForumDispatch, useForumSelector } from './useForum';

export function TopicPage() {
  const { categorySlug = '', topicSlug = '' } = useParams();
  const dispatch = useForumDispatch();
  const { t, formatRelativeTime } = useI18n();

  const { topic, posts, status } = useForumSelector((forum) => forum.thread);
  const error = useForumSelector((forum) => forum.error);

  useEffect(() => {
    dispatch(loadThread({ categorySlug, topicSlug }));
  }, [dispatch, categorySlug, topicSlug]);

  // The subscription starts once the topic id is known and is torn down on
  // navigation. Without the cleanup the socket stays open for every thread the
  // member has visited this session.
  useEffect(() => {
    if (!topic) {
      return;
    }
    dispatch(watchThread({ topicId: topic.id }));
    return () => {
      dispatch(stopWatching());
    };
  }, [dispatch, topic]);

  const tree = useMemo(() => buildThreadTree(posts), [posts]);

  if (status === 'failed') {
    return (
      <ErrorState
        description={error ?? t('error.notFound.description')}
        onRetry={() => dispatch(loadThread({ categorySlug, topicSlug }))}
        retryLabel={t('error.retry')}
        title={t('error.notFound.title')}
      />
    );
  }

  if (!topic || status === 'loading' || status === 'idle') {
    return <ThreadSkeleton loadingLabel={t('common.loading')} />;
  }

  return (
    <article className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Link className="text-fg-subtle text-sm hover:text-fg" to={`/c/${categorySlug}`}>
          ← {categorySlug}
        </Link>

        <h1 className="flex flex-wrap items-center gap-2 font-semibold text-2xl text-fg tracking-tight">
          {topic.isPinned ? <Pin aria-hidden="true" className="size-4 text-accent-text" /> : null}
          {topic.title}
        </h1>

        <p className="text-fg-subtle text-sm">
          {t('topics.startedBy', { author: topic.author?.displayName ?? '—' })} ·{' '}
          {formatRelativeTime(topic.createdAt)}
        </p>
      </header>

      {topic.isLocked ? (
        <div
          className="flex items-center gap-2 rounded-md border border-border-default bg-surface-raised px-4 py-3 text-fg-muted text-sm"
          role="status"
        >
          <Lock aria-hidden="true" className="size-4 shrink-0" />
          {t('topic.lockedNotice')}
        </div>
      ) : null}

      <Separator />

      <ol className="flex flex-col gap-4">
        {tree.map((node) => (
          <PostBranch key={node.post.id} node={node} />
        ))}
      </ol>

      {topic.isLocked ? null : (
        <div className="pt-2">
          <Button>{t('topic.reply')}</Button>
        </div>
      )}
    </article>
  );
}

function PostBranch({ node }: { node: ThreadNode }) {
  return (
    <li className="flex flex-col gap-4">
      <PostCard post={node.post} />

      {node.children.length > 0 ? (
        <ol
          className={
            // Indented with a left border rather than margin alone: the line is
            // what makes the nesting readable once there are three levels, and
            // it collapses gracefully on a narrow screen.
            'flex flex-col gap-4 border-border-default border-l pl-4 sm:pl-6'
          }
        >
          {node.children.map((child) => (
            <PostBranch key={child.post.id} node={child} />
          ))}
        </ol>
      ) : null}
    </li>
  );
}

function PostCard({ post }: { post: Post }) {
  const { t, formatRelativeTime } = useI18n();

  if (post.isRemoved) {
    return (
      <Card className="px-4 py-3">
        <p className="text-fg-subtle text-sm italic">{t('topic.deletedPost')}</p>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <Avatar
          name={post.author?.displayName ?? '—'}
          size="sm"
          src={post.author?.avatarUrl ?? undefined}
        />
        <span className="font-medium text-fg text-sm">{post.author?.displayName ?? '—'}</span>

        {post.author?.role === 'moderator' || post.author?.role === 'admin' ? (
          <Badge variant="accent">
            {post.author.role === 'admin' ? t('profile.role.admin') : t('profile.role.moderator')}
          </Badge>
        ) : null}

        <time className="text-fg-subtle text-xs" dateTime={post.createdAt}>
          {formatRelativeTime(post.createdAt)}
        </time>

        {post.editedAt ? (
          <span className="text-fg-subtle text-xs">
            {t('topic.editedAt', { when: formatRelativeTime(post.editedAt) })}
          </span>
        ) : null}
      </div>

      {/* Markdown rendering lands with the composer; until then the raw text is
          shown as plain text, which is safe by construction. */}
      <p className="whitespace-pre-wrap text-fg text-sm leading-relaxed">{post.bodyMarkdown}</p>
    </Card>
  );
}

function ThreadSkeleton({ loadingLabel }: { loadingLabel: string }) {
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-4 w-48" />
      <div className="flex flex-col gap-4">
        {[0, 1, 2].map((row) => (
          <Card className="flex flex-col gap-3 p-4" key={row}>
            <div className="flex items-center gap-2">
              <Skeleton className="size-6 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </Card>
        ))}
      </div>
      <span className="sr-only">{loadingLabel}</span>
    </div>
  );
}
