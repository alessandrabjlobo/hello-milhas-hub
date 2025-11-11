-- Fix RLS policies on mileage_accounts to avoid cross-table references and 403s
DROP POLICY IF EXISTS "Users can view their supplier's accounts" ON public.mileage_accounts;
DROP POLICY IF EXISTS "Users can create accounts for their supplier" ON public.mileage_accounts;

-- Recreate SELECT policy using security definer function
CREATE POLICY "Users can view their supplier's accounts"
ON public.mileage_accounts
FOR SELECT
TO authenticated
USING (
  supplier_id = public.get_user_supplier_id(auth.uid())
);

-- Recreate INSERT policy using get_user_supplier_id and admin check
CREATE POLICY "Users can create accounts for their supplier"
ON public.mileage_accounts
FOR INSERT
TO authenticated
WITH CHECK (
  (NOT public.is_locked(auth.uid()))
  AND supplier_id IS NOT NULL
  AND (
    public.is_admin(auth.uid())
    OR supplier_id = public.get_user_supplier_id(auth.uid())
  )
);
