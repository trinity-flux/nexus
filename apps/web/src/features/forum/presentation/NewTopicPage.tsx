import { ErrorState } from '@trinity-nexus/ui';
import { useEffect } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';

import { useAuth } from '@/features/auth';
import { useI18n } from '@/shared/i18n/useI18n';

import { createTopic, loadCategories } from '../application/forumCommands';
import { forumActions } from '../application/forumSlice';
import { Composer } from './Composer';
import { useForumDispatch, useForumSelector } from './useForum';

export function NewTopicPage() {
  const { categorySlug = '' } = useParams();
  const navigate = useNavigate();
  const dispatch = useForumDispatch();
  const { t } = useI18n();
  const { isReady, canPost } = useAuth();

  const submitting = useForumSelector((forum) => forum.submitting);
  const createdSlug = useForumSelector((forum) => forum.createdTopicSlug);
  const category = useForumSelector((forum) =>
    forum.categories.items.find((entry) => entry.slug === categorySlug),
  );
  const error = useForumSelector((forum) => forum.error);

  // The category list may not be loaded if this page was opened directly from
  // a bookmark rather than reached by navigation.
  useEffect(() => {
    if (!category) {
      dispatch(loadCategories());
    }
  }, [dispatch, category]);

  // Navigation happens here rather than in the epic: an epic that knows about
  // the router is an epic that cannot be tested without one.
  useEffect(() => {
    if (createdSlug) {
      dispatch(forumActions.navigationConsumed());
      void navigate(`/c/${categorySlug}/${createdSlug}`, { replace: true });
    }
  }, [createdSlug, categorySlug, dispatch, navigate]);

  if (!isReady) {
    return null;
  }

  if (!canPost) {
    // `next` so signing in returns here with the draft intent intact rather
    // than dropping the member on the home page.
    return <Navigate replace to={`/sign-in?next=/c/${categorySlug}/new`} />;
  }

  if (category?.isLocked) {
    return <ErrorState description={t('topic.lockedNotice')} title={t('categories.locked')} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link className="text-fg-subtle text-sm hover:text-fg" to={`/c/${categorySlug}`}>
          ← {category?.name ?? categorySlug}
        </Link>
        <h1 className="font-semibold text-2xl text-fg tracking-tight">{t('topics.new')}</h1>
      </div>

      {error ? <p className="text-danger-text text-sm">{error}</p> : null}

      <Composer
        onCancel={() => {
          void navigate(`/c/${categorySlug}`);
        }}
        onSubmit={({ title, body }) => {
          dispatch(createTopic({ categorySlug, title, bodyMarkdown: body }));
        }}
        submitting={submitting}
        withTitle
      />
    </div>
  );
}
