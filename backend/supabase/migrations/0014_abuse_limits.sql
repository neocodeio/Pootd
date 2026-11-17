-- ============================================================================
-- Pootd — abuse limits and trending-tag quality
-- Run after 0013_arabic_search.sql in the Supabase SQL Editor.
-- Safe to re-run.
--
-- 0007_rate_limits.sql covered posts and comments only. Likes, follows,
-- bookmarks and reports are just as scriptable through the anon key, so they
-- get the same database-enforced ceiling. The limits are intentionally far
-- above normal use: they stop loops, not people.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Likes: 100 per 10 minutes
-- ---------------------------------------------------------------------------

create or replace function public.enforce_like_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent integer;
begin
  select count(*) into recent
  from public.likes l
  where l.user_id = new.user_id
    and l.created_at > now() - interval '10 minutes';

  if recent >= 100 then
    raise exception 'تمهّل قليلًا: تقدر تسوي 100 إعجاب كل 10 دقائق.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists likes_rate_limit on public.likes;
create trigger likes_rate_limit
  before insert on public.likes
  for each row execute function public.enforce_like_rate_limit();

-- ---------------------------------------------------------------------------
-- Follows: 60 per hour
-- ---------------------------------------------------------------------------

create or replace function public.enforce_follow_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent integer;
begin
  select count(*) into recent
  from public.follows f
  where f.follower_id = new.follower_id
    and f.created_at > now() - interval '1 hour';

  if recent >= 60 then
    raise exception 'تمهّل قليلًا: تقدر تتابع 60 حسابًا في الساعة.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists follows_rate_limit on public.follows;
create trigger follows_rate_limit
  before insert on public.follows
  for each row execute function public.enforce_follow_rate_limit();

-- ---------------------------------------------------------------------------
-- Bookmarks: 120 per 10 minutes
-- ---------------------------------------------------------------------------

create or replace function public.enforce_bookmark_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent integer;
begin
  select count(*) into recent
  from public.bookmarks b
  where b.user_id = new.user_id
    and b.created_at > now() - interval '10 minutes';

  if recent >= 120 then
    raise exception 'تمهّل قليلًا: تقدر تحفظ 120 منشورًا كل 10 دقائق.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists bookmarks_rate_limit on public.bookmarks;
create trigger bookmarks_rate_limit
  before insert on public.bookmarks
  for each row execute function public.enforce_bookmark_rate_limit();

-- ---------------------------------------------------------------------------
-- Reports: 20 per hour
-- ---------------------------------------------------------------------------

create or replace function public.enforce_report_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent integer;
begin
  select count(*) into recent
  from public.reports r
  where r.reporter_id = new.reporter_id
    and r.created_at > now() - interval '1 hour';

  if recent >= 20 then
    raise exception 'تمهّل قليلًا: تقدر ترسل 20 بلاغًا في الساعة.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists reports_rate_limit on public.reports;
create trigger reports_rate_limit
  before insert on public.reports
  for each row execute function public.enforce_report_rate_limit();

revoke all on function public.enforce_like_rate_limit() from public, anon, authenticated;
revoke all on function public.enforce_follow_rate_limit() from public, anon, authenticated;
revoke all on function public.enforce_bookmark_rate_limit() from public, anon, authenticated;
revoke all on function public.enforce_report_rate_limit() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Trending tags: a tag needs at least two posts in the window
--
-- With one post every tag has a count of 1, so the strip ranked noise. A tag
-- now trends only when someone else picked it up too.
-- ---------------------------------------------------------------------------

create or replace function public.get_trending_tags(tag_limit integer default 8)
returns table (tag text, post_count bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select t.tag, count(*)::bigint as post_count
  from public.posts as p
  cross join lateral unnest(p.tags) as t(tag)
  where p.created_at > now() - interval '30 days'
  group by t.tag
  having count(*) >= 2
  order by post_count desc, t.tag asc
  limit greatest(least(coalesce(tag_limit, 8), 20), 1);
$$;

revoke all on function public.get_trending_tags(integer) from public;
grant execute on function public.get_trending_tags(integer) to anon, authenticated;
