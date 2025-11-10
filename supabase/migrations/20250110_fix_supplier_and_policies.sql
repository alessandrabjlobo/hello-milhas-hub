-- Habilita funções utilitárias
create extension if not exists pgcrypto;

-- 1) Tabelas-base (caso não existam)
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  supplier_id uuid references public.suppliers(id),
  created_at timestamptz not null default now()
);

-- 2) Garante coluna supplier_id (se a tabela profiles já existia)
do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'profiles'
      and column_name  = 'supplier_id'
  ) then
    alter table public.profiles
      add column supplier_id uuid references public.suppliers(id);
  end if;
end$$;

-- 3) Cria um fornecedor padrão e aponta perfis sem supplier
with s as (
  insert into public.suppliers(name)
  values ('Default Supplier')
  returning id
)
update public.profiles p
set supplier_id = s.id
from s
where p.supplier_id is null;

-- 4) Função helper para obter o supplier do usuário logado
create or replace function public.current_user_supplier_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select supplier_id
  from public.profiles
  where id = auth.uid();
$$;

grant execute on function public.current_user_supplier_id() to authenticated;

-- 5) RLS e políticas

-- airline_companies: liberar leitura para usuários autenticados (evita 403)
alter table public.airline_companies enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='airline_companies'
      and policyname='airlines_select_all_auth'
  ) then
    create policy airlines_select_all_auth
      on public.airline_companies
      for select
      to authenticated
      using (true);
  end if;
end$$;

-- agency_program_settings: restringe por supplier do usuário
alter table public.agency_program_settings enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='agency_program_settings'
      and policyname='agency_select_by_supplier'
  ) then
    create policy agency_select_by_supplier
      on public.agency_program_settings
      for select
      to authenticated
      using (supplier_id = public.current_user_supplier_id());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='agency_program_settings'
      and policyname='agency_modify_by_supplier'
  ) then
    create policy agency_modify_by_supplier
      on public.agency_program_settings
      for insert, update, delete
      to authenticated
      with check (supplier_id = public.current_user_supplier_id());
  end if;
end$$;

-- (Opcional) profiles: cada usuário só vê/edita seu próprio perfil
alter table public.profiles enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='profiles'
      and policyname='profiles_self_access'
  ) then
    create policy profiles_self_access
      on public.profiles
      using (id = auth.uid())
      with check (id = auth.uid());
  end if;
end$$;
