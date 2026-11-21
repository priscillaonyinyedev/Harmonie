-- HARMONIE shared product, image, and contact store.
-- Run this in the Supabase SQL Editor after creating a project.

create table if not exists public.harmonie_content (
  id text primary key check (id = 'main'),
  products jsonb not null default '[]'::jsonb,
  site_images jsonb not null default '{}'::jsonb,
  site_contact jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.harmonie_content enable row level security;
grant select on public.harmonie_content to anon, authenticated;
grant insert, update on public.harmonie_content to authenticated;

drop policy if exists "Anyone can read HARMONIE content" on public.harmonie_content;
create policy "Anyone can read HARMONIE content"
  on public.harmonie_content for select to anon, authenticated using (true);

drop policy if exists "Signed-in owner can add HARMONIE content" on public.harmonie_content;
create policy "Signed-in owner can add HARMONIE content"
  on public.harmonie_content for insert to authenticated with check (true);

drop policy if exists "Signed-in owner can update HARMONIE content" on public.harmonie_content;
create policy "Signed-in owner can update HARMONIE content"
  on public.harmonie_content for update to authenticated using (true) with check (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('harmonie-media', 'harmonie-media', true, 5242880, array['image/jpeg'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg'];

drop policy if exists "Signed-in owner can upload HARMONIE photos" on storage.objects;
create policy "Signed-in owner can upload HARMONIE photos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'harmonie-media');

drop policy if exists "Signed-in owner can update HARMONIE photos" on storage.objects;
create policy "Signed-in owner can update HARMONIE photos"
  on storage.objects for update to authenticated
  using (bucket_id = 'harmonie-media') with check (bucket_id = 'harmonie-media');

drop policy if exists "Signed-in owner can delete HARMONIE photos" on storage.objects;
create policy "Signed-in owner can delete HARMONIE photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'harmonie-media');
