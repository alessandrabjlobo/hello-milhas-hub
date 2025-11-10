alter table public.program_rules enable row level security;

-- ajuste 'public.profiles' se seu mapa user->supplier estiver em outra tabela
create policy "read own supplier program rules"
on public.program_rules for select to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.supplier_id = program_rules.supplier_id
  )
);

create policy "insert for own supplier"
on public.program_rules for insert to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.supplier_id = program_rules.supplier_id
  )
);

create policy "update own supplier rows"
on public.program_rules for update to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.supplier_id = program_rules.supplier_id
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.supplier_id = program_rules.supplier_id
  )
);
