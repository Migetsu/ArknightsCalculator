-- Migration: 0002_user_data.sql
-- Description: User-scoped cloud data for plans, settings, depot snapshot with strict RLS.

create table public.user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plans jsonb not null default '[]'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  depot jsonb not null default '{}'::jsonb,
  roster_synced_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.user_data enable row level security;

-- Deny-by-default; only the owner may read/write their own row.
-- (select auth.uid()) wrapper for stable subquery plan (Supabase perf guidance).
create policy "user_data_select_own" on public.user_data
  for select using ((select auth.uid()) = user_id);

create policy "user_data_insert_own" on public.user_data
  for insert with check ((select auth.uid()) = user_id);

create policy "user_data_update_own" on public.user_data
  for update using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "user_data_delete_own" on public.user_data
  for delete using ((select auth.uid()) = user_id);

create index user_data_updated_at_idx on public.user_data (updated_at desc);

-- Reusable updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger user_data_set_updated_at
  before update on public.user_data
  for each row execute function public.set_updated_at();
