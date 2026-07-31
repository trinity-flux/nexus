import { firstValueFrom } from 'rxjs';

import type { AuthRepository, Session } from '@/features/auth';
import {
  type Author,
  asProfileId,
  type CategoryRepository,
  createInMemoryForum,
  createSupabaseForum,
  type PostRepository,
  type SearchRepository,
  type TopicRepository,
} from '@/features/forum';
import { createSupabaseClient } from '@/shared/supabase/createSupabaseClient';

export interface ForumRepositories {
  categories: CategoryRepository;
  topics: TopicRepository;
  posts: PostRepository;
  search: SearchRepository;
}

/**
 * Chooses the forum adapters for the configured data source.
 *
 * When the Supabase project exists, this gains a `case 'supabase'` and nothing
 * else in the application changes. That is the whole return on defining the
 * ports: the blast radius of swapping the backend is this function.
 */
export function createForumRepositories(
  dataSource: 'memory' | 'supabase',
  auth: AuthRepository,
): ForumRepositories {
  switch (dataSource) {
    case 'supabase':
      // No `currentAuthor` here, and that is the point: against Postgres the
      // author is not the client's to state. `auth.uid()` fills `author_id`,
      // so a tampered request cannot post as somebody else.
      return createSupabaseForum(createSupabaseClient());
    case 'memory':
      return createInMemoryForum({ currentAuthor: trackCurrentAuthor(auth) });
  }
}

/**
 * Supplies the in-memory forum with whoever is signed in.
 *
 * This is the composition root doing the one job only it can do: the forum
 * must not import the auth feature, and auth must not know a forum exists. It
 * exists at all only because the in-memory adapter has no server to ask —
 * against Supabase, Postgres fills `author_id` from `auth.uid()` and the
 * client never gets a say.
 */
function trackCurrentAuthor(auth: AuthRepository): () => Author | null {
  let current: Session | null = null;

  // Subscribed rather than read on demand, because the getter is synchronous
  // and the session is not.
  auth.onSessionChange().subscribe((session) => {
    current = session;
  });

  // Seeds the value for the case where a session was restored from storage
  // before this subscription existed.
  void firstValueFrom(auth.onSessionChange()).then((session) => {
    current ??= session;
  });

  return () => {
    if (!current) {
      return null;
    }

    const { member } = current;
    return {
      id: asProfileId(member.id),
      username: member.username,
      displayName: member.displayName,
      avatarUrl: member.avatarUrl,
      role: member.role,
    };
  };
}
