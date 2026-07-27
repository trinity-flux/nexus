-- Row Level Security for every table.
--
-- This file is the security boundary of the whole product. The anon key is
-- public by design and ships in the JavaScript bundle; what stops a stranger
-- from reading or writing anything is here and nowhere else.
--
-- A badly written policy does not fail loudly. It filters too little and
-- nobody notices until data is somewhere it should not be, which is why these
-- live together and are covered by assertions in `tests/rls.sql`.
--
-- One deliberate consequence to know about: a soft-deleted post is invisible
-- to everyone but its author and moderators. Its replies remain visible, and
-- the client rebuilds the thread shape from `posts.path`, which carries the
-- full ancestry — so a removed post renders as a placeholder without the
-- database having to hand out its text.

alter table public.games enable row level security;
alter table public.categories enable row level security;
alter table public.profiles enable row level security;
alter table public.topics enable row level security;
alter table public.posts enable row level security;
alter table public.tags enable row level security;
alter table public.topic_tags enable row level security;
alter table public.reactions enable row level security;
alter table public.mentions enable row level security;
alter table public.subscriptions enable row level security;
alter table public.notifications enable row level security;
alter table public.reports enable row level security;
alter table public.moderation_actions enable row level security;

-- ---------------------------------------------------------------------------
-- Reference data: world-readable, admin-writable
-- ---------------------------------------------------------------------------

create policy "games are readable by everyone"
  on public.games for select
  using (true);

create policy "games are managed by admins"
  on public.games for all
  using (public.current_role_name() = 'admin')
  with check (public.current_role_name() = 'admin');

create policy "categories are readable by everyone"
  on public.categories for select
  using (true);

create policy "categories are managed by admins"
  on public.categories for all
  using (public.current_role_name() = 'admin')
  with check (public.current_role_name() = 'admin');

create policy "tags are readable by everyone"
  on public.tags for select
  using (true);

create policy "tags are created by members"
  on public.tags for insert
  to authenticated
  with check (not public.is_banned());

create policy "tags are managed by moderators"
  on public.tags for update
  using (public.is_moderator())
  with check (public.is_moderator());

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

-- Public: a forum has public authorship, and the table deliberately holds
-- nothing private. Email lives in auth.users, which the client cannot read.
create policy "profiles are readable by everyone"
  on public.profiles for select
  using (true);

-- Which row may be touched is decided here; which *columns* of it may change
-- is decided by the guard_profile_privileges trigger. Expressing the column
-- rule as a WITH CHECK that reads `profiles` would re-enter this policy and
-- abort with "infinite recursion detected in policy".
create policy "a member edits their own profile"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "moderators manage roles and bans"
  on public.profiles for update
  using (public.is_moderator())
  with check (public.is_moderator());

-- ---------------------------------------------------------------------------
-- Topics
-- ---------------------------------------------------------------------------

create policy "live topics are readable by everyone"
  on public.topics for select
  using (deleted_at is null or author_id = (select auth.uid()) or public.is_moderator());

create policy "members start topics in open categories"
  on public.topics for insert
  to authenticated
  with check (
    author_id = (select auth.uid())
    and not public.is_banned()
    and exists (
      select 1 from public.categories c
      where c.id = category_id and not c.is_locked
    )
  );

-- Anonymous posting is opt-in per category and off everywhere by default.
-- The policy exists from the start so enabling it later is a data change, not
-- a security migration written under time pressure.
create policy "anonymous topics where the category allows it"
  on public.topics for insert
  to anon
  with check (
    author_id is null
    and exists (
      select 1 from public.categories c
      where c.id = category_id and c.allow_anonymous and not c.is_locked
    )
  );

-- Pinning, locking and moving are moderator powers, and the
-- guard_topic_privileges trigger is what enforces that. Same reason as on
-- profiles: a WITH CHECK comparing against the current row would recurse.
create policy "an author edits their own topic"
  on public.topics for update
  to authenticated
  using (author_id = (select auth.uid()) and deleted_at is null and not is_locked)
  with check (author_id = (select auth.uid()));

create policy "moderators manage any topic"
  on public.topics for update
  using (public.is_moderator())
  with check (public.is_moderator());

-- ---------------------------------------------------------------------------
-- Posts
-- ---------------------------------------------------------------------------

create policy "live posts are readable by everyone"
  on public.posts for select
  using (deleted_at is null or author_id = (select auth.uid()) or public.is_moderator());

create policy "members reply to unlocked topics"
  on public.posts for insert
  to authenticated
  with check (
    author_id = (select auth.uid())
    and not public.is_banned()
    and exists (
      select 1 from public.topics t
      join public.categories c on c.id = t.category_id
      where t.id = topic_id
        and t.deleted_at is null
        and not t.is_locked
        and not c.is_locked
    )
  );

create policy "anonymous replies where the category allows it"
  on public.posts for insert
  to anon
  with check (
    author_id is null
    and exists (
      select 1 from public.topics t
      join public.categories c on c.id = t.category_id
      where t.id = topic_id
        and t.deleted_at is null
        and not t.is_locked
        and c.allow_anonymous
    )
  );

create policy "an author edits their own post"
  on public.posts for update
  to authenticated
  using (author_id = (select auth.uid()) and deleted_at is null)
  with check (author_id = (select auth.uid()));

create policy "moderators manage any post"
  on public.posts for update
  using (public.is_moderator())
  with check (public.is_moderator());

-- ---------------------------------------------------------------------------
-- Tags on topics
-- ---------------------------------------------------------------------------

create policy "topic tags are readable by everyone"
  on public.topic_tags for select
  using (true);

create policy "an author tags their own topic"
  on public.topic_tags for all
  to authenticated
  using (
    exists (
      select 1 from public.topics t
      where t.id = topic_id
        and (t.author_id = (select auth.uid()) or public.is_moderator())
    )
  )
  with check (
    exists (
      select 1 from public.topics t
      where t.id = topic_id
        and (t.author_id = (select auth.uid()) or public.is_moderator())
    )
  );

-- ---------------------------------------------------------------------------
-- Reactions
-- ---------------------------------------------------------------------------

-- Counts are public; who reacted is public too. That is the norm on forums
-- and it keeps the optimistic UI honest, since the client can render the
-- change it just made without waiting for a count to come back.
create policy "reactions are readable by everyone"
  on public.reactions for select
  using (true);

create policy "a member reacts as themselves"
  on public.reactions for insert
  to authenticated
  with check (profile_id = (select auth.uid()) and not public.is_banned());

create policy "a member removes their own reaction"
  on public.reactions for delete
  to authenticated
  using (profile_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Mentions
-- ---------------------------------------------------------------------------

create policy "mentions are readable by everyone"
  on public.mentions for select
  using (true);

-- Only the author of the post may record who it mentions. Otherwise anyone
-- could insert a mention row and make the notification trigger fire at a
-- stranger — a spam channel with no post attached to report.
create policy "a post author records its mentions"
  on public.mentions for insert
  to authenticated
  with check (
    exists (
      select 1 from public.posts p
      where p.id = post_id and p.author_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- Subscriptions
-- ---------------------------------------------------------------------------

-- Private: what someone is watching is nobody else's business.
create policy "a member sees their own subscriptions"
  on public.subscriptions for select
  to authenticated
  using (profile_id = (select auth.uid()));

create policy "a member manages their own subscriptions"
  on public.subscriptions for all
  to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------

create policy "a member reads their own notifications"
  on public.notifications for select
  to authenticated
  using (recipient_id = (select auth.uid()));

-- Marking as read is the only change a client may make. There is deliberately
-- no insert policy: notifications are written by SECURITY DEFINER triggers,
-- which bypass RLS. A client that could insert could notify anyone about
-- anything.
create policy "a member marks their own notifications read"
  on public.notifications for update
  to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));

create policy "a member deletes their own notifications"
  on public.notifications for delete
  to authenticated
  using (recipient_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Reports
-- ---------------------------------------------------------------------------

create policy "a reporter sees their own reports"
  on public.reports for select
  to authenticated
  using (reporter_id = (select auth.uid()) or public.is_moderator());

create policy "a member reports a post"
  on public.reports for insert
  to authenticated
  with check (reporter_id = (select auth.uid()) and not public.is_banned());

create policy "moderators resolve reports"
  on public.reports for update
  using (public.is_moderator())
  with check (public.is_moderator());

-- ---------------------------------------------------------------------------
-- Moderation log
-- ---------------------------------------------------------------------------

create policy "moderators read the log"
  on public.moderation_actions for select
  using (public.is_moderator());

create policy "moderators append to the log"
  on public.moderation_actions for insert
  to authenticated
  with check (public.is_moderator() and moderator_id = (select auth.uid()));

-- No update or delete policy anywhere: the log is append-only, and a
-- moderation log that can be rewritten is not evidence of anything.
