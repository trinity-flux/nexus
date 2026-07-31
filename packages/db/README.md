# @trinity-nexus/db

The forum's Postgres schema, its Row Level Security policies, and the types the
application checks itself against.

Everything here is versioned SQL. There is no step where someone clicks through
the Supabase dashboard to create a table: a schema that exists only in a
project's dashboard cannot be reviewed, cannot be tested, and cannot be
recreated when the project is replaced.

## What the migrations create

| File | Contents |
| --- | --- |
| `20260726120000_initial_schema.sql` | 13 tables, constraints, indexes |
| `20260726120100_functions_and_triggers.sql` | 12 functions, 9 triggers, the `create_topic` RPC |
| `20260726120200_row_level_security.sql` | 37 policies, one per table and operation |
| `20260726120300_realtime_and_reference_data.sql` | Realtime publication, seeded games, categories and tags |

They apply in filename order, and the order is load-bearing: policies reference
tables, triggers reference functions, and the seed rows reference both.

Row Level Security lives in its own file rather than beside each table on
purpose. It is the security boundary, and a gap in it is far easier to spot
reading 37 policies together than scattered through 300 lines of column
definitions.

## Applying them to a Supabase project

Two routes. Both produce the same database.

### The SQL editor — no local setup

```bash
pnpm --filter @trinity-nexus/db run db:bundle
```

That writes `packages/db/dist/schema.sql`: every migration concatenated in
order, wrapped in a single transaction. Open the project's **SQL Editor**,
paste the file, and run it once.

The bundle is generated, not committed. A second copy of the schema in the
repository is a copy that drifts, and a project created from a stale one fails
silently — the first symptom is a query written against the newer schema
returning nothing.

Applying it twice fails on the first `create table`. That is deliberate: running
a schema against a database that already holds posts is not something to do by
accident.

### The CLI — for a project you will keep changing

```bash
pnpm --filter @trinity-nexus/db exec supabase login
pnpm --filter @trinity-nexus/db exec supabase link --project-ref <ref>
pnpm --filter @trinity-nexus/db run db:push
```

Use this once the project exists and migrations start being added, since it
tracks which have already been applied. `db:diff` writes a new migration from
changes made in the dashboard, which is the honest way to keep experiments in
version control.

## After applying

Set these in `apps/web/.env` and in the deploy workflow:

```
VITE_DATA_SOURCE=supabase
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

The anon key is public by design — it ships inside the JavaScript bundle every
visitor downloads. What authorises a request is Row Level Security, not the key.

**The `service_role` key must never appear in this repository, in an
environment variable read by the browser, or in the workflow.** It bypasses
every policy in `20260726120200_row_level_security.sql`.

### Sign-up

`handle_new_user` creates a profile automatically for every new account. It
takes the username from Discord's `user_name` or `preferred_username` when the
account arrives through OAuth, and otherwise from the local part of the email
address, stripping anything outside `[a-zA-Z0-9_]` and appending a number when
the name is taken. No dashboard configuration is needed for it — the trigger is
in the migration.

### The first moderator

`guard_topic_privileges` and `guard_profile_privileges` only allow a moderator
to grant moderation. That has no way to produce moderator number one, so both
skip the check when `auth.uid()` is null — which is the case for a query run
from the SQL editor:

```sql
update public.profiles set role = 'admin' where username = '<your username>';
```

Run it once, from the dashboard, after signing up.

## Testing

```bash
pnpm --filter @trinity-nexus/db test
```

The suite boots Postgres compiled to WebAssembly (PGlite), applies the real
migration files, and asserts against them: policies are exercised as a specific
signed-in user, the hand-written types in `schema.ts` are checked against
`information_schema`, and the bundle is regenerated and applied to prove it
still produces the same database.

No Docker and no cloud project, which is what makes it something CI actually
runs. It has already caught four defects that would have reached production —
among them a counter trigger that ran as the caller and so silently skipped
updates on topics the caller did not own.
