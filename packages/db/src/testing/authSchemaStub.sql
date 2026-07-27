-- The parts of Supabase that the migrations depend on but that Supabase owns.
--
-- PGlite is plain Postgres, so `auth.users`, `auth.uid()` and the `anon` and
-- `authenticated` roles do not exist. Recreating just enough of them here is
-- what makes it possible to run the real migrations — including every RLS
-- policy — in a test, with no Docker and no cloud project.
--
-- Only the shapes the schema touches are reproduced. This is a harness, not a
-- reimplementation of GoTrue.

create schema if not exists auth;
create schema if not exists extensions;

create table auth.users (
  id                 uuid primary key default gen_random_uuid(),
  email              text unique,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now()
);

-- Supabase resolves the current user from the request JWT. Here the tests set
-- it with `set local request.jwt.claim.sub`, which is the same mechanism
-- Supabase itself uses underneath.
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

create or replace function auth.role()
returns text
language sql
stable
as $$
  select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon');
$$;

-- PostgREST connects as one of these and RLS policies are granted `to anon` or
-- `to authenticated`, so the roles have to exist for the policies to parse.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end
$$;

grant usage on schema public to anon, authenticated, service_role;
grant usage on schema extensions to anon, authenticated, service_role;

-- Policies call auth.uid(), so the roles the policies apply to have to be able
-- to reach it. Supabase grants this; without it every policy evaluation fails
-- with "permission denied for schema auth" rather than simply denying access.
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
grant execute on function auth.role() to anon, authenticated, service_role;
-- Read-only, and only what a policy needs. The client never sees this table:
-- PostgREST exposes the `public` schema alone.
grant select on auth.users to authenticated, service_role;

alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;

-- Realtime ships with Supabase; the migrations add tables to its publication.
create publication supabase_realtime;
