-- Drop incorrect SELECT policy
DROP POLICY IF EXISTS "suppliers_select_own" ON public.suppliers;

-- CREATE correct RLS policies for suppliers table

-- SELECT: Users can view suppliers they created
CREATE POLICY "Users can view their own suppliers"
ON public.suppliers
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- INSERT: Users can create suppliers with their own user_id
CREATE POLICY "Users can create their own suppliers"
ON public.suppliers
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- UPDATE: Users can update suppliers they created
CREATE POLICY "Users can update their own suppliers"
ON public.suppliers
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- DELETE: Users can delete suppliers they created
CREATE POLICY "Users can delete their own suppliers"
ON public.suppliers
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Admins can manage all suppliers
CREATE POLICY "Admins can manage all suppliers"
ON public.suppliers
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));