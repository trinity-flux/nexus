import { Card, EmptyState, Input, Skeleton } from '@trinity-nexus/ui';
import { Search, SearchX } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';

import { useI18n } from '@/shared/i18n/useI18n';

import { searchQueryChanged } from '../application/forumCommands';
import { HighlightedText } from './HighlightedText';
import { useForumDispatch, useForumSelector } from './useForum';

const SEARCH_INPUT_ID = 'search-page-query';

export function SearchPage() {
  const dispatch = useForumDispatch();
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();

  // The URL seeds the box once. After that the box leads and the URL follows,
  // because reading it back on every keystroke would make the query round-trip
  // through the router before a letter could appear.
  const [draft, setDraft] = useState(() => params.get('q') ?? '');

  const { query, results, status } = useForumSelector((forum) => forum.search);

  useEffect(() => {
    dispatch(searchQueryChanged({ query: draft }));
  }, [dispatch, draft]);

  // `replace` so that typing a nine-letter word does not leave nine entries in
  // the history for the back button to walk through one letter at a time.
  useEffect(() => {
    setParams(draft ? { q: draft } : {}, { replace: true });
  }, [draft, setParams]);

  const trimmed = draft.trim();
  // The results belong to `query`, which lags the box by the debounce. Showing
  // the older count against the newer word is how a search box comes to read
  // "0 results" for something that has results.
  const isSettled = status === 'ready' && query === trimmed;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-semibold text-2xl text-fg tracking-tight">{t('search.heading')}</h1>

        <div className="relative">
          <label className="sr-only" htmlFor={SEARCH_INPUT_ID}>
            {t('search.heading')}
          </label>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle"
          />
          <Input
            // The only autofocus in the application. It is defensible here and
            // nowhere else: this page exists to be typed into, and someone who
            // arrived by pressing the search icon has already said so.
            autoFocus
            className="pl-9"
            id={SEARCH_INPUT_ID}
            onChange={(event) => {
              setDraft(event.target.value);
            }}
            placeholder={t('search.placeholder')}
            type="search"
            value={draft}
          />
        </div>

        {/*
          Announced rather than merely displayed. Results replacing themselves
          under a search box is silent to a screen reader unless the count is
          in a live region, and `polite` waits for a pause in typing instead of
          interrupting every letter.
        */}
        <p aria-live="polite" className="min-h-5 text-fg-subtle text-sm">
          {isSettled && trimmed ? t('search.resultCount', { count: results.length, query }) : ' '}
        </p>
      </div>

      {trimmed.length === 0 ? (
        <EmptyState
          description={t('search.prompt.description')}
          icon={Search}
          title={t('search.prompt.title')}
        />
      ) : !isSettled ? (
        <ResultsSkeleton loadingLabel={t('common.loading')} />
      ) : results.length === 0 ? (
        <EmptyState
          description={t('search.empty.description', { query })}
          icon={SearchX}
          title={t('search.empty.title')}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {results.map((result) => (
            <li key={result.topic.id}>
              <Card interactive>
                <Link
                  className="flex flex-col gap-1 p-4"
                  to={`/c/${result.categorySlug}/${result.topic.slug}`}
                >
                  <span className="font-medium text-fg">
                    <HighlightedText matches={result.matches} text={result.excerpt} />
                  </span>
                  <span className="text-fg-subtle text-xs">
                    {t('topics.startedBy', { author: result.topic.author?.displayName ?? '—' })} ·{' '}
                    {t('topics.replyCount', { count: result.topic.replyCount })}
                  </span>
                </Link>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ResultsSkeleton({ loadingLabel }: { loadingLabel: string }) {
  return (
    <div aria-busy="true" className="flex flex-col gap-2">
      {[0, 1, 2].map((row) => (
        <Card className="flex flex-col gap-2 p-4" key={row}>
          <Skeleton className="h-5 w-72" />
          <Skeleton className="h-3 w-40" />
        </Card>
      ))}
      <span className="sr-only">{loadingLabel}</span>
    </div>
  );
}
