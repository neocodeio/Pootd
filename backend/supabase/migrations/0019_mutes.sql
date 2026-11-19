-- ============================================================================
-- Pootd — mutes
-- Run after 0018_social_links.sql in the Supabase SQL Editor. Safe to re-run.
--
-- A mute is a private, one-way preference: the muter stops seeing the muted
-- profile's posts, comments-free surfaces (feed, search, notifications) without
-- telling the other side. It is deliberately not a block — the muted profile
-- can still follow and read the muter, which is why every policy below is
-- scoped to `auth.uid() = muter_id` and the table is never readable by `anon`.
-- ============================================================================

create table if not exists public.mutes (
  muter_id uuid not null references public.profiles (id) on delete cascade,
  muted_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (muter_id, muted_id),
  constraint mutes_no_self check (muter_id <> muted_id)
);

create index if not exists mutes_muted_id_idx on public.mutes (muted_id);

alter table public.mutes enable row level security;

drop policy if exists "Users read their own mutes" on public.mutes;
create policy "Users read their own mutes"
  on public.mutes for select
  to authenticated
  using (auth.uid() = muter_id);

drop policy if exists "Users create their own mutes" on public.mutes;
create policy "Users create their own mutes"
  on public.mutes for insert
  to authenticated
  with check (auth.uid() = muter_id);

drop policy if exists "Users delete their own mutes" on public.mutes;
create policy "Users delete their own mutes"
  on public.mutes for delete
  to authenticated
  using (auth.uid() = muter_id);

revoke all on public.mutes from anon;
grant select, insert, delete on public.mutes to authenticated;
