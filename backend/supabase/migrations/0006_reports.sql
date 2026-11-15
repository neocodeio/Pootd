-- ============================================================================
-- Pootd — reports (moderation)
-- Run after 0005_notifications.sql in the Supabase SQL Editor. Safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  post_id uuid references public.posts (id) on delete cascade,
  comment_id uuid references public.comments (id) on delete cascade,
  reason text not null
    check (reason in ('spam', 'harassment', 'malicious_link', 'other')),
  details text not null default ''
    check (char_length(details) <= 500),
  status text not null default 'open'
    check (status in ('open', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now(),
  check (post_id is not null or comment_id is not null)
);

create index if not exists reports_status_idx
  on public.reports (status, created_at desc);

create index if not exists reports_reporter_idx
  on public.reports (reporter_id, created_at desc);

-- One report per person per item keeps the queue readable.
create unique index if not exists reports_once_per_post_idx
  on public.reports (reporter_id, post_id)
  where post_id is not null;

create unique index if not exists reports_once_per_comment_idx
  on public.reports (reporter_id, comment_id)
  where comment_id is not null;

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- Reports are write-only for members: they can file one and read their own,
-- while review happens in the Supabase dashboard with the service role.
-- ---------------------------------------------------------------------------

alter table public.reports enable row level security;

drop policy if exists "Users can file reports" on public.reports;
create policy "Users can file reports"
  on public.reports for insert
  to authenticated
  with check (auth.uid() = reporter_id);

drop policy if exists "Users can read their own reports" on public.reports;
create policy "Users can read their own reports"
  on public.reports for select
  to authenticated
  using (auth.uid() = reporter_id);

-- ---------------------------------------------------------------------------
-- Column-level privileges
-- ---------------------------------------------------------------------------

revoke all on public.reports from anon, authenticated;
grant select on public.reports to authenticated;
grant insert (reporter_id, post_id, comment_id, reason, details)
  on public.reports to authenticated;
