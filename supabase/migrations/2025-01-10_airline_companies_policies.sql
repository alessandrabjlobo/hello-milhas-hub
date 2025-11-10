-- Schema e privilégios básicos
grant usage on schema public to authenticated;
grant select on public.airline_companies to authenticated;

-- Habilita RLS
alter table public.airline_companies enable row level security;

-- Remove políticas antigas (se existirem) para evitar duplicação
drop policy if exists "read airline companies (auth)" on public.airline_companies;
drop policy if exists "manage airline companies (admin only)" on public.airline_companies;

-- Leitura para qualquer usuário autenticado
create policy "read airline companies (auth)"
on public.airline_companies
for select
to authenticated
using (true);

-- (Opcional) Escrita apenas para admins via tabela profiles
-- Ajuste o nome/coluna conforme seu schema de perfis
create policy "manage airline companies (admin only)"
on public.airline_companies
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and coalesce(p.is_admin, false) = true
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and coalesce(p.is_admin, false) = true
  )
);
