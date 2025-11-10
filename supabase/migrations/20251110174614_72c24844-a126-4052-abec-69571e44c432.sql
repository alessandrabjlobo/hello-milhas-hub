-- Enable pgcrypto extension
create extension if not exists pgcrypto;

-- Ensure suppliers table exists
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null default '',
  notes text,
  payment_type text not null default 'per_use',
  pix_key text,
  user_id uuid not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS on suppliers if not already enabled
alter table public.suppliers enable row level security;

-- Drop existing policies if they exist to recreate them
drop policy if exists "own-supplier" on public.suppliers;
drop policy if exists "Users can view their own supplier" on public.suppliers;

-- Create policy for users to view their own supplier
create policy "Users can view their own supplier"
  on public.suppliers
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.supplier_id = suppliers.id
    )
  );

-- Function to ensure profile and supplier for a user
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
  -- Get user email for supplier name
  select email into v_user_email
  from auth.users where id = p_user_id;

  -- Ensure profile exists (profiles.id = auth.users.id)
  insert into public.profiles (id, email, full_name)
  values (p_user_id, v_user_email, coalesce(v_user_email, 'Usuário'))
  on conflict (id) do nothing;

  -- Check if profiles.supplier_id is null
  select supplier_id into v_supplier_id
  from public.profiles where id = p_user_id;

  if v_supplier_id is null then
    -- Create a new supplier for this user
    insert into public.suppliers (name, phone, user_id)
    values (
      coalesce(v_user_email, 'Minha Agência'),
      '',
      p_user_id
    )
    returning id into v_supplier_id;

    -- Link supplier to profile
    update public.profiles
    set supplier_id = v_supplier_id
    where id = p_user_id;
  end if;

  return v_supplier_id;
end $$;

-- Function to handle new auth users
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

-- Drop existing trigger if it exists
drop trigger if exists on_auth_user_created on auth.users;

-- Create trigger on auth.users to auto-provision supplier
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Update existing profiles without supplier_id
do $$
declare
  rec record;
begin
  for rec in select id from public.profiles where supplier_id is null
  loop
    perform public.ensure_profile_and_supplier(rec.id);
  end loop;
end $$;