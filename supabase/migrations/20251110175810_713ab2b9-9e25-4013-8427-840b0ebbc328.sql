-- Step 1: Add supplier_id column to airline_companies
alter table public.airline_companies
  add column if not exists supplier_id uuid references public.suppliers(id);

-- Create index for performance
create index if not exists idx_airline_companies_supplier_id 
  on public.airline_companies(supplier_id);

-- Step 2: Drop old RLS policies
drop policy if exists ac_select on public.airline_companies;
drop policy if exists ac_write on public.airline_companies;
drop policy if exists "Authenticated users can view airline companies" on public.airline_companies;
drop policy if exists "Only admins can create airline companies" on public.airline_companies;
drop policy if exists "Only admins can update airline companies" on public.airline_companies;
drop policy if exists "Only admins can delete airline companies" on public.airline_companies;

-- Step 3: Create new RLS policies filtered by supplier_id
-- SELECT: users see only their own companies
create policy "airline_companies_select_own_supplier"
  on public.airline_companies
  for select
  to authenticated
  using (
    supplier_id = get_user_supplier_id(auth.uid())
  );

-- INSERT: users can create companies for their supplier
create policy "airline_companies_insert_own_supplier"
  on public.airline_companies
  for insert
  to authenticated
  with check (
    supplier_id = get_user_supplier_id(auth.uid())
  );

-- UPDATE: users can update only their companies
create policy "airline_companies_update_own_supplier"
  on public.airline_companies
  for update
  to authenticated
  using (
    supplier_id = get_user_supplier_id(auth.uid())
  );

-- DELETE: users can delete only their companies
create policy "airline_companies_delete_own_supplier"
  on public.airline_companies
  for delete
  to authenticated
  using (
    supplier_id = get_user_supplier_id(auth.uid())
  );

-- Step 4: Create function to normalize text to UPPERCASE
create or replace function public.normalize_uppercase(text_input text)
returns text
language sql
immutable
as $$
  select upper(trim(text_input))
$$;

-- Step 5: Create trigger function to auto-normalize name and code
create or replace function public.normalize_airline_fields()
returns trigger
language plpgsql
as $$
begin
  NEW.name = public.normalize_uppercase(NEW.name);
  NEW.code = public.normalize_uppercase(NEW.code);
  return NEW;
end;
$$;

-- Trigger that executes before INSERT/UPDATE
drop trigger if exists normalize_airline_before_insert_update on public.airline_companies;
create trigger normalize_airline_before_insert_update
  before insert or update on public.airline_companies
  for each row
  execute function public.normalize_airline_fields();

-- Step 6: Adjust UNIQUE constraint to (supplier_id, code)
alter table public.airline_companies 
  drop constraint if exists airline_companies_code_key;

-- Add unique constraint per (supplier_id, code)
-- Allows different suppliers to have companies with same code
alter table public.airline_companies
  drop constraint if exists airline_companies_supplier_code_unique;
  
alter table public.airline_companies
  add constraint airline_companies_supplier_code_unique 
  unique (supplier_id, code);