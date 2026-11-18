-- ============================================================================
-- Pootd — suggested profiles for "who to follow"
-- Run after 0016_mentions_replies.sql in the Supabase SQL Editor. Safe to re-run.
-- ============================================================================

-- Returns the most-followed profiles the viewer does not already follow. The
-- query runs in Postgres so a viewer with a large following list does not send
-- that whole list back as a PostgREST filter.
create or replace function public.get_suggested_profiles(
  viewer_id uuid default null,
  profile_limit integer default 5
)
returns setof public.profiles
language sql
stable
security invoker
set search_path = public
as $$
  select p.*
  from public.profiles p
  where (viewer_id is null or p.id <> viewer_id)
    and (
      viewer_id is null
      or not exists (
        select 1
        from public.follows f
        where f.follower_id = viewer_id
          and f.following_id = p.id
      )
    )
  order by p.followers_count desc, p.created_at asc
  limit greatest(least(coalesce(profile_limit, 5), 20), 1);
$$;

revoke all on function public.get_suggested_profiles(uuid, integer) from public;
grant execute on function public.get_suggested_profiles(uuid, integer)
  to anon, authenticated;
