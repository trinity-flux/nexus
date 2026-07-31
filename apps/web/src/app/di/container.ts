import {
  type AuthRepository,
  InMemoryAuthRepository,
  SupabaseAuthRepository,
} from '@/features/auth';
import { env } from '@/shared/config/env';
import { createSupabaseClient } from '@/shared/supabase/createSupabaseClient';

import { createForumRepositories, type ForumRepositories } from './forumRepositories';

/**
 * Every dependency the application has on the outside world, in one object.
 *
 * This is the only place that knows whether the app is talking to Supabase or
 * to an in-memory store. Nothing else imports an adapter — the store, the
 * epics and the components all receive this and see only the port interfaces
 * declared in each feature's `domain/`.
 *
 * A hand-written object rather than a DI framework: with one composition root
 * and no lifecycle beyond "created once at startup", a container library would
 * add indirection and lose the type inference this gets for free.
 */
export interface Container {
  auth: AuthRepository;
  forum: ForumRepositories;
}

export function createContainer(): Container {
  const auth = createAuthRepository(env.dataSource);

  return {
    auth,
    // The forum is given the auth repository so the in-memory adapter can
    // attribute a post to whoever is signed in. See trackCurrentAuthor.
    forum: createForumRepositories(env.dataSource, auth),
  };
}

function createAuthRepository(dataSource: 'memory' | 'supabase'): AuthRepository {
  switch (dataSource) {
    case 'supabase':
      return new SupabaseAuthRepository(createSupabaseClient());
    case 'memory':
      return new InMemoryAuthRepository();
  }
}
