import {
  type Author,
  asCategoryId,
  asPostId,
  asProfileId,
  asTopicId,
  type Category,
  type Post,
  type Topic,
} from '../domain/entities';

/**
 * Sample content for the in-memory adapter.
 *
 * Its job is to make the interface honest before there is a backend: real
 * prose of realistic length, nested replies, a pinned topic, a locked one and
 * a removed post — so layout, truncation and empty states are exercised by
 * something other than "Lorem ipsum", which hides every text-overflow bug
 * there is.
 */

const now = Date.now();
const minutesAgo = (minutes: number) => new Date(now - minutes * 60_000).toISOString();

const thrall: Author = {
  id: asProfileId('p-thrall'),
  username: 'thrall',
  displayName: 'Thrall',
  avatarUrl: null,
  role: 'admin',
};

const jaina: Author = {
  id: asProfileId('p-jaina'),
  username: 'jaina',
  displayName: 'Jaina Proudmoore',
  avatarUrl: null,
  role: 'moderator',
};

const rexxar: Author = {
  id: asProfileId('p-rexxar'),
  username: 'rexxar',
  displayName: 'Rexxar',
  avatarUrl: null,
  role: 'member',
};

const vereesa: Author = {
  id: asProfileId('p-vereesa'),
  username: 'vereesa',
  displayName: 'Vereesa',
  avatarUrl: null,
  role: 'member',
};

export const SEED_AUTHORS = [thrall, jaina, rexxar, vereesa];

export const SEED_CATEGORIES: Category[] = [
  {
    id: asCategoryId('c-announcements'),
    slug: 'announcements',
    name: 'Announcements',
    description: 'Server news, patch notes and scheduled maintenance.',
    isLocked: true,
    allowsAnonymous: false,
    topicCount: 1,
  },
  {
    id: asCategoryId('c-general'),
    slug: 'general',
    name: 'General Discussion',
    description: 'Anything about the realm that does not fit elsewhere.',
    isLocked: false,
    allowsAnonymous: false,
    topicCount: 3,
  },
  {
    id: asCategoryId('c-guides'),
    slug: 'guides',
    name: 'Guides & Strategy',
    description: 'Class guides, raid tactics, professions and levelling routes.',
    isLocked: false,
    allowsAnonymous: false,
    topicCount: 1,
  },
  {
    id: asCategoryId('c-guilds'),
    slug: 'guilds',
    name: 'Guilds & Recruitment',
    description: 'Find a guild, or find members for yours.',
    isLocked: false,
    allowsAnonymous: false,
    topicCount: 0,
  },
  {
    id: asCategoryId('c-marketplace'),
    slug: 'marketplace',
    name: 'Trading Post',
    description: 'In-game trades, auctions and services.',
    isLocked: false,
    allowsAnonymous: false,
    topicCount: 0,
  },
  {
    id: asCategoryId('c-support'),
    slug: 'support',
    name: 'Help & Support',
    description: 'Account trouble, bug reports and questions.',
    isLocked: false,
    allowsAnonymous: true,
    topicCount: 1,
  },
  {
    id: asCategoryId('c-off-topic'),
    slug: 'off-topic',
    name: 'Off Topic',
    description: 'Everything else.',
    isLocked: false,
    allowsAnonymous: false,
    topicCount: 0,
  },
];

export const SEED_TOPICS: Topic[] = [
  {
    id: asTopicId('t-maintenance'),
    categoryId: asCategoryId('c-announcements'),
    slug: 'scheduled-maintenance-this-sunday',
    title: 'Scheduled maintenance this Sunday, 03:00–06:00 server time',
    author: thrall,
    isPinned: true,
    isLocked: true,
    replyCount: 4,
    lastActivityAt: minutesAgo(38),
    createdAt: minutesAgo(2880),
  },
  {
    id: asTopicId('t-northrend'),
    categoryId: asCategoryId('c-general'),
    slug: 'how-do-i-get-to-northrend',
    title: 'How do I get to Northrend at level 68?',
    author: rexxar,
    isPinned: false,
    isLocked: false,
    replyCount: 6,
    lastActivityAt: minutesAgo(12),
    createdAt: minutesAgo(240),
  },
  {
    id: asTopicId('t-server-rates'),
    categoryId: asCategoryId('c-general'),
    slug: 'thoughts-on-the-new-experience-rates',
    title: 'Thoughts on the new experience rates?',
    author: vereesa,
    isPinned: false,
    isLocked: false,
    replyCount: 2,
    lastActivityAt: minutesAgo(95),
    createdAt: minutesAgo(600),
  },
  {
    id: asTopicId('t-addons'),
    categoryId: asCategoryId('c-general'),
    slug: 'which-addons-still-work-on-3-3-5a',
    title: 'Which addons still work on 3.3.5a?',
    author: jaina,
    isPinned: false,
    isLocked: false,
    replyCount: 0,
    lastActivityAt: minutesAgo(180),
    createdAt: minutesAgo(180),
  },
  {
    id: asTopicId('t-enchanting'),
    categoryId: asCategoryId('c-guides'),
    slug: 'enchanting-1-450-without-going-broke',
    title: 'Enchanting 1–450 without going broke',
    author: jaina,
    isPinned: false,
    isLocked: false,
    replyCount: 1,
    lastActivityAt: minutesAgo(420),
    createdAt: minutesAgo(1440),
  },
  {
    id: asTopicId('t-login-loop'),
    categoryId: asCategoryId('c-support'),
    slug: 'stuck-in-a-login-loop-after-the-patch',
    title: 'Stuck in a login loop after the patch',
    author: null,
    isPinned: false,
    isLocked: false,
    replyCount: 1,
    lastActivityAt: minutesAgo(55),
    createdAt: minutesAgo(70),
  },
];

const northrend = asTopicId('t-northrend');

export const SEED_POSTS: Post[] = [
  {
    id: asPostId('po-1'),
    topicId: northrend,
    parentId: null,
    author: rexxar,
    bodyMarkdown:
      'I hit 68 last night and I cannot find the boat. I have looked around Stormwind harbour for twenty minutes and there is nothing marked on my map. Am I missing a quest?',
    path: [asPostId('po-1')],
    depth: 0,
    isOpeningPost: true,
    editedAt: null,
    createdAt: minutesAgo(240),
    isRemoved: false,
  },
  {
    id: asPostId('po-2'),
    topicId: northrend,
    parentId: null,
    author: jaina,
    bodyMarkdown:
      'Two routes. From **Stormwind** take the boat at the far end of the harbour to Borean Tundra. From **Menethil Harbour** in Wetlands, the northern dock goes to Howling Fjord.\n\nBorean Tundra is the gentler start if this is your first character.',
    path: [asPostId('po-2')],
    depth: 0,
    isOpeningPost: false,
    editedAt: minutesAgo(200),
    createdAt: minutesAgo(210),
    isRemoved: false,
  },
  {
    id: asPostId('po-3'),
    topicId: northrend,
    parentId: asPostId('po-2'),
    author: rexxar,
    bodyMarkdown: 'Found it, thank you. It was behind the ship I kept walking past.',
    path: [asPostId('po-2'), asPostId('po-3')],
    depth: 1,
    isOpeningPost: false,
    editedAt: null,
    createdAt: minutesAgo(180),
    isRemoved: false,
  },
  {
    id: asPostId('po-4'),
    topicId: northrend,
    parentId: asPostId('po-2'),
    author: vereesa,
    bodyMarkdown:
      'Worth adding: Howling Fjord has the better quest chain if you have already levelled through Borean Tundra on another character.',
    path: [asPostId('po-2'), asPostId('po-4')],
    depth: 1,
    isOpeningPost: false,
    editedAt: null,
    createdAt: minutesAgo(140),
    isRemoved: false,
  },
  {
    id: asPostId('po-5'),
    topicId: northrend,
    parentId: asPostId('po-4'),
    author: jaina,
    bodyMarkdown: 'Agreed, and the flight paths connect sooner from that side.',
    path: [asPostId('po-2'), asPostId('po-4'), asPostId('po-5')],
    depth: 2,
    isOpeningPost: false,
    editedAt: null,
    createdAt: minutesAgo(60),
    isRemoved: false,
  },
  {
    id: asPostId('po-6'),
    topicId: northrend,
    // The parent was removed and is not in this list. The thread builder
    // reattaches this to the nearest surviving ancestor rather than dropping
    // it, which is the case the seed exists to exercise.
    parentId: asPostId('po-removed'),
    author: vereesa,
    bodyMarkdown: 'Please keep it civil, this is someone’s first character.',
    path: [asPostId('po-2'), asPostId('po-removed'), asPostId('po-6')],
    depth: 2,
    isOpeningPost: false,
    editedAt: null,
    createdAt: minutesAgo(30),
    isRemoved: false,
  },
  {
    id: asPostId('po-7'),
    topicId: northrend,
    parentId: null,
    author: null,
    bodyMarkdown: '',
    path: [asPostId('po-7')],
    depth: 0,
    isOpeningPost: false,
    editedAt: null,
    createdAt: minutesAgo(12),
    isRemoved: true,
  },
];
