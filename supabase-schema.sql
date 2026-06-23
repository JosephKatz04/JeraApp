-- Jera App Supabase schema
-- Run this in Supabase SQL Editor.
-- Put the only two allowed account emails here before creating/signing in users.

create extension if not exists pgcrypto;

create table if not exists approved_emails (
  email text primary key
);

insert into approved_emails (email)
values
  ('joey.a.katz@gmail.com'),
  ('lerakoriin19@gmail.com')
on conflict (email) do nothing;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  display_name text,
  is_approved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, is_approved)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    exists (select 1 from public.approved_emails where lower(email) = lower(new.email))
  )
  on conflict (id) do update
    set email = excluded.email,
        is_approved = excluded.is_approved,
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_approved_user()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_approved = true
  );
$$;

create or replace function public.prevent_profile_self_approval()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() = new.id and old.is_approved is distinct from new.is_approved then
    new.is_approved = old.is_approved;
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_profile_self_approval on profiles;
create trigger prevent_profile_self_approval
before update on profiles
for each row execute function public.prevent_profile_self_approval();

create table if not exists memories (
  id text primary key default gen_random_uuid()::text,
  author_id uuid references auth.users(id) on delete set null,
  title text not null,
  memory_date date not null,
  location text,
  description text,
  photo_url text,
  category text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists love_notes (
  id text primary key default gen_random_uuid()::text,
  author_id uuid references auth.users(id) on delete set null,
  author_name text,
  display_author text,
  message text not null,
  note_time timestamptz not null,
  mood text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists countdown_events (
  id text primary key default gen_random_uuid()::text,
  author_id uuid references auth.users(id) on delete set null,
  event_type text not null default 'next-trip',
  name text not null,
  event_date date not null,
  message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists photos (
  id text primary key default gen_random_uuid()::text,
  author_id uuid references auth.users(id) on delete set null,
  image_url text not null,
  caption text not null,
  photo_date date not null,
  category text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists date_ideas (
  id text primary key,
  title text not null,
  category text not null,
  estimated_time text,
  needs text[] default '{}',
  instructions text,
  built_in boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists favorite_date_ideas (
  idea_id text primary key,
  author_id uuid references auth.users(id) on delete set null,
  is_favorite boolean not null default false,
  is_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists memory_locations (
  id text primary key default gen_random_uuid()::text,
  author_id uuid references auth.users(id) on delete set null,
  place_name text not null,
  latitude double precision not null,
  longitude double precision not null,
  memory_date date not null,
  description text,
  photo_url text,
  memory_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists bucket_list_items (
  id text primary key default gen_random_uuid()::text,
  author_id uuid references auth.users(id) on delete set null,
  title text not null,
  status text not null,
  notes text,
  target_date date,
  category text,
  memory_photo_url text,
  memory_caption text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists next_visits (
  id text primary key default gen_random_uuid()::text,
  author_id uuid references auth.users(id) on delete set null,
  title text not null,
  start_date date not null,
  end_date date not null,
  city text,
  arrival_time time,
  departure_time time,
  travel_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists visit_itinerary_items (
  id text primary key default gen_random_uuid()::text,
  visit_id text references next_visits(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  date date not null,
  time time,
  title text not null,
  location text,
  notes text,
  category text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists visit_checklist_items (
  id text primary key default gen_random_uuid()::text,
  visit_id text references next_visits(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  list_type text not null check (list_type in ('packing', 'wish')),
  label text not null,
  done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists daily_three_entries (
  id text primary key default gen_random_uuid()::text,
  author_id uuid references auth.users(id) on delete set null,
  author_name text,
  display_author text not null,
  entry_date date not null,
  item_1 text not null,
  item_2 text not null,
  item_3 text not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entry_date, display_author)
);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles','memories','love_notes','countdown_events','photos','date_ideas',
    'favorite_date_ideas','memory_locations','bucket_list_items','next_visits',
    'visit_itinerary_items','visit_checklist_items','daily_three_entries'
  ]
  loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', table_name, table_name);
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end $$;

drop policy if exists "approved users can read profiles" on profiles;
drop policy if exists "approved users can update own profile" on profiles;
create policy "approved users can read profiles" on profiles for select using (public.is_approved_user() or id = auth.uid());
create policy "approved users can update own profile" on profiles for update using (id = auth.uid()) with check (id = auth.uid());

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'memories','love_notes','countdown_events','photos','date_ideas',
    'favorite_date_ideas','memory_locations','bucket_list_items','next_visits',
    'visit_itinerary_items','visit_checklist_items','daily_three_entries'
  ]
  loop
    execute format('drop policy if exists "approved users can read %I" on public.%I', table_name, table_name);
    execute format('drop policy if exists "approved users can insert %I" on public.%I', table_name, table_name);
    execute format('drop policy if exists "approved users can update %I" on public.%I', table_name, table_name);
    execute format('drop policy if exists "approved users can delete %I" on public.%I', table_name, table_name);
    execute format('create policy "approved users can read %I" on public.%I for select using (public.is_approved_user())', table_name, table_name);
    execute format('create policy "approved users can insert %I" on public.%I for insert with check (public.is_approved_user())', table_name, table_name);
    execute format('create policy "approved users can update %I" on public.%I for update using (public.is_approved_user()) with check (public.is_approved_user())', table_name, table_name);
    execute format('create policy "approved users can delete %I" on public.%I for delete using (public.is_approved_user())', table_name, table_name);
  end loop;
end $$;

insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do update set public = excluded.public;

drop policy if exists "approved users can read photo files" on storage.objects;
drop policy if exists "approved users can upload photo files" on storage.objects;
drop policy if exists "approved users can update photo files" on storage.objects;
drop policy if exists "approved users can delete photo files" on storage.objects;

create policy "approved users can read photo files"
on storage.objects for select
using (bucket_id = 'photos' and public.is_approved_user());

create policy "approved users can upload photo files"
on storage.objects for insert
with check (bucket_id = 'photos' and public.is_approved_user());

create policy "approved users can update photo files"
on storage.objects for update
using (bucket_id = 'photos' and public.is_approved_user())
with check (bucket_id = 'photos' and public.is_approved_user());

create policy "approved users can delete photo files"
on storage.objects for delete
using (bucket_id = 'photos' and public.is_approved_user());
