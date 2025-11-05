-- Update RLS policies with soft-lock for critical tables

-- Sales policies with soft-lock
DROP POLICY IF EXISTS "Users can create their own sales" ON public.sales;
CREATE POLICY "Users can create sales for their supplier"
ON public.sales FOR INSERT
WITH CHECK (
  NOT public.is_locked(auth.uid()) AND (
    public.is_admin(auth.uid()) OR
    supplier_id = public.get_user_supplier_id(auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can update their own sales" ON public.sales;
CREATE POLICY "Users can update sales for their supplier"
ON public.sales FOR UPDATE
USING (
  NOT public.is_locked(auth.uid()) AND (
    public.is_admin(auth.uid()) OR
    supplier_id = public.get_user_supplier_id(auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can view their own sales" ON public.sales;
CREATE POLICY "Users can view sales for their supplier"
ON public.sales FOR SELECT
USING (
  public.is_admin(auth.uid()) OR
  supplier_id = public.get_user_supplier_id(auth.uid())
);

DROP POLICY IF EXISTS "Users can delete their own sales" ON public.sales;
CREATE POLICY "Users can delete sales for their supplier"
ON public.sales FOR DELETE
USING (
  NOT public.is_locked(auth.uid()) AND (
    public.is_admin(auth.uid()) OR
    supplier_id = public.get_user_supplier_id(auth.uid())
  )
);

-- Tickets policies with soft-lock
DROP POLICY IF EXISTS "Users can create tickets for their own sales" ON public.tickets;
CREATE POLICY "Users can create tickets for their supplier sales"
ON public.tickets FOR INSERT
WITH CHECK (
  NOT public.is_locked(auth.uid()) AND (
    public.is_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.sales s
      WHERE s.id = tickets.sale_id
      AND s.supplier_id = public.get_user_supplier_id(auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Users can update tickets from their own sales" ON public.tickets;
CREATE POLICY "Users can update tickets for their supplier sales"
ON public.tickets FOR UPDATE
USING (
  NOT public.is_locked(auth.uid()) AND (
    public.is_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.sales s
      WHERE s.id = tickets.sale_id
      AND s.supplier_id = public.get_user_supplier_id(auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Users can view tickets from their own sales" ON public.tickets;
CREATE POLICY "Users can view tickets for their supplier sales"
ON public.tickets FOR SELECT
USING (
  public.is_admin(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.sales s
    WHERE s.id = tickets.sale_id
    AND s.supplier_id = public.get_user_supplier_id(auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can delete tickets from their own sales" ON public.tickets;
CREATE POLICY "Users can delete tickets for their supplier sales"
ON public.tickets FOR DELETE
USING (
  NOT public.is_locked(auth.uid()) AND (
    public.is_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.sales s
      WHERE s.id = tickets.sale_id
      AND s.supplier_id = public.get_user_supplier_id(auth.uid())
    )
  )
);