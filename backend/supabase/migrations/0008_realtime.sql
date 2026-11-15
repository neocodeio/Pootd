-- ============================================================================
-- Pootd — realtime
-- Run after 0007_rate_limits.sql in the Supabase SQL Editor. Safe to re-run.
--
-- The app listens for live likes, comments and notifications over Supabase
-- Realtime. A table only emits changes once it is part of the
-- `supabase_realtime` publication, so this file adds the four tables and makes
-- delete events carry their full old row (required for filtered deletes).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Publication membership
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- Old rows for delete events
--
-- Realtime only sends the primary key on delete, and it cannot apply a filter
-- (such as `recipient_id=eq.<me>`) without the rest of the row. Likes and
-- comments unsubscribe/delete by `user_id`/`post_id`; notifications disappear
-- when a like is removed, so all three need the full old row. `posts` is only
-- read on update, where the new row is always complete.
-- ---------------------------------------------------------------------------

alter table public.likes replica identity full;
alter table public.comments replica identity full;
alter table public.notifications replica identity full;
