-- ============================================================================
-- Pootd — posting rate limits
-- Run after 0006_reports.sql in the Supabase SQL Editor. Safe to re-run.
--
-- Enforced inside Postgres so the anon key cannot bypass it from the client.
-- ---------------------------------------------------------------------------

create or replace function public.enforce_post_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent integer;
begin
  select count(*) into recent
  from public.posts p
  where p.author_id = new.author_id
    and p.created_at > now() - interval '10 minutes';

  if recent >= 5 then
    raise exception 'تمهّل قليلًا: تقدر تنشر 5 منشورات كل 10 دقائق.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create or replace function public.enforce_comment_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent integer;
begin
  select count(*) into recent
  from public.comments c
  where c.author_id = new.author_id
    and c.created_at > now() - interval '10 minutes';

  if recent >= 20 then
    raise exception 'تمهّل قليلًا: تقدر تكتب 20 تعليقًا كل 10 دقائق.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists posts_rate_limit on public.posts;
create trigger posts_rate_limit
  before insert on public.posts
  for each row execute function public.enforce_post_rate_limit();

drop trigger if exists comments_rate_limit on public.comments;
create trigger comments_rate_limit
  before insert on public.comments
  for each row execute function public.enforce_comment_rate_limit();

revoke all on function public.enforce_post_rate_limit() from public, anon, authenticated;
revoke all on function public.enforce_comment_rate_limit() from public, anon, authenticated;
