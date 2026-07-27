-- Trinity Nexus: structural schema.
--
-- Row Level Security policies live in the next migration so they can be read
-- and reviewed as one unit — they are the security boundary, and reviewing
-- them scattered among table definitions is how a gap goes unnoticed.

-- Trigram matching, used to suggest usernames while typing an @mention.
create extension if not exists "pg_trgm" with schema extensions;

-- No pgcrypto: `gen_random_uuid()` has been in core Postgres since 13, and
-- Supabase runs 17. Requiring the extension only adds something that has to
-- exist in every environment the schema is applied to.

-- ---------------------------------------------------------------------------
-- Reference data
-- ---------------------------------------------------------------------------

-- Present from day one even though only World of Warcraft is seeded. Adding a
-- second game later is then a row, not a migration that rewrites every foreign
-- key in the forum.
create table public.games (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9-]{2,32}$'),
  name        text not null,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create table public.categories (
  id           uuid primary key default gen_random_uuid(),
  game_id      uuid not null references public.games (id) on delete cascade,
  slug         text not null check (slug ~ '^[a-z0-9-]{2,48}$'),
  name         text not null,
  description  text,
  sort_order   integer not null default 0,
  -- Opt-in per category rather than a single global switch, so a "Support"
  -- board can take reports from people who cannot sign in while the rest of
  -- the forum stays authenticated.
  allow_anonymous boolean not null default false,
  -- Locked categories still render; they just take no new topics. Announcement
  -- boards need exactly this.
  is_locked    boolean not null default false,
  created_at   timestamptz not null default now(),

  unique (game_id, slug)
);

create index categories_game_sort_idx on public.categories (game_id, sort_order);

-- ---------------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------------

create type public.app_role as enum ('member', 'moderator', 'admin');

-- One row per auth user, created by trigger. `auth.users` is owned by Supabase
-- and must not be read directly by the client, so everything the forum needs
-- to display about a person lives here instead.
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  username     text not null unique check (username ~ '^[a-zA-Z0-9_]{3,24}$'),
  display_name text not null check (char_length(display_name) between 1 and 48),
  avatar_url   text,
  bio          text check (char_length(bio) <= 280),
  role         public.app_role not null default 'member',
  -- Set when a moderator suspends the account. Checked by the write policies.
  banned_until timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Case-insensitive uniqueness. Without it "Thrall" and "thrall" are two
-- accounts, which is an impersonation vector on a forum.
create unique index profiles_username_lower_idx on public.profiles (lower(username));
create index profiles_username_trgm_idx on public.profiles using gin (username extensions.gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- Forum
-- ---------------------------------------------------------------------------

-- Topics and posts are separate, and the opening post of a topic is an
-- ordinary row in `posts` with no parent. That uniformity is what lets
-- reactions, mentions, reports and edit history each point at a single real
-- foreign key instead of a polymorphic target with no referential integrity.
create table public.topics (
  id           uuid primary key default gen_random_uuid(),
  category_id  uuid not null references public.categories (id) on delete cascade,
  author_id    uuid references public.profiles (id) on delete set null,
  title        text not null check (char_length(title) between 3 and 160),
  slug         text not null,
  is_pinned    boolean not null default false,
  is_locked    boolean not null default false,
  -- Denormalised because they are read on every listing and counted nowhere
  -- else. Maintained by trigger; see the counter functions below.
  reply_count  integer not null default 0,
  -- Drives the default "recently active" ordering without a join.
  last_activity_at timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,

  unique (category_id, slug)
);

create index topics_category_activity_idx
  on public.topics (category_id, is_pinned desc, last_activity_at desc)
  where deleted_at is null;

create index topics_author_idx on public.topics (author_id) where deleted_at is null;

create table public.posts (
  id         uuid primary key default gen_random_uuid(),
  topic_id   uuid not null references public.topics (id) on delete cascade,
  author_id  uuid references public.profiles (id) on delete set null,
  parent_id  uuid references public.posts (id) on delete cascade,
  body_md    text not null check (char_length(body_md) between 1 and 20000),
  -- Materialised ancestry: the ids from the root down to and including this
  -- post. Ordering a whole thread correctly is then `order by path`, one
  -- indexed scan, instead of a recursive CTE on every render.
  -- Defaulted so callers never supply it: the value is computed by the
  -- posts_set_path trigger, which needs the row's own generated id.
  path       uuid[] not null default '{}',
  depth      integer not null default 0 check (depth between 0 and 5),
  -- True for the post that opens the topic. Deleting it is deleting the topic.
  is_opening_post boolean not null default false,
  edited_at  timestamptz,
  created_at timestamptz not null default now(),
  -- Soft delete always. Hard-deleting a post with replies orphans them and
  -- tears a hole in the conversation; forums mark it removed and keep the
  -- shape of the thread.
  deleted_at timestamptz,

  -- Depth is derived from path, and disagreement between them would corrupt
  -- ordering silently.
  constraint posts_depth_matches_path check (depth = array_length(path, 1) - 1)
);

create index posts_topic_path_idx on public.posts (topic_id, path);
create index posts_author_idx on public.posts (author_id) where deleted_at is null;
create index posts_parent_idx on public.posts (parent_id);

-- Exactly one opening post per topic.
create unique index posts_one_opening_per_topic_idx
  on public.posts (topic_id)
  where is_opening_post;

-- ---------------------------------------------------------------------------
-- Search
-- ---------------------------------------------------------------------------

-- Full text rather than ILIKE. ILIKE cannot use an index for a leading
-- wildcard, so it degrades to a sequential scan the moment the forum has real
-- volume — and it cannot rank.
alter table public.topics
  add column search_vector tsvector
  generated always as (to_tsvector('simple', coalesce(title, ''))) stored;

alter table public.posts
  add column search_vector tsvector
  generated always as (to_tsvector('simple', coalesce(body_md, ''))) stored;

create index topics_search_idx on public.topics using gin (search_vector);
create index posts_search_idx on public.posts using gin (search_vector);

-- ---------------------------------------------------------------------------
-- Tags
-- ---------------------------------------------------------------------------

create table public.tags (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique check (slug ~ '^[a-z0-9-]{2,32}$'),
  name       text not null,
  created_at timestamptz not null default now()
);

create table public.topic_tags (
  topic_id uuid not null references public.topics (id) on delete cascade,
  tag_id   uuid not null references public.tags (id) on delete cascade,
  primary key (topic_id, tag_id)
);

create index topic_tags_tag_idx on public.topic_tags (tag_id);

-- ---------------------------------------------------------------------------
-- Social
-- ---------------------------------------------------------------------------

create type public.reaction_kind as enum ('like', 'helpful', 'insightful', 'celebrate');

create table public.reactions (
  post_id    uuid not null references public.posts (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  kind       public.reaction_kind not null,
  created_at timestamptz not null default now(),

  -- One reaction of each kind per person per post. Enforced here rather than
  -- in application code, because the optimistic UI fires the insert before it
  -- knows whether anyone else already raced it.
  primary key (post_id, profile_id, kind)
);

create index reactions_profile_idx on public.reactions (profile_id);

create table public.mentions (
  post_id    uuid not null references public.posts (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),

  primary key (post_id, profile_id)
);

create index mentions_profile_idx on public.mentions (profile_id);

create table public.subscriptions (
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  topic_id    uuid references public.topics (id) on delete cascade,
  category_id uuid references public.categories (id) on delete cascade,
  created_at  timestamptz not null default now(),

  -- Exactly one target. A row with both or neither is meaningless and would
  -- quietly produce duplicate or missing notifications.
  constraint subscriptions_one_target
    check (num_nonnulls(topic_id, category_id) = 1)
);

create unique index subscriptions_topic_idx
  on public.subscriptions (profile_id, topic_id) where topic_id is not null;
create unique index subscriptions_category_idx
  on public.subscriptions (profile_id, category_id) where category_id is not null;

create type public.notification_kind as enum ('reply', 'mention', 'reaction', 'moderation');

create table public.notifications (
  id           uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  actor_id     uuid references public.profiles (id) on delete set null,
  kind         public.notification_kind not null,
  topic_id     uuid references public.topics (id) on delete cascade,
  post_id      uuid references public.posts (id) on delete cascade,
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);

-- Partial index: the unread badge is the hottest query in the app and only
-- ever looks at unread rows.
create index notifications_unread_idx
  on public.notifications (recipient_id, created_at desc)
  where read_at is null;

create index notifications_recipient_idx
  on public.notifications (recipient_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Moderation
-- ---------------------------------------------------------------------------

create type public.report_status as enum ('open', 'resolved', 'dismissed');

create table public.reports (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.posts (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason      text not null check (char_length(reason) between 3 and 1000),
  status      public.report_status not null default 'open',
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at  timestamptz not null default now(),

  -- One open report per person per post, so a single upset user cannot flood
  -- the queue by clicking twice.
  unique (post_id, reporter_id)
);

create index reports_open_idx on public.reports (created_at desc) where status = 'open';

create type public.moderation_action_kind as enum (
  'delete_post', 'restore_post', 'lock_topic', 'unlock_topic',
  'pin_topic', 'unpin_topic', 'move_topic', 'ban_user', 'unban_user'
);

-- Append-only. A moderator log that can be edited is not a log.
create table public.moderation_actions (
  id           uuid primary key default gen_random_uuid(),
  moderator_id uuid references public.profiles (id) on delete set null,
  kind         public.moderation_action_kind not null,
  topic_id     uuid references public.topics (id) on delete set null,
  post_id      uuid references public.posts (id) on delete set null,
  target_profile_id uuid references public.profiles (id) on delete set null,
  note         text check (char_length(note) <= 1000),
  created_at   timestamptz not null default now()
);

create index moderation_actions_recent_idx on public.moderation_actions (created_at desc);
