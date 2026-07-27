-- Behaviour that must hold no matter which client wrote the row.
--
-- Everything here is enforced in the database rather than in the app because
-- the app is not the only writer: an admin in Studio, a future edge function
-- and a migration all bypass it.

-- ---------------------------------------------------------------------------
-- Authorisation helpers
-- ---------------------------------------------------------------------------

-- SECURITY DEFINER so a policy on `profiles` can call it without re-entering
-- that same policy and recursing. `stable` lets the planner call it once per
-- statement rather than once per row, which is the difference between a
-- moderator check costing nothing and costing a subquery per row scanned.
create or replace function public.current_role_name()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid());
$$;

create or replace function public.is_moderator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_role_name() in ('moderator', 'admin'), false);
$$;

create or replace function public.is_banned()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select banned_until from public.profiles where id = (select auth.uid())) > now(),
    false
  );
$$;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

-- A signed-in user with no profile row is a broken state that shows up much
-- later as a missing author on a post, so the row is created in the same
-- transaction as the auth user rather than on first visit.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate text;
  suffix integer := 0;
begin
  -- Discord supplies a username; email sign-up does not, so fall back to the
  -- local part of the address.
  candidate := coalesce(
    new.raw_user_meta_data ->> 'user_name',
    new.raw_user_meta_data ->> 'preferred_username',
    split_part(new.email, '@', 1)
  );

  candidate := regexp_replace(candidate, '[^a-zA-Z0-9_]', '', 'g');
  if char_length(candidate) < 3 then
    candidate := 'member' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;
  candidate := substr(candidate, 1, 24);

  -- Two people can legitimately arrive with the same Discord name.
  while exists (select 1 from public.profiles where lower(username) = lower(candidate)) loop
    suffix := suffix + 1;
    candidate := substr(candidate, 1, 20) || suffix::text;
  end loop;

  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    candidate,
    coalesce(new.raw_user_meta_data ->> 'full_name', candidate),
    new.raw_user_meta_data ->> 'avatar_url'
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

create trigger topics_touch_updated_at
  before update on public.topics
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Privileged columns
-- ---------------------------------------------------------------------------

-- Some columns are writable only by moderators, and a policy is the wrong
-- place to say so: a WITH CHECK that reads the table it guards — "the new role
-- must equal the current role" — re-enters its own policy and Postgres aborts
-- with "infinite recursion detected in policy".
--
-- A BEFORE UPDATE trigger has no such problem, and it is strictly stronger: it
-- holds for every writer, including one connected as a role that RLS does not
-- apply to.

create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- `auth.uid()` is null when there is no end user behind the statement: the
  -- SQL console, a migration, the service role. Those are the only ways the
  -- FIRST admin can ever exist, since a rule of "only moderators may promote"
  -- has no way to produce moderator number one. RLS still stops an anonymous
  -- visitor here — there is no policy letting `anon` update a profile at all.
  if (select auth.uid()) is not null and not public.is_moderator() then
    -- Without this a member can PATCH their own row to role = 'admin', or
    -- simply clear the ban a moderator just gave them.
    new.role := old.role;
    new.banned_until := old.banned_until;
  end if;

  return new;
end;
$$;

create trigger profiles_guard_privileges
  before update on public.profiles
  for each row execute function public.guard_profile_privileges();

create or replace function public.guard_topic_privileges()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Same escape hatch as on profiles: no end user behind the statement means
  -- an operator or a migration, which must be able to seed and repair data.
  if (select auth.uid()) is not null and not public.is_moderator() then
    -- Otherwise an author pins their own topic to the top of the category and
    -- leaves it there.
    new.is_pinned := old.is_pinned;
    new.is_locked := old.is_locked;
    new.category_id := old.category_id;
  end if;

  return new;
end;
$$;

create trigger topics_guard_privileges
  before update on public.topics
  for each row execute function public.guard_topic_privileges();

-- ---------------------------------------------------------------------------
-- Post ancestry
-- ---------------------------------------------------------------------------

-- `path` is what makes a whole thread orderable with one index scan, so it is
-- computed here rather than trusted from the client: a client that got it
-- wrong would silently reorder someone else's conversation.
create or replace function public.set_post_path()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  parent_path uuid[];
begin
  if new.parent_id is null then
    new.path := array[new.id];
  else
    select path into parent_path from public.posts where id = new.parent_id;

    if parent_path is null then
      raise exception 'Parent post % does not exist', new.parent_id;
    end if;

    -- Beyond five levels a thread is unreadable on a phone: each level costs
    -- indentation, and the text column collapses. Deeper replies attach to
    -- the deepest allowed ancestor instead of being rejected, so the reply is
    -- never lost.
    --
    -- Depth is path length minus one, so the cap is a path of six. A parent
    -- already at six means this reply would be depth six: re-parent it onto
    -- the fifth ancestor, which puts the new path back at six.
    if array_length(parent_path, 1) >= 6 then
      new.parent_id := parent_path[5];
      new.path := parent_path[1:5] || new.id;
    else
      new.path := parent_path || new.id;
    end if;
  end if;

  new.depth := array_length(new.path, 1) - 1;
  return new;
end;
$$;

create trigger posts_set_path
  before insert on public.posts
  for each row execute function public.set_post_path();

-- ---------------------------------------------------------------------------
-- Counters
-- ---------------------------------------------------------------------------

-- Counting replies on every listing query is the first thing to fall over
-- under load, so the count is maintained here. Soft deletes are what make this
-- fiddly: the count has to move on delete and restore, not only on insert.
-- SECURITY DEFINER, and this one is load-bearing. Without it the trigger runs
-- as whoever posted, and the UPDATE on `topics` is filtered by the topic
-- policies: someone replying to a topic they do not own matches no row, the
-- update silently does nothing, and every reply by anyone other than the
-- topic author leaves the count wrong. Silently, forever.
create or replace function public.sync_topic_reply_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_topic uuid;
begin
  affected_topic := coalesce(new.topic_id, old.topic_id);

  update public.topics t
  set reply_count = (
        select count(*)
        from public.posts p
        where p.topic_id = affected_topic
          and p.deleted_at is null
          and not p.is_opening_post
      ),
      last_activity_at = greatest(
        t.created_at,
        coalesce(
          (select max(created_at) from public.posts p
           where p.topic_id = affected_topic and p.deleted_at is null),
          t.created_at
        )
      )
  where t.id = affected_topic;

  return null;
end;
$$;

create trigger posts_sync_topic_counters
  after insert or update of deleted_at or delete on public.posts
  for each row execute function public.sync_topic_reply_count();

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------

-- Fanned out in the database so a notification cannot be missed by a client
-- that crashed between posting and notifying.
create or replace function public.notify_on_post()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  topic_author uuid;
  parent_author uuid;
begin
  select author_id into topic_author from public.topics where id = new.topic_id;

  if new.parent_id is not null then
    select author_id into parent_author from public.posts where id = new.parent_id;
  end if;

  -- Whoever is being replied to directly; otherwise the topic author.
  insert into public.notifications (recipient_id, actor_id, kind, topic_id, post_id)
  select
    coalesce(parent_author, topic_author),
    new.author_id,
    'reply',
    new.topic_id,
    new.id
  where coalesce(parent_author, topic_author) is not null
    -- Nobody wants to be told they replied to themselves.
    and coalesce(parent_author, topic_author) is distinct from new.author_id
    and not new.is_opening_post;

  -- Everyone watching the topic, minus the author and anyone already notified
  -- above, so a subscriber who was also replied to gets one notification.
  insert into public.notifications (recipient_id, actor_id, kind, topic_id, post_id)
  select s.profile_id, new.author_id, 'reply', new.topic_id, new.id
  from public.subscriptions s
  where s.topic_id = new.topic_id
    and s.profile_id is distinct from new.author_id
    and s.profile_id is distinct from coalesce(parent_author, topic_author)
    and not new.is_opening_post;

  return new;
end;
$$;

create trigger posts_notify
  after insert on public.posts
  for each row execute function public.notify_on_post();

create or replace function public.notify_on_mention()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  post_author uuid;
  mention_topic uuid;
begin
  select author_id, topic_id into post_author, mention_topic
  from public.posts where id = new.post_id;

  insert into public.notifications (recipient_id, actor_id, kind, topic_id, post_id)
  select new.profile_id, post_author, 'mention', mention_topic, new.post_id
  where new.profile_id is distinct from post_author;

  return new;
end;
$$;

create trigger mentions_notify
  after insert on public.mentions
  for each row execute function public.notify_on_mention();

-- ---------------------------------------------------------------------------
-- Topic creation
-- ---------------------------------------------------------------------------

-- A topic and its opening post are one act, and a topic with no opening post
-- renders as an empty page. Wrapping both inserts in one function makes it one
-- transaction and one round trip.
create or replace function public.create_topic(
  p_category_id uuid,
  p_title text,
  p_body_md text
)
returns public.topics
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_topic public.topics;
  base_slug text;
  candidate_slug text;
  suffix integer := 0;
begin
  base_slug := trim(both '-' from regexp_replace(lower(p_title), '[^a-z0-9]+', '-', 'g'));
  base_slug := substr(coalesce(nullif(base_slug, ''), 'topic'), 1, 64);
  candidate_slug := base_slug;

  -- Two topics can share a title; their URLs cannot.
  while exists (
    select 1 from public.topics
    where category_id = p_category_id and slug = candidate_slug
  ) loop
    suffix := suffix + 1;
    candidate_slug := base_slug || '-' || suffix::text;
  end loop;

  insert into public.topics (category_id, author_id, title, slug)
  values (p_category_id, (select auth.uid()), p_title, candidate_slug)
  returning * into new_topic;

  insert into public.posts (topic_id, author_id, body_md, is_opening_post)
  values (new_topic.id, (select auth.uid()), p_body_md, true);

  return new_topic;
end;
$$;

comment on function public.create_topic is
  'Creates a topic and its opening post in one transaction, so a topic can never exist without the post that opens it.';
