-- ============================================================================
-- Pootd — saved posts (bookmarks)
-- Run after 0001_init.sql, 0002_email_otp.sql and 0003_profile_cover.sql
-- in the Supabase SQL Editor. Safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

create table if not exists public.bookmarks (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists bookmarks_user_id_created_at_idx
  on public.bookmarks (user_id, created_at desc);

alter table public.bookmarks enable row level security;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

drop policy if exists "Users can read their own bookmarks" on public.bookmarks;
create policy "Users can read their own bookmarks"
  on public.bookmarks for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can save their own bookmarks" on public.bookmarks;
create policy "Users can save their own bookmarks"
  on public.bookmarks for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can remove their own bookmarks" on public.bookmarks;
create policy "Users can remove their own bookmarks"
  on public.bookmarks for delete
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Column-level privileges
-- ---------------------------------------------------------------------------

revoke all on public.bookmarks from anon, authenticated;
grant select on public.bookmarks to authenticated;
grant insert (post_id, user_id) on public.bookmarks to authenticated;
grant delete on public.bookmarks to authenticated;
