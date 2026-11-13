-- ============================================================================
-- Pootd MVP — database schema, security policies, and storage setup
-- Run this file once in the Supabase SQL Editor (Dashboard → SQL Editor).
-- It is written to be safe to re-run, but it is intended as the initial setup.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique
    check (username ~ '^[a-z0-9_]{3,24}$'),
  display_name text not null
    check (char_length(btrim(display_name)) between 1 and 48),
  bio text not null default ''
    check (char_length(bio) <= 240),
  avatar_url text not null default '',
  website text not null default ''
    check (website = '' or website ~* '^https://[^\s]+$'),
  github text not null default ''
    check (github = '' or github ~* '^https://[^\s]+$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  content text not null
    check (char_length(btrim(content)) between 1 and 4000),
  tags text[] not null default '{}'
    check (array_length(tags, 1) is null or array_length(tags, 1) <= 5),
  like_count integer not null default 0
    check (like_count >= 0),
  comment_count integer not null default 0
    check (comment_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.likes (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  content text not null
    check (char_length(btrim(content)) between 1 and 1000),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists posts_created_at_idx
  on public.posts (created_at desc);

create index if not exists posts_author_id_idx
  on public.posts (author_id, created_at desc);

create index if not exists posts_like_count_idx
  on public.posts (like_count desc, created_at desc);

create index if not exists posts_tags_idx
  on public.posts using gin (tags);

create index if not exists comments_post_id_idx
  on public.comments (post_id, created_at asc);

create index if not exists likes_user_id_idx
  on public.likes (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Creates a public profile for every new auth user.
-- Runs as the function owner so it can write to public.profiles safely.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_username text;
  requested_display_name text;
  candidate text;
begin
  requested_username := lower(btrim(coalesce(new.raw_user_meta_data ->> 'username', '')));
  requested_display_name := btrim(coalesce(new.raw_user_meta_data ->> 'display_name', ''));

  if requested_username !~ '^[a-z0-9_]{3,24}$' then
    requested_username := 'user_' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;

  candidate := requested_username;

  -- Deterministic fallback keeps signup working even if the username was taken
  -- between the client-side availability check and this insert.
  if exists (select 1 from public.profiles p where p.username = candidate) then
    candidate := substr(requested_username, 1, 15) || '_' || substr(md5(new.id::text), 1, 8);
  end if;

  if requested_display_name = '' then
    requested_display_name := candidate;
  end if;

  insert into public.profiles (id, username, display_name)
  values (new.id, candidate, left(requested_display_name, 48));

  return new;
end;
$$;

create or replace function public.sync_post_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.posts
      set like_count = like_count + 1
      where id = new.post_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.posts
      set like_count = greatest(like_count - 1, 0)
      where id = old.post_id;
    return old;
  end if;

  return null;
end;
$$;

create or replace function public.sync_post_comment_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.posts
      set comment_count = comment_count + 1
      where id = new.post_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.posts
      set comment_count = greatest(comment_count - 1, 0)
      where id = old.post_id;
    return old;
  end if;

  return null;
end;
$$;

-- Normalizes and validates tags server-side so the client cannot store junk.
create or replace function public.normalize_post_tags()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  select coalesce(array_agg(tag order by tag), '{}'::text[])
  into new.tags
  from (
    select distinct lower(btrim(tags.tag)) as tag
    from unnest(new.tags) as tags(tag)
    where lower(btrim(tags.tag)) ~ '^[a-z0-9][a-z0-9-]{0,23}$'
  ) normalized;

  return new;
end;
$$;

-- Aggregate profile numbers without transferring every post to the client.
create or replace function public.get_profile_stats(profile_id uuid)
returns table (posts bigint, likes bigint, comments bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select
    (select count(*) from public.posts p where p.author_id = profile_id)::bigint as posts,
    (select coalesce(sum(p.like_count), 0) from public.posts p where p.author_id = profile_id)::bigint as likes,
    (select count(*) from public.comments c where c.author_id = profile_id)::bigint as comments;
$$;

-- Trending tags are computed in SQL instead of shipping every tag to the client.
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
  order by post_count desc, t.tag asc
  limit greatest(least(coalesce(tag_limit, 8), 20), 1);
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

drop trigger if exists posts_normalize_tags on public.posts;
create trigger posts_normalize_tags
  before insert or update of tags on public.posts
  for each row execute function public.normalize_post_tags();

drop trigger if exists likes_sync_post_count on public.likes;
create trigger likes_sync_post_count
  after insert or delete on public.likes
  for each row execute function public.sync_post_like_count();

drop trigger if exists comments_sync_post_count on public.comments;
create trigger comments_sync_post_count
  after insert or delete on public.comments
  for each row execute function public.sync_post_comment_count();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;

drop policy if exists "Profiles are readable by everyone" on public.profiles;
create policy "Profiles are readable by everyone"
  on public.profiles for select
  using (true);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Posts are readable by everyone" on public.posts;
create policy "Posts are readable by everyone"
  on public.posts for select
  using (true);

drop policy if exists "Authenticated users can create posts" on public.posts;
create policy "Authenticated users can create posts"
  on public.posts for insert
  to authenticated
  with check (auth.uid() = author_id);

drop policy if exists "Authors can update their own posts" on public.posts;
create policy "Authors can update their own posts"
  on public.posts for update
  to authenticated
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

drop policy if exists "Authors can delete their own posts" on public.posts;
create policy "Authors can delete their own posts"
  on public.posts for delete
  to authenticated
  using (auth.uid() = author_id);

drop policy if exists "Likes are readable by everyone" on public.likes;
create policy "Likes are readable by everyone"
  on public.likes for select
  using (true);

drop policy if exists "Users can like posts" on public.likes;
create policy "Users can like posts"
  on public.likes for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can remove their own likes" on public.likes;
create policy "Users can remove their own likes"
  on public.likes for delete
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Comments are readable by everyone" on public.comments;
create policy "Comments are readable by everyone"
  on public.comments for select
  using (true);

drop policy if exists "Authenticated users can create comments" on public.comments;
create policy "Authenticated users can create comments"
  on public.comments for insert
  to authenticated
  with check (auth.uid() = author_id);

drop policy if exists "Comment authors and post authors can delete comments" on public.comments;
create policy "Comment authors and post authors can delete comments"
  on public.comments for delete
  to authenticated
  using (
    auth.uid() = author_id
    or exists (
      select 1
      from public.posts p
      where p.id = comments.post_id
        and p.author_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Column-level privileges
--
-- RLS protects *which rows* a user can touch. Column grants protect *which
-- fields* they can write, so counters and timestamps cannot be forged through
-- the public API.
-- ---------------------------------------------------------------------------

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant update (username, display_name, bio, avatar_url, website, github)
  on public.profiles to authenticated;

revoke all on public.posts from anon, authenticated;
grant select on public.posts to anon, authenticated;
grant insert (author_id, content, tags) on public.posts to authenticated;
grant update (content, tags) on public.posts to authenticated;
grant delete on public.posts to authenticated;

revoke all on public.likes from anon, authenticated;
grant select on public.likes to anon, authenticated;
grant insert (post_id, user_id) on public.likes to authenticated;
grant delete on public.likes to authenticated;

revoke all on public.comments from anon, authenticated;
grant select on public.comments to anon, authenticated;
grant insert (post_id, author_id, content) on public.comments to authenticated;
grant delete on public.comments to authenticated;

-- Trigger helpers should never be callable as public RPC endpoints.
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.sync_post_like_count() from public, anon, authenticated;
revoke all on function public.sync_post_comment_count() from public, anon, authenticated;
revoke all on function public.normalize_post_tags() from public, anon, authenticated;

revoke all on function public.get_profile_stats(uuid) from public;
grant execute on function public.get_profile_stats(uuid) to anon, authenticated;

revoke all on function public.get_trending_tags(integer) from public;
grant execute on function public.get_trending_tags(integer) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage: public avatars bucket, per-user write access
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
  set public = true,
      file_size_limit = 2097152,
      allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp'];

drop policy if exists "Avatars are publicly readable" on storage.objects;
create policy "Avatars are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update their own avatar" on storage.objects;
create policy "Users can update their own avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete their own avatar" on storage.objects;
create policy "Users can delete their own avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
