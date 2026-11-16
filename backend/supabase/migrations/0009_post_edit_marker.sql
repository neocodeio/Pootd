-- ============================================================================
-- Pootd — keep the "معدّل" marker honest
-- Run after 0008_realtime.sql in the Supabase SQL Editor. Safe to re-run.
-- ============================================================================

-- Only an edit of the content or its tags is an edit. Every like, unlike and
-- comment updates `posts` to refresh its counters, and the old
-- `set_updated_at` trigger touched `updated_at` on every one of those updates,
-- so every post anyone interacted with looked edited.
--
-- This trigger keeps `updated_at` untouched unless the content or the tags
-- really changed. `set_updated_at` stays as it is for profiles.

create or replace function public.touch_post_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.content is distinct from old.content
    or new.tags is distinct from old.tags then
    new.updated_at = now();
  else
    new.updated_at = old.updated_at;
  end if;

  return new;
end;
$$;

revoke all on function public.touch_post_updated_at()
  from public, anon, authenticated;

-- Drop the old trigger first: it overwrote `updated_at` with now() on every
-- update, so the repair below has to run while no trigger is attached.
drop trigger if exists posts_set_updated_at on public.posts;

update public.posts
set updated_at = created_at
where updated_at is distinct from created_at;

create trigger posts_set_updated_at
  before update on public.posts
  for each row execute function public.touch_post_updated_at();
