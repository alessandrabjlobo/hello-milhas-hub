-- Fix cpf_registry RLS policies (table already exists)
DROP POLICY IF EXISTS "Users can view their own CPFs" ON public.cpf_registry;
DROP POLICY IF EXISTS "Users can create their own CPFs" ON public.cpf_registry;
DROP POLICY IF EXISTS "Users can update their own CPFs" ON public.cpf_registry;
DROP POLICY IF EXISTS "Users can delete their own CPFs" ON public.cpf_registry;

-- New supplier-scoped policies
CREATE POLICY "Users can view CPFs for their supplier accounts"
ON public.cpf_registry FOR SELECT
USING (
  public.is_admin(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.mileage_accounts ma
    WHERE ma.id = cpf_registry.airline_company_id
    AND ma.supplier_id = public.get_user_supplier_id(auth.uid())
  )
);

CREATE POLICY "Users can insert CPFs for their supplier accounts"
ON public.cpf_registry FOR INSERT
WITH CHECK (
  NOT public.is_locked(auth.uid()) AND (
    public.is_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.mileage_accounts ma
      WHERE ma.id = cpf_registry.airline_company_id
      AND ma.supplier_id = public.get_user_supplier_id(auth.uid())
    )
  )
);

CREATE POLICY "Users can update CPFs for their supplier accounts"
ON public.cpf_registry FOR UPDATE
USING (
  NOT public.is_locked(auth.uid()) AND (
    public.is_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.mileage_accounts ma
      WHERE ma.id = cpf_registry.airline_company_id
      AND ma.supplier_id = public.get_user_supplier_id(auth.uid())
    )
  )
);

CREATE POLICY "Users can delete CPFs for their supplier accounts"
ON public.cpf_registry FOR DELETE
USING (
  NOT public.is_locked(auth.uid()) AND (
    public.is_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.mileage_accounts ma
      WHERE ma.id = cpf_registry.airline_company_id
      AND ma.supplier_id = public.get_user_supplier_id(auth.uid())
    )
  )
);