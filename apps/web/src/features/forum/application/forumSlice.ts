import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { Category, Post, Topic, TopicSort } from '../domain/entities';

export type LoadState = 'idle' | 'loading' | 'ready' | 'failed';

export interface ForumState {
  categories: {
    items: Category[];
    status: LoadState;
  };
  topics: {
    /** Keyed by category slug: two categories can be open in two tabs. */
    byCategory: Record<string, { items: Topic[]; nextCursor: string | null; status: LoadState }>;
    sort: TopicSort;
  };
  thread: {
    topic: Topic | null;
    posts: Post[];
    status: LoadState;
  };
  /** Set when the last request failed. Cleared on the next successful load. */
  error: string | null;
}

const initialState: ForumState = {
  categories: { items: [], status: 'idle' },
  topics: { byCategory: {}, sort: 'recent' },
  thread: { topic: null, posts: [], status: 'idle' },
  error: null,
};

const emptyBucket = {
  items: [] as Topic[],
  nextCursor: null as string | null,
  status: 'idle' as LoadState,
};

export const forumSlice = createSlice({
  name: 'forum',
  initialState,
  reducers: {
    // --- categories ---
    categoriesRequested(state) {
      state.categories.status = 'loading';
    },
    categoriesLoaded(state, action: PayloadAction<Category[]>) {
      state.categories.items = action.payload;
      state.categories.status = 'ready';
      state.error = null;
    },

    // --- topic lists ---
    topicsRequested(state, action: PayloadAction<{ categorySlug: string; cursor: string | null }>) {
      const bucket = state.topics.byCategory[action.payload.categorySlug] ?? { ...emptyBucket };
      bucket.status = 'loading';
      state.topics.byCategory[action.payload.categorySlug] = bucket;
    },
    topicsLoaded(
      state,
      action: PayloadAction<{
        categorySlug: string;
        items: Topic[];
        nextCursor: string | null;
        append: boolean;
      }>,
    ) {
      const { categorySlug, items, nextCursor, append } = action.payload;
      const bucket = state.topics.byCategory[categorySlug] ?? { ...emptyBucket };

      // Deduplicated on append because a realtime insert can arrive between
      // the two pages and would otherwise appear twice.
      bucket.items = append ? mergeById([...bucket.items, ...items]) : items;
      bucket.nextCursor = nextCursor;
      bucket.status = 'ready';
      state.topics.byCategory[categorySlug] = bucket;
      state.error = null;
    },
    sortChanged(state, action: PayloadAction<TopicSort>) {
      state.topics.sort = action.payload;
      // The cached pages were ordered by the previous sort, so they are
      // dropped rather than reordered locally: local reordering would only be
      // correct for the pages already fetched.
      state.topics.byCategory = {};
    },
    topicReceived(state, action: PayloadAction<{ categorySlug: string; topic: Topic }>) {
      const bucket = state.topics.byCategory[action.payload.categorySlug];
      if (bucket) {
        bucket.items = mergeById([action.payload.topic, ...bucket.items]);
      }
    },

    // --- one thread ---
    threadRequested(state) {
      state.thread.status = 'loading';
      state.thread.topic = null;
      state.thread.posts = [];
    },
    threadLoaded(state, action: PayloadAction<{ topic: Topic; posts: Post[] }>) {
      state.thread.topic = action.payload.topic;
      state.thread.posts = action.payload.posts;
      state.thread.status = 'ready';
      state.error = null;
    },
    postReceived(state, action: PayloadAction<Post>) {
      if (state.thread.topic?.id !== action.payload.topicId) {
        return;
      }
      const existing = state.thread.posts.findIndex((post) => post.id === action.payload.id);
      if (existing >= 0) {
        state.thread.posts[existing] = action.payload;
      } else {
        state.thread.posts.push(action.payload);
      }
    },

    requestFailed(state, action: PayloadAction<string>) {
      state.error = action.payload;
      if (state.categories.status === 'loading') {
        state.categories.status = 'failed';
      }
      if (state.thread.status === 'loading') {
        state.thread.status = 'failed';
      }
      for (const bucket of Object.values(state.topics.byCategory)) {
        if (bucket.status === 'loading') {
          bucket.status = 'failed';
        }
      }
    },
  },
});

function mergeById(topics: Topic[]): Topic[] {
  const seen = new Map<string, Topic>();
  for (const topic of topics) {
    seen.set(topic.id, topic);
  }
  return [...seen.values()];
}

export const forumActions = forumSlice.actions;
export const forumReducer = forumSlice.reducer;
