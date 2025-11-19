-- ===========================================================
-- MIGRATION: Segurança e Personalização de Agência
-- ===========================================================

-- ============ FASE 2.2: RESTRINGIR RLS (DADOS SENSÍVEIS) ============

-- 1. PROFILES: Usuários só veem o próprio perfil
DROP POLICY IF EXISTS "Users can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;

CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 2. CPF_REGISTRY: Acesso mais restrito
DROP POLICY IF EXISTS "Users can view CPFs for their supplier accounts" ON public.cpf_registry;

CREATE POLICY "Users can view CPFs for their supplier accounts" ON public.cpf_registry
  FOR SELECT USING (
    is_admin(auth.uid()) OR (
      EXISTS (
        SELECT 1 FROM mileage_accounts ma
        WHERE ma.id = cpf_registry.airline_company_id
        AND ma.supplier_id = get_user_supplier_id(auth.uid())
      )
    )
  );

-- 3. CUSTOMERS: Apenas perfis autorizados
DROP POLICY IF EXISTS "Users can manage their supplier's customers" ON public.customers;

CREATE POLICY "Users can manage their supplier's customers" ON public.customers
  FOR ALL USING (
    supplier_id = get_user_supplier_id(auth.uid())
    AND (
      is_admin(auth.uid()) OR
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
      )
    )
  )
  WITH CHECK (
    supplier_id = get_user_supplier_id(auth.uid())
  );

-- ============ FASE 2.3: ADICIONAR SEARCH_PATH ============

ALTER FUNCTION public.update_account_balance(uuid, bigint) SET search_path = public;
ALTER FUNCTION public.update_account_cpf_count(uuid) SET search_path = public;
ALTER FUNCTION public.check_cpf_exists(uuid, text) SET search_path = public;
ALTER FUNCTION public.backfill_cpf_registry() SET search_path = public;
ALTER FUNCTION public.log_audit() SET search_path = public;
ALTER FUNCTION public.encrypt_cpf(text) SET search_path = public;
ALTER FUNCTION public.decrypt_cpf(text) SET search_path = public;
ALTER FUNCTION public.encrypt_password(text) SET search_path = public;
ALTER FUNCTION public.decrypt_password(text) SET search_path = public;
ALTER FUNCTION public.ensure_profile_and_supplier(uuid) SET search_path = public;

-- ============ FASE 3.1: CRIAR TABELA AGENCY_SETTINGS ============

CREATE TABLE IF NOT EXISTS public.agency_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL UNIQUE,
  agency_name text NOT NULL,
  phone text,
  instagram text,
  email text,
  logo_url text,
  address text,
  website text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT fk_agency_settings_supplier
    FOREIGN KEY (supplier_id)
    REFERENCES public.suppliers(id)
    ON DELETE CASCADE
);

-- RLS para agency_settings
ALTER TABLE public.agency_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their agency settings" ON public.agency_settings
  FOR ALL USING (
    supplier_id IN (
      SELECT id FROM public.suppliers WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    supplier_id IN (
      SELECT id FROM public.suppliers WHERE user_id = auth.uid()
    )
  );

-- Trigger para updated_at
CREATE TRIGGER update_agency_settings_updated_at
  BEFORE UPDATE ON public.agency_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============ FASE 4.1: AJUSTAR TABELA CUSTOMERS ============

ALTER TABLE public.customers 
  ADD COLUMN IF NOT EXISTS rg text,
  ADD COLUMN IF NOT EXISTS birth_date date;

-- Índices para busca rápida (sem gin_trgm_ops)
CREATE INDEX IF NOT EXISTS idx_customers_cpf ON public.customers(cpf_encrypted);
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_supplier ON public.customers(supplier_id);

-- Comentários
COMMENT ON TABLE public.agency_settings IS 'Configurações personalizadas da agência para orçamentos';
COMMENT ON COLUMN public.customers.rg IS 'Registro Geral (RG) do cliente';
COMMENT ON COLUMN public.customers.birth_date IS 'Data de nascimento do cliente';