-- ============================================================================
-- Pootd — profile expertise: skills, tools, certifications and achievements
-- Run after 0019_mutes.sql in the Supabase SQL Editor.
-- Safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Columns
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists skills text[] not null default '{}'::text[],
  add column if not exists tools text[] not null default '{}'::text[],
  add column if not exists certifications jsonb not null default '[]'::jsonb;

-- 0001_init.sql granted only the original profile columns, so every new column
-- needs its own grant or an update that sends it is rejected.
grant update (skills, tools, certifications) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Validation
-- ---------------------------------------------------------------------------

-- A short label list (a skill or a tool): at most `max_items`, each 1 to
-- `max_length` characters after trimming, and no case-insensitive duplicates.
-- The frontend mirrors these rules in `frontend/src/lib/expertise.ts`.
create or replace function public.valid_label_list(
  items text[],
  max_items integer,
  max_length integer
)
returns boolean
language sql
immutable
set search_path = public
as $$
  select case
    when items is null then false
    when coalesce(array_length(items, 1), 0) > max_items then false
    else not exists (
      select 1
      from unnest(items) as label
      where label is null
        or btrim(label) = ''
        or char_length(label) > max_length
    )
    and (
      select count(distinct lower(btrim(label)))
      from unnest(items) as label
    ) = coalesce(array_length(items, 1), 0)
  end;
$$;

-- Certifications and achievements: at most six entries, each a title, an
-- optional issuer, an optional four-digit year and an optional https link.
create or replace function public.valid_certifications(items jsonb)
returns boolean
language sql
immutable
set search_path = public
as $$
  select case
    when items is null or jsonb_typeof(items) <> 'array' then false
    when jsonb_array_length(items) > 6 then false
    else not exists (
      select 1
      from jsonb_array_elements(items) as element
      where jsonb_typeof(element) <> 'object'
        or char_length(btrim(coalesce(element ->> 'title', ''))) not between 1 and 60
        or char_length(coalesce(element ->> 'issuer', '')) > 60
        -- A CASE keeps the integer cast from running on "abcd": PostgreSQL is
        -- free to reorder `and`, so the regex has to guard the cast this way.
        or case
          when coalesce(element ->> 'year', '') = '' then false
          when coalesce(element ->> 'year', '') ~ '^[0-9]{4}$'
            then (element ->> 'year')::integer not between 1970 and 2100
          else true
        end
        or char_length(coalesce(element ->> 'url', '')) > 2048
        or (
          coalesce(element ->> 'url', '') <> ''
          and coalesce(element ->> 'url', '') !~* '^https://'
        )
    )
  end;
$$;

alter table public.profiles drop constraint if exists profiles_skills_check;
alter table public.profiles
  add constraint profiles_skills_check
  check (public.valid_label_list(skills, 12, 30));

alter table public.profiles drop constraint if exists profiles_tools_check;
alter table public.profiles
  add constraint profiles_tools_check
  check (public.valid_label_list(tools, 12, 30));

alter table public.profiles drop constraint if exists profiles_certifications_check;
alter table public.profiles
  add constraint profiles_certifications_check
  check (public.valid_certifications(certifications));
