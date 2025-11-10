-- =============================================
-- Step A1: Fix tenant bootstrap + RLS
-- =============================================

-- 1) Ensure pgcrypto extension (for gen_random_uuid)
create extension if not exists pgcrypto;

-- 2) Create suppliers table (idempotent)
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null default '',
  user_id uuid not null,
  pix_key text,
  payment_type text not null default 'per_use',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3) Create profiles table (idempotent)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  company_name text default 'Minha Empresa',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4) Add supplier_id to profiles if missing
alter table public.profiles
  add column if not exists supplier_id uuid references public.suppliers(id);

-- 5) Create airline_companies table (idempotent)
create table if not exists public.airline_companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null,
  user_id uuid not null,
  cpf_limit integer not null default 25,
  renewal_type text not null default 'annual',
  renewal_config jsonb default '{}',
  cost_per_mile numeric not null default 0.029,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 6) Add supplier_id to airline_companies if missing
alter table public.airline_companies
  add column if not exists supplier_id uuid references public.suppliers(id);

-- 7) Create program_rules table (idempotent)
create table if not exists public.program_rules (
  id uuid default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  airline_id uuid not null references public.airline_companies(id),
  cpf_limit integer not null default 25 check (cpf_limit between 1 and 1000),
  renewal_type text not null check (renewal_type in ('annual','rolling')),
  updated_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now(),
  primary key (supplier_id, airline_id)
);

-- 8) Update existing profiles with null supplier_id
do $$
declare
  rec record;
  new_supplier_id uuid;
begin
  for rec in 
    select id, email 
    from public.profiles 
    where supplier_id is null
  loop
    -- Create supplier for this user
    insert into public.suppliers (name, phone, user_id)
    values (
      coalesce(rec.email, 'Minha Agência'),
      '',
      rec.id
    )
    returning id into new_supplier_id;
    
    -- Link to profile
    update public.profiles
    set supplier_id = new_supplier_id
    where id = rec.id;
  end loop;
end $$;

-- 9) Update existing airline_companies with null supplier_id
do $$
declare
  rec record;
  user_supplier_id uuid;
begin
  for rec in 
    select id, user_id 
    from public.airline_companies 
    where supplier_id is null
  loop
    -- Get supplier_id for this user
    select supplier_id into user_supplier_id
    from public.profiles
    where id = rec.user_id;
    
    if user_supplier_id is not null then
      update public.airline_companies
      set supplier_id = user_supplier_id
      where id = rec.id;
    end if;
  end loop;
end $$;

-- 10) Now make supplier_id NOT NULL (after data is fixed)
do $$
begin
  -- Only alter if no nulls remain
  if not exists (select 1 from public.profiles where supplier_id is null) then
    alter table public.profiles
      alter column supplier_id set not null;
  end if;
  
  if not exists (select 1 from public.airline_companies where supplier_id is null) then
    alter table public.airline_companies
      alter column supplier_id set not null;
  end if;
end $$;

-- 11) Create or replace the auto-provision function
create or replace function public.ensure_profile_and_supplier(p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_supplier_id uuid;
  v_user_email text;
begin
  -- Get user email
  select email into v_user_email
  from auth.users where id = p_user_id;

  -- Ensure profile exists
  insert into public.profiles (id, email, full_name)
  values (p_user_id, v_user_email, coalesce(v_user_email, 'Usuário'))
  on conflict (id) do nothing;

  -- Check if supplier_id is null
  select supplier_id into v_supplier_id
  from public.profiles where id = p_user_id;

  if v_supplier_id is null then
    -- Create supplier
    insert into public.suppliers (name, phone, user_id)
    values (
      coalesce(v_user_email, 'Minha Agência'),
      '',
      p_user_id
    )
    returning id into v_supplier_id;

    -- Link to profile
    update public.profiles
    set supplier_id = v_supplier_id
    where id = p_user_id;
  end if;

  return v_supplier_id;
end $$;

-- 12) Create trigger function
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ensure_profile_and_supplier(NEW.id);
  return NEW;
end $$;

-- 13) Create trigger (idempotent)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- =============================================
-- RLS POLICIES
-- =============================================

-- 14) Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.suppliers enable row level security;
alter table public.airline_companies enable row level security;
alter table public.program_rules enable row level security;

-- 15) Drop all existing policies to start fresh
drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Admins can view all profiles" on public.profiles;
drop policy if exists "Admins can update all profiles" on public.profiles;

drop policy if exists "Users can view their own supplier" on public.suppliers;
drop policy if exists "Users can view their own suppliers" on public.suppliers;
drop policy if exists "Admins can view all suppliers" on public.suppliers;
drop policy if exists "Only admins can create suppliers" on public.suppliers;
drop policy if exists "Only admins can update suppliers" on public.suppliers;
drop policy if exists "Only admins can delete suppliers" on public.suppliers;

drop policy if exists "airline_companies_select_own_supplier" on public.airline_companies;
drop policy if exists "airline_companies_insert_own_supplier" on public.airline_companies;
drop policy if exists "airline_companies_update_own_supplier" on public.airline_companies;
drop policy if exists "airline_companies_delete_own_supplier" on public.airline_companies;
drop policy if exists "airline_companies_select_all" on public.airline_companies;

drop policy if exists "program_rules_select_own_supplier" on public.program_rules;
drop policy if exists "program_rules_insert_own_supplier" on public.program_rules;
drop policy if exists "program_rules_update_own_supplier" on public.program_rules;
drop policy if exists "program_rules_delete_own_supplier" on public.program_rules;

-- 16) PROFILES policies
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- 17) SUPPLIERS policies
create policy "suppliers_select_own"
  on public.suppliers for select
  to authenticated
  using (
    id in (
      select supplier_id 
      from public.profiles 
      where id = auth.uid()
    )
  );

-- 18) AIRLINE_COMPANIES policies
create policy "airline_companies_select_all"
  on public.airline_companies for select
  to authenticated
  using (true);

create policy "airline_companies_insert_own_supplier"
  on public.airline_companies for insert
  to authenticated
  with check (
    supplier_id = (
      select supplier_id 
      from public.profiles 
      where id = auth.uid()
    )
  );

create policy "airline_companies_update_own_supplier"
  on public.airline_companies for update
  to authenticated
  using (
    supplier_id = (
      select supplier_id 
      from public.profiles 
      where id = auth.uid()
    )
  );

create policy "airline_companies_delete_own_supplier"
  on public.airline_companies for delete
  to authenticated
  using (
    supplier_id = (
      select supplier_id 
      from public.profiles 
      where id = auth.uid()
    )
  );

-- 19) PROGRAM_RULES policies
create policy "program_rules_select_own_supplier"
  on public.program_rules for select
  to authenticated
  using (
    supplier_id = (
      select supplier_id 
      from public.profiles 
      where id = auth.uid()
    )
  );

create policy "program_rules_insert_own_supplier"
  on public.program_rules for insert
  to authenticated
  with check (
    supplier_id = (
      select supplier_id 
      from public.profiles 
      where id = auth.uid()
    )
  );

create policy "program_rules_update_own_supplier"
  on public.program_rules for update
  to authenticated
  using (
    supplier_id = (
      select supplier_id 
      from public.profiles 
      where id = auth.uid()
    )
  );

create policy "program_rules_delete_own_supplier"
  on public.program_rules for delete
  to authenticated
  using (
    supplier_id = (
      select supplier_id 
      from public.profiles 
      where id = auth.uid()
    )
  );