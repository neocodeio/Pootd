-- ============================================================================
-- Pootd — up to three social accounts on a profile
-- Run after 0017_suggested_profiles.sql in the Supabase SQL Editor.
-- Safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Column
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists social_links jsonb not null default '[]'::jsonb;

-- 0001_init.sql granted only the original profile columns. The new one needs
-- its own grant or a profile update that sends it is rejected.
grant update (social_links) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Validation
-- ---------------------------------------------------------------------------

-- A profile may show at most three accounts. Each entry must be one of the
-- supported platforms and a https URL on that platform's own domain, so an
-- icon can never point somewhere it does not claim. The frontend mirrors these
-- rules in `frontend/src/lib/social.ts`.
create or replace function public.valid_social_links(links jsonb)
returns boolean
language sql
immutable
set search_path = public
as $$
  select case
    when links is null or jsonb_typeof(links) <> 'array' then false
    when jsonb_array_length(links) > 3 then false
    else not exists (
      select 1
      from jsonb_array_elements(links) as element
      where jsonb_typeof(element) <> 'object'
        or coalesce(element ->> 'url', '') !~* '^https://'
        or char_length(coalesce(element ->> 'url', '')) > 2048
        or case element ->> 'platform'
          when 'x' then coalesce(element ->> 'url', '') !~* '^https://(www\.)?(x|twitter)\.com(/|$)'
          when 'github' then coalesce(element ->> 'url', '') !~* '^https://(www\.)?github\.com(/|$)'
          when 'linkedin' then coalesce(element ->> 'url', '') !~* '^https://(www\.)?linkedin\.com(/|$)'
          when 'instagram' then coalesce(element ->> 'url', '') !~* '^https://(www\.)?instagram\.com(/|$)'
          when 'telegram' then coalesce(element ->> 'url', '') !~* '^https://(www\.)?(t\.me|telegram\.me)(/|$)'
          when 'youtube' then coalesce(element ->> 'url', '') !~* '^https://(www\.)?(youtube\.com|youtu\.be)(/|$)'
          else true
        end
    )
  end;
$$;

alter table public.profiles
  drop constraint if exists profiles_social_links_check;

alter table public.profiles
  add constraint profiles_social_links_check
  check (public.valid_social_links(social_links));

-- ---------------------------------------------------------------------------
-- Move the old GitHub profile field into the new account list
-- ---------------------------------------------------------------------------

-- `profiles.github` predates social accounts. Copy it once so nobody loses a
-- link that was already on their profile; the column stays for history.
update public.profiles
set social_links = jsonb_build_array(
  jsonb_build_object('platform', 'github', 'url', github)
)
where github ~* '^https://(www\.)?github\.com(/|$)'
  and social_links = '[]'::jsonb;
