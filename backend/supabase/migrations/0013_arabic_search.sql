-- ============================================================================
-- Pootd — Arabic-aware search
-- Run after 0012_follow_counts.sql in the Supabase SQL Editor.
-- Safe to re-run.
--
-- Before this migration search compared raw text with ILIKE, so "امن" never
-- matched "أمن", "مساله" never matched "مسألة", and "شخص" never matched
-- "شخصٌ". The function below folds those variants into one form, and the
-- generated `search_text` columns store the folded text.
--
-- `frontend/src/lib/validation.ts` mirrors this function exactly
-- (`normalizeArabic`). If the folding rules change, change both sides.
-- ============================================================================

create extension if not exists pg_trgm;

create or replace function public.normalize_arabic(input text)
returns text
language sql
immutable
parallel safe
set search_path = public
as $$
  -- Written as one replace() per letter (instead of translate()) so it reads
  -- the same as `normalizeArabic` in the frontend and the two cannot drift.
  select trim(
    regexp_replace(
      lower(
        replace(
          replace(
            replace(
              replace(
                replace(
                  replace(
                    replace(
                      replace(
                        -- Tashkeel (064B–0652), superscript alef (0670), tatweel (0640).
                        regexp_replace(
                          coalesce(input, ''),
                          E'[\u064B-\u0652\u0670\u0640]',
                          '',
                          'g'
                        ),
                        'أ', 'ا'
                      ),
                      'إ', 'ا'
                    ),
                    'آ', 'ا'
                  ),
                  'ٱ', 'ا'
                ),
                'ى', 'ي'
              ),
              'ؤ', 'و'
            ),
            'ئ', 'ي'
          ),
          'ة', 'ه'
        )
      ),
      '\s+',
      ' ',
      'g'
    )
  );
$$;

-- `normalize_arabic` stays executable by everyone on purpose: Postgres
-- evaluates generated columns with the privileges of the writer, so revoking
-- EXECUTE would break inserts and profile updates.

alter table public.posts
  add column if not exists search_text text
  generated always as (public.normalize_arabic(content)) stored;

alter table public.profiles
  add column if not exists search_text text
  generated always as (public.normalize_arabic(display_name || ' ' || username)) stored;

-- Trigram indexes keep `search_text ILIKE '%term%'` fast as the community grows.
create index if not exists posts_search_text_trgm_idx
  on public.posts using gin (search_text gin_trgm_ops);

create index if not exists profiles_search_text_trgm_idx
  on public.profiles using gin (search_text gin_trgm_ops);
