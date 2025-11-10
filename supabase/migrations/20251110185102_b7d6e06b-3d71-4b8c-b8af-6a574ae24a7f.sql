-- Update RLS policy for mileage_accounts INSERT to be more explicit about supplier_id requirement
-- This prevents NULL supplier_id insertions and makes the policy clearer

DROP POLICY IF EXISTS "Users can create accounts for their supplier" ON public.mileage_accounts;

CREATE POLICY "Users can create accounts for their supplier"
ON public.mileage_accounts
FOR INSERT
WITH CHECK (
  NOT is_locked(auth.uid()) AND
  supplier_id IS NOT NULL AND
  (
    is_admin(auth.uid()) OR 
    supplier_id = (
      SELECT supplier_id 
      FROM public.profiles 
      WHERE id = auth.uid()
      LIMIT 1
    )
  )
);