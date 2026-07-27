import type { Author } from '../domain/entities';
import type {
  CategoryRepository,
  PostRepository,
  SearchRepository,
  TopicRepository,
} from '../domain/ports';
import { InMemoryForumRepository } from './InMemoryForumRepository';

export interface InMemoryForum {
  categories: CategoryRepository;
  topics: TopicRepository;
  posts: PostRepository;
  search: SearchRepository;
}

/**
 * One store behind four ports.
 *
 * A single object implements all four because they share state — a reply has
 * to move the topic's `lastActivityAt` — while the consumers still see four
 * narrow interfaces and cannot reach across them.
 */
export interface InMemoryForumOptions {
  latencyMs?: number;
  /** Who is writing. See the note on InMemoryForumRepository's constructor. */
  currentAuthor?: () => Author | null;
}

export function createInMemoryForum(options: InMemoryForumOptions = {}): InMemoryForum {
  const store = new InMemoryForumRepository(options.latencyMs, {
    ...(options.currentAuthor ? { currentAuthor: options.currentAuthor } : {}),
  });

  return {
    categories: {
      list: () => store.listCategories(),
      findBySlug: (slug) => store.findCategoryBySlug(slug),
    },
    topics: {
      list: (query) => store.listTopics(query),
      findBySlug: (categorySlug, topicSlug) => store.findTopicBySlug(categorySlug, topicSlug),
      create: (draft) => store.createTopic(draft),
      updateTitle: (id, title) => store.updateTitle(id, title),
      remove: (id) => store.removeTopic(id),
      watchCategory: (categoryId) => store.watchCategory(categoryId),
    },
    posts: {
      listByTopic: (topicId) => store.listByTopic(topicId),
      reply: (draft) => store.createReply(draft),
      edit: (id, body) => store.editPost(id, body),
      remove: (id) => store.removePost(id),
      watchTopic: (topicId) => store.watchTopic(topicId),
    },
    search: {
      search: (query, limit) => store.search(query, limit),
    },
  };
}
