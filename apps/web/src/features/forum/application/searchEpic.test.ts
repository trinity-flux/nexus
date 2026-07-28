import type { UnknownAction } from '@reduxjs/toolkit';
import { Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { asCategoryId, asTopicId, type Topic } from '../domain/entities';
import type { SearchRepository, SearchResult } from '../domain/ports';
import { searchQueryChanged } from './forumCommands';
import { type ForumEpicDependencies, forumEpic } from './forumEpics';
import { forumActions } from './forumSlice';

/**
 * Real timers rather than marble diagrams.
 *
 * The repository returns a promise, and a promise settles on the microtask
 * queue, which `TestScheduler`'s virtual clock does not control. A marble test
 * here would pass while asserting nothing about the debounce.
 */
const DEBOUNCE_MS = 250;
const SETTLE_MS = 120;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function topic(title: string): Topic {
  return {
    id: asTopicId(`t-${title}`),
    categoryId: asCategoryId('c-general'),
    slug: title,
    title,
    author: null,
    isPinned: false,
    isLocked: false,
    replyCount: 0,
    lastActivityAt: '2026-07-01T00:00:00.000Z',
    createdAt: '2026-07-01T00:00:00.000Z',
  };
}

function resultFor(title: string): SearchResult {
  return { topic: topic(title), categorySlug: 'general', excerpt: title, matches: [] };
}

/**
 * The repositories the search epic must not reach.
 *
 * They throw rather than being left undefined, so that a search that somehow
 * triggered a category or thread load fails loudly here instead of quietly in
 * the browser.
 */
function forbiddenRepositories(): Omit<ForumEpicDependencies['forum'], 'search'> {
  const unreachable = () => {
    throw new Error('A search must not reach this repository.');
  };

  return {
    categories: { list: unreachable, findBySlug: unreachable },
    topics: {
      list: unreachable,
      findBySlug: unreachable,
      create: unreachable,
      updateTitle: unreachable,
      remove: unreachable,
      watchCategory: unreachable,
    },
    posts: {
      listByTopic: unreachable,
      reply: unreachable,
      edit: unreachable,
      remove: unreachable,
      watchTopic: unreachable,
    },
  } as unknown as Omit<ForumEpicDependencies['forum'], 'search'>;
}

function runEpic(search: SearchRepository) {
  const action$ = new Subject<UnknownAction>();
  const state$ = new Subject<unknown>();
  const emitted: UnknownAction[] = [];

  const subscription = forumEpic(
    action$ as never,
    state$ as never,
    { forum: { ...forbiddenRepositories(), search } } as never,
  ).subscribe((action) => emitted.push(action as UnknownAction));

  return {
    emitted,
    type: (query: string) => {
      action$.next(searchQueryChanged({ query }));
    },
    stop: () => {
      subscription.unsubscribe();
    },
  };
}

describe('the search epic', () => {
  it('sends one request for a burst of keystrokes', async () => {
    const search = vi.fn(async () => [resultFor('Northrend')]);
    const epic = runEpic({ search });

    for (const query of ['n', 'no', 'nor', 'nort']) {
      epic.type(query);
    }
    await wait(DEBOUNCE_MS + SETTLE_MS);
    epic.stop();

    // Four keystrokes, one request. Without the debounce this is four.
    expect(search).toHaveBeenCalledTimes(1);
    expect(search).toHaveBeenCalledWith('nort');
    expect(epic.emitted).toEqual([
      forumActions.searchRequested('nort'),
      forumActions.searchCompleted({ query: 'nort', results: [resultFor('Northrend')] }),
    ]);
  });

  it('does not search again when only the surrounding whitespace changed', async () => {
    const search = vi.fn(async () => []);
    const epic = runEpic({ search });

    epic.type('boat');
    await wait(DEBOUNCE_MS + SETTLE_MS);
    epic.type('  boat  ');
    await wait(DEBOUNCE_MS + SETTLE_MS);
    epic.stop();

    expect(search).toHaveBeenCalledTimes(1);
  });

  it('clears the results without a request when the box is emptied', async () => {
    const search = vi.fn(async () => []);
    const epic = runEpic({ search });

    epic.type('   ');
    await wait(DEBOUNCE_MS + SETTLE_MS);
    epic.stop();

    expect(search).not.toHaveBeenCalled();
    expect(epic.emitted).toEqual([forumActions.searchRequested('')]);
  });

  it('discards the answer to a query the member has already replaced', async () => {
    // The defect this exists for: "no" is slow, "northrend" is fast, and
    // without switchMap the slow answer lands last and wins.
    const search = vi.fn(async (query: string) => {
      await wait(query === 'no' ? 300 : 10);
      return [resultFor(query)];
    });
    const epic = runEpic({ search });

    epic.type('no');
    await wait(DEBOUNCE_MS + 20);
    epic.type('northrend');
    await wait(DEBOUNCE_MS + 400);
    epic.stop();

    const completions = epic.emitted.filter(
      (action) => action.type === forumActions.searchCompleted.type,
    );

    expect(search).toHaveBeenCalledTimes(2);
    // One completion, for the query still in the box. The cancelled request's
    // answer never becomes an action at all.
    expect(completions).toEqual([
      forumActions.searchCompleted({ query: 'northrend', results: [resultFor('northrend')] }),
    ]);
  });
});
