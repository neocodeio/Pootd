-- ============================================================================
-- Pootd — realtime
-- Run after 0007_rate_limits.sql in the Supabase SQL Editor. Safe to re-run.
--
-- The app listens for live likes, comments and notifications over Supabase
-- Realtime. A table only emits changes once it is part of the
-- `supabase_realtime` publication, so this file adds the four tables the app
-- watches. Without it the live counters, comments and bell stay silent — the
-- app keeps working through ordinary queries.
--
-- Deletes are not given an old payload beyond the primary key while RLS is on,
-- so the client never reads `payload.old` columns: a removed like, comment or
-- notification triggers a refetch instead. `replica identity` therefore stays
-- at its default.
-- ============================================================================

do $$
declare
  target text;
begin
  foreach target in array array['posts', 'likes', 'comments', 'notifications']
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = target
    ) then
      execute format(
        'alter publication supabase_realtime add table public.%I',
        target
      );
    end if;
  end loop;
end;
$$;
