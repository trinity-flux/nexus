import { useEffect } from 'react';

import { loadCategories } from '../application/forumCommands';
import type { Category } from '../domain/entities';
import { useForumDispatch, useForumSelector } from './useForum';

/**
 * The category a page is showing, loading the list if it is not there yet.
 *
 * Pages under `/c/:categorySlug` are shared, bookmarked and linked from
 * Discord, so the first render of a session is routinely a deep URL with an
 * empty store. Without this the page falls back to the slug — a heading and a
 * breadcrumb reading "wow-general" instead of "General discussion".
 *
 * The fetch is gated on `idle` rather than on the category being absent: a slug
 * that does not exist would otherwise re-request the whole list on every
 * render, forever.
 */
export function useCategory(slug: string): Category | undefined {
  const dispatch = useForumDispatch();
  const status = useForumSelector((forum) => forum.categories.status);
  const category = useForumSelector((forum) =>
    forum.categories.items.find((entry) => entry.slug === slug),
  );

  useEffect(() => {
    if (status === 'idle') {
      dispatch(loadCategories());
    }
  }, [dispatch, status]);

  return category;
}
