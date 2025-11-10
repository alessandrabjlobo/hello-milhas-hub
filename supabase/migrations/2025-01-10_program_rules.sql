create table if not exists public.program_rules (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null,
  airline_id uuid not null,
  cpf_limit integer not null check (cpf_limit between 1 and 1000),
  renewal_type text not null check (renewal_type in ('annual','rolling')),
  updated_by uuid,
  updated_at timestamptz not null default now()
);

create unique index if not exists ux_program_rules_supplier_airline
  on public.program_rules (supplier_id, airline_id);
