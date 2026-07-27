import { env } from '@/shared/config/env';

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
  forum: ForumRepositories;
}

export function createContainer(): Container {
  return {
    forum: createForumRepositories(env.dataSource),
  };
}
