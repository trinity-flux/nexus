-- Realtime publication and the reference rows the forum cannot start without.

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

-- Only the three tables the UI actually subscribes to. Publishing everything
-- would push moderation rows and other people's notifications down every open
-- socket, and Realtime applies RLS per subscriber but still does the work.
alter publication supabase_realtime add table public.topics;
alter publication supabase_realtime add table public.posts;
alter publication supabase_realtime add table public.notifications;

-- Replica identity is deliberately left at the default (the primary key).
--
-- `replica identity full` is the usual advice, and here it makes every UPDATE
-- fail outright: Postgres 17 rejects "Replica identity must not contain
-- unpublished generated columns", and both tables carry a generated
-- `search_vector`. Publishing generated columns needs Postgres 18.
--
-- Nothing is lost. Full identity only enriches the *old* record on updates and
-- deletes; the new record always arrives complete, which is what the client
-- patches its cache from. Deletion here is a soft delete — an UPDATE — so no
-- DELETE event needs an old record either.

-- ---------------------------------------------------------------------------
-- Reference data
-- ---------------------------------------------------------------------------

insert into public.games (slug, name, sort_order) values
  ('wow', 'World of Warcraft', 0);

insert into public.categories (game_id, slug, name, description, sort_order)
select
  g.id,
  category.slug,
  category.name,
  category.description,
  category.sort_order
from public.games g
cross join (values
  ('announcements', 'Announcements', 'Server news, patch notes and scheduled maintenance.', 0),
  ('general', 'General Discussion', 'Anything about the realm that does not fit elsewhere.', 1),
  ('guides', 'Guides & Strategy', 'Class guides, raid tactics, professions and levelling routes.', 2),
  ('guilds', 'Guilds & Recruitment', 'Find a guild, or find members for yours.', 3),
  ('marketplace', 'Trading Post', 'In-game trades, auctions and services.', 4),
  ('support', 'Help & Support', 'Account trouble, bug reports and questions.', 5),
  ('off-topic', 'Off Topic', 'Everything else.', 6)
) as category(slug, name, description, sort_order)
where g.slug = 'wow';

-- The announcements board is read-only for members; staff post, everyone
-- replies. Locking it here rather than leaving it to a manual click means a
-- fresh database is never briefly open to the world.
update public.categories set is_locked = true where slug = 'announcements';

insert into public.tags (slug, name) values
  ('question', 'Question'),
  ('discussion', 'Discussion'),
  ('guide', 'Guide'),
  ('bug', 'Bug'),
  ('pvp', 'PvP'),
  ('pve', 'PvE'),
  ('raiding', 'Raiding'),
  ('addons', 'Addons');
