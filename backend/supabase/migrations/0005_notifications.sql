-- ============================================================================
-- Pootd — notifications
-- Run after 0001_init.sql … 0004_bookmarks.sql in the Supabase SQL Editor.
-- Safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  actor_id uuid not null references public.profiles (id) on delete cascade,
  type text not null
    check (type in ('like', 'comment')),
  post_id uuid references public.posts (id) on delete cascade,
  comment_id uuid references public.comments (id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  check (post_id is not null or comment_id is not null)
);

create index if not exists notifications_recipient_idx
  on public.notifications (recipient_id, created_at desc);

-- Liking, unliking and liking again must not stack up notifications.
create unique index if not exists notifications_like_once_idx
  on public.notifications (recipient_id, actor_id, post_id)
  where type = 'like';

create index if not exists notifications_unread_idx
  on public.notifications (recipient_id)
  where read_at is null;

-- ---------------------------------------------------------------------------
-- Triggers: likes and comments create notifications for the post author
-- ---------------------------------------------------------------------------

create or replace function public.notify_on_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post_author uuid;
begin
  select p.author_id into post_author
  from public.posts p
  where p.id = new.post_id;

  if post_author is null or post_author = new.user_id then
    return new;
  end if;

  insert into public.notifications (recipient_id, actor_id, type, post_id)
  values (post_author, new.user_id, 'like', new.post_id)
  on conflict do nothing;

  return new;
end;
$$;

-- Removing the like removes its notification, so the bell matches reality.
create or replace function public.clear_like_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.notifications
  where type = 'like'
    and actor_id = old.user_id
    and post_id = old.post_id;

  return old;
end;
$$;

create or replace function public.notify_on_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post_author uuid;
begin
  select p.author_id into post_author
  from public.posts p
  where p.id = new.post_id;

  if post_author is null or post_author = new.author_id then
    return new;
  end if;

  insert into public.notifications (recipient_id, actor_id, type, post_id, comment_id)
  values (post_author, new.author_id, 'comment', new.post_id, new.id);

  return new;
end;
$$;

drop trigger if exists likes_notify_author on public.likes;
create trigger likes_notify_author
  after insert on public.likes
  for each row execute function public.notify_on_like();

drop trigger if exists likes_clear_notification on public.likes;
create trigger likes_clear_notification
  after delete on public.likes
  for each row execute function public.clear_like_notification();

drop trigger if exists comments_notify_author on public.comments;
create trigger comments_notify_author
  after insert on public.comments
  for each row execute function public.notify_on_comment();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.notifications enable row level security;

drop policy if exists "Users can read their own notifications" on public.notifications;
create policy "Users can read their own notifications"
  on public.notifications for select
  to authenticated
  using (auth.uid() = recipient_id);

drop policy if exists "Users can update their own notifications" on public.notifications;
create policy "Users can update their own notifications"
  on public.notifications for update
  to authenticated
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);

drop policy if exists "Users can delete their own notifications" on public.notifications;
create policy "Users can delete their own notifications"
  on public.notifications for delete
  to authenticated
  using (auth.uid() = recipient_id);

-- ---------------------------------------------------------------------------
-- Column-level privileges
-- ---------------------------------------------------------------------------

revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
grant delete on public.notifications to authenticated;

revoke all on function public.notify_on_like() from public, anon, authenticated;
revoke all on function public.clear_like_notification() from public, anon, authenticated;
revoke all on function public.notify_on_comment() from public, anon, authenticated;
