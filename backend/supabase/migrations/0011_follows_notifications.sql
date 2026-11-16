-- ============================================================================
-- Pootd — follow notifications + live follow numbers
-- Run after 0010_follows.sql in the Supabase SQL Editor. Safe to re-run.
-- ============================================================================

-- Live followers / following. A table only emits changes once it belongs to
-- the `supabase_realtime` publication, so the numbers on an open profile move
-- without a reload. Guarded, so re-running is harmless.
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

-- 'follow' joins the notification types. Likes/comments keep their post/comment
-- link through the triggers below, so the check now only validates the type.
alter table public.notifications
  drop constraint if exists notifications_check;

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_check
  check (type in ('like', 'comment', 'follow'));

-- A new follow notifies the user who was followed.
create or replace function public.notify_on_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (recipient_id, actor_id, type, post_id, comment_id)
  values (new.following_id, new.follower_id, 'follow', null, null);

  return new;
end;
$$;

drop trigger if exists follows_notify_follow on public.follows;
create trigger follows_notify_follow
  after insert on public.follows
  for each row execute function public.notify_on_follow();

-- Unfollowing removes the follow notification.
create or replace function public.clear_follow_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.notifications
  where type = 'follow'
    and actor_id = old.follower_id
    and recipient_id = old.following_id;

  return old;
end;
$$;

drop trigger if exists follows_clear_notification on public.follows;
create trigger follows_clear_notification
  after delete on public.follows
  for each row execute function public.clear_follow_notification();
