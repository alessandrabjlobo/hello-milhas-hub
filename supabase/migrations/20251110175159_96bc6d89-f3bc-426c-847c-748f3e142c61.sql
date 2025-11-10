-- Ensure airline_companies table exists with proper columns
create table if not exists public.airline_companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  user_id uuid not null,
  cost_per_mile numeric not null default 0.029,
  cpf_limit integer not null default 25,
  renewal_type renewal_type not null default 'annual',
  renewal_config jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS on airline_companies
alter table public.airline_companies enable row level security;

-- Drop existing policies to recreate them
drop policy if exists ac_select on public.airline_companies;
drop policy if exists ac_write on public.airline_companies;
drop policy if exists "Authenticated users can view airline companies" on public.airline_companies;
drop policy if exists "Only admins can create airline companies" on public.airline_companies;
drop policy if exists "Only admins can delete airline companies" on public.airline_companies;
drop policy if exists "Only admins can update airline companies" on public.airline_companies;

-- SELECT: allow any authenticated user to read airlines
create policy "Authenticated users can view airline companies"
  on public.airline_companies
  for select
  to authenticated
  using (true);

-- INSERT: only admins may create airlines
create policy "Only admins can create airline companies"
  on public.airline_companies
  for insert
  to authenticated
  with check (has_role(auth.uid(), 'admin'::app_role));

-- UPDATE: only admins may update airlines
create policy "Only admins can update airline companies"
  on public.airline_companies
  for update
  to authenticated
  using (has_role(auth.uid(), 'admin'::app_role));

-- DELETE: only admins may delete airlines
create policy "Only admins can delete airline companies"
  on public.airline_companies
  for delete
  to authenticated
  using (has_role(auth.uid(), 'admin'::app_role));