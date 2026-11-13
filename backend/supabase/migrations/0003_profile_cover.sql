-- ============================================================================
-- Pootd — profile cover (header) images
-- Run after 0001_init.sql and 0002_email_otp.sql in the Supabase SQL Editor.
-- Safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Column
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists cover_image_url text not null default '';

-- The column-level grants in 0001_init.sql only cover the original columns,
-- so the new one needs its own grant or profile updates would be rejected.
grant update (cover_image_url) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: public covers bucket, per-user write access
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'covers',
  'covers',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
  set public = true,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp'];

drop policy if exists "Covers are publicly readable" on storage.objects;
create policy "Covers are publicly readable"
  on storage.objects for select
  using (bucket_id = 'covers');

drop policy if exists "Users can upload their own cover" on storage.objects;
create policy "Users can upload their own cover"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update their own cover" on storage.objects;
create policy "Users can update their own cover"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete their own cover" on storage.objects;
create policy "Users can delete their own cover"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
