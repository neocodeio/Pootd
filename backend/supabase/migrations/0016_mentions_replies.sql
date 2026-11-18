-- ============================================================================
-- Pootd — @mentions and reply notifications
-- Run after 0015_post_images.sql in the Supabase SQL Editor. Safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Comments can point at the comment they answer
-- ---------------------------------------------------------------------------

alter table public.comments
  add column if not exists parent_id uuid
    references public.comments (id) on delete set null;

create index if not exists comments_parent_id_idx
  on public.comments (parent_id)
  where parent_id is not null;

grant insert (parent_id) on public.comments to authenticated;

-- A reply must belong to the same post as the comment it answers.
create or replace function public.validate_comment_parent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.parent_id is not null and not exists (
    select 1
    from public.comments c
    where c.id = new.parent_id
      and c.post_id = new.post_id
  ) then
    raise exception 'التعليق الأصلي غير موجود في هذا المنشور.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists comments_validate_parent on public.comments;
create trigger comments_validate_parent
  before insert or update of parent_id on public.comments
  for each row execute function public.validate_comment_parent();

-- ---------------------------------------------------------------------------
-- Notification types
-- ---------------------------------------------------------------------------

alter table public.notifications
  drop constraint if exists notifications_check;

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_check
  check (type in ('like', 'comment', 'follow', 'mention', 'reply'));

-- One notification per mentioned user per post/comment, even if the same
-- handle appears several times in the content.
create unique index if not exists notifications_mention_once_idx
  on public.notifications (
    recipient_id,
    actor_id,
    post_id,
    coalesce(comment_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  where type = 'mention';

create unique index if not exists notifications_reply_once_idx
  on public.notifications (recipient_id, actor_id, comment_id)
  where type = 'reply';

-- ---------------------------------------------------------------------------
-- Mention parsing
-- ---------------------------------------------------------------------------

-- Matches `@username` only when the @ starts a token, so `name@example.com`
-- never becomes a mention. Usernames are ASCII by the profiles check.
create or replace function public.extract_mentions(content text)
returns text[]
language sql
immutable
set search_path = public
as $$
  select coalesce(array_agg(distinct lower(matches.match[2])), '{}'::text[])
  from regexp_matches(
    coalesce(content, ''),
    '(^|[^A-Za-z0-9_])@([A-Za-z0-9_]{3,24})',
    'g'
  ) as matches(match);
$$;

-- ---------------------------------------------------------------------------
-- Triggers: mentions, replies, and ordinary comment notifications
-- ---------------------------------------------------------------------------

create or replace function public.notify_on_post_mentions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  mentioned text;
  mentioned_id uuid;
begin
  foreach mentioned in array public.extract_mentions(new.content)
  loop
    select p.id into mentioned_id
    from public.profiles p
    where p.username = mentioned;

    if mentioned_id is not null and mentioned_id <> new.author_id then
      insert into public.notifications (
        recipient_id,
        actor_id,
        type,
        post_id,
        comment_id
      )
      values (mentioned_id, new.author_id, 'mention', new.id, null)
      on conflict do nothing;
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists posts_notify_mentions on public.posts;
create trigger posts_notify_mentions
  after insert on public.posts
  for each row execute function public.notify_on_post_mentions();

-- A comment can notify the post author, the author of the comment being
-- answered, and anyone mentioned in the text. Each person gets at most one
-- notification: reply wins over comment, and mentions are skipped for people
-- who were already notified by this comment.
create or replace function public.notify_on_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post_author uuid;
  parent_author uuid;
  mentioned text;
  mentioned_id uuid;
begin
  select p.author_id into post_author
  from public.posts p
  where p.id = new.post_id;

  if new.parent_id is not null then
    select c.author_id into parent_author
    from public.comments c
    where c.id = new.parent_id
      and c.post_id = new.post_id;
  end if;

  if parent_author is not null and parent_author <> new.author_id then
    insert into public.notifications (
      recipient_id,
      actor_id,
      type,
      post_id,
      comment_id
    )
    values (parent_author, new.author_id, 'reply', new.post_id, new.id)
    on conflict do nothing;
  end if;

  if post_author is not null
    and post_author <> new.author_id
    and post_author is distinct from parent_author then
    insert into public.notifications (
      recipient_id,
      actor_id,
      type,
      post_id,
      comment_id
    )
    values (post_author, new.author_id, 'comment', new.post_id, new.id);
  end if;

  foreach mentioned in array public.extract_mentions(new.content)
  loop
    select p.id into mentioned_id
    from public.profiles p
    where p.username = mentioned;

    if mentioned_id is not null
      and mentioned_id <> new.author_id
      and mentioned_id is distinct from parent_author
      and mentioned_id is distinct from post_author then
      insert into public.notifications (
        recipient_id,
        actor_id,
        type,
        post_id,
        comment_id
      )
      values (mentioned_id, new.author_id, 'mention', new.post_id, new.id)
      on conflict do nothing;
    end if;
  end loop;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Function privileges
-- ---------------------------------------------------------------------------

revoke all on function public.extract_mentions(text) from public;
revoke all on function public.validate_comment_parent() from public, anon, authenticated;
revoke all on function public.notify_on_post_mentions() from public, anon, authenticated;
revoke all on function public.notify_on_comment() from public, anon, authenticated;
