import {
  type CategoryRepository,
  createInMemoryForum,
  type PostRepository,
  type SearchRepository,
  type TopicRepository,
} from '@/features/forum';

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
export function createForumRepositories(dataSource: 'memory' | 'supabase'): ForumRepositories {
  switch (dataSource) {
    case 'supabase':
      // Deliberately not silently falling back to the in-memory adapter. A
      // deployment configured for Supabase that quietly serves sample content
      // looks like it works, and the first person to notice is a member whose
      // post disappeared on reload.
      throw new Error(
        'The Supabase adapters are not wired up yet. Set VITE_DATA_SOURCE=memory until the project exists.',
      );
    case 'memory':
      return createInMemoryForum();
  }
}
