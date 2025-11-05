-- Update mileage_accounts and movements RLS with soft-lock

-- Mileage accounts soft-lock for writes
DROP POLICY IF EXISTS "Users can create accounts for their supplier" ON public.mileage_accounts;
CREATE POLICY "Users can create accounts for their supplier"
ON public.mileage_accounts FOR INSERT
WITH CHECK (
  NOT public.is_locked(auth.uid()) AND (
    public.is_admin(auth.uid()) OR
    supplier_id = public.get_user_supplier_id(auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can update their supplier's accounts" ON public.mileage_accounts;
CREATE POLICY "Users can update their supplier's accounts"
ON public.mileage_accounts FOR UPDATE
USING (
  NOT public.is_locked(auth.uid()) AND (
    public.is_admin(auth.uid()) OR
    supplier_id = public.get_user_supplier_id(auth.uid())
  )
);

-- Movements soft-lock for writes
DROP POLICY IF EXISTS "Users can create movements for their supplier's accounts" ON public.mileage_movements;
CREATE POLICY "Users can create movements for their supplier's accounts"
ON public.mileage_movements FOR INSERT
WITH CHECK (
  NOT public.is_locked(auth.uid()) AND (
    public.is_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.mileage_accounts ma
      WHERE ma.id = mileage_movements.account_id
      AND ma.supplier_id = public.get_user_supplier_id(auth.uid())
    )
  )
);