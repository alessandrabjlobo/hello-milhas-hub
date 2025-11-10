-- Create program_rules table
create table if not exists program_rules (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null,
  airline_id uuid not null,
  cpf_limit int not null default 25,
  renewal_type text not null check (renewal_type in ('annual','rolling')),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (supplier_id, airline_id)
);

-- Enable RLS
alter table program_rules enable row level security;

-- SELECT policy - users can view rules for their supplier
create policy "program_rules_select_own_supplier" on program_rules
for select using (
  exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.supplier_id = program_rules.supplier_id
  )
);

-- INSERT policy - users can create rules for their supplier
create policy "program_rules_insert_own_supplier" on program_rules
for insert with check (
  exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.supplier_id = program_rules.supplier_id
  )
);

-- UPDATE policy - users can update rules for their supplier
create policy "program_rules_update_own_supplier" on program_rules
for update using (
  exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.supplier_id = program_rules.supplier_id
  )
);

-- DELETE policy - users can delete rules for their supplier
create policy "program_rules_delete_own_supplier" on program_rules
for delete using (
  exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.supplier_id = program_rules.supplier_id
  )
);

-- Add trigger to update updated_at timestamp
create trigger update_program_rules_updated_at
before update on program_rules
for each row
execute function update_updated_at_column();