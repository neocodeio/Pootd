-- ============================================================================
-- Pootd — follower / following counters
-- Run after 0011_follows_notifications.sql in the Supabase SQL Editor.
-- Safe to re-run.
--
-- The profile header needs these numbers for signed-out visitors too, and the
-- `follows` read policy is signed-in only. Keeping a counter on `profiles`
-- (which is readable by everyone) means the count no longer requires loading
-- the whole social graph, and guests see the real number.
--
-- The columns are maintained by the trigger below, never by the client: the
-- column-level grants from 0001_init.sql do not include them.
-- ============================================================================

alter table public.profiles
  add column if not exists followers_count integer not null default 0
    check (followers_count >= 0),
  add column if not exists following_count integer not null default 0
    check (following_count >= 0);

-- Recomputes both counters from the graph. Re-running the migration is safe.
update public.profiles p
set followers_count = (
      select count(*) from public.follows f where f.following_id = p.id
    ),
    following_count = (
      select count(*) from public.follows f where f.follower_id = p.id
    );

create or replace function public.sync_follow_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.profiles
      set followers_count = followers_count + 1
      where id = new.following_id;

    update public.profiles
      set following_count = following_count + 1
      where id = new.follower_id;

    return new;
  elsif tg_op = 'DELETE' then
    update public.profiles
      set followers_count = greatest(followers_count - 1, 0)
      where id = old.following_id;

    update public.profiles
      set following_count = greatest(following_count - 1, 0)
      where id = old.follower_id;

    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists follows_sync_counts on public.follows;
create trigger follows_sync_counts
  after insert or delete on public.follows
  for each row execute function public.sync_follow_counts();

revoke all on function public.sync_follow_counts() from public, anon, authenticated;
