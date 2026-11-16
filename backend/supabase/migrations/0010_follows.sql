-- ============================================================================
-- Pootd — following system (followers / following)
-- Run after 0009_post_edit_marker.sql in the Supabase SQL Editor. Safe to re-run.
--
-- `follows` is the social graph: one row per (follower -> following).
-- Lists are username-only and readable by signed-in users; the graph writes
-- are strictly self-scoped by RLS.
--
-- The table is also added to the `supabase_realtime` publication below. Without
-- that membership Postgres never streams a follow change, so the follower /
-- following numbers on an open profile would only move after a reload.
-- ============================================================================

create table if not exists public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create index if not exists follows_following_idx
  on public.follows (following_id, follower_id);

alter table public.follows enable row level security;

drop policy if exists "Users can view follows" on public.follows;
create policy "Users can view follows"
  on public.follows
  for select
  to authenticated
  using (true);

drop policy if exists "Users can follow profiles" on public.follows;
create policy "Users can follow profiles"
  on public.follows
  for insert
  to authenticated
  with check (auth.uid() = follower_id and auth.uid() <> following_id);

drop policy if exists "Users can unfollow profiles" on public.follows;
create policy "Users can unfollow profiles"
  on public.follows
  for delete
  to authenticated
  using (auth.uid() = follower_id);

-- Realtime: a table only emits changes once it belongs to the publication.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'follows'
  ) then
    execute 'alter publication supabase_realtime add table public.follows';
  end if;
end;
$$;
