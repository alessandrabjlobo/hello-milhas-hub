-- Migration 7: Update RLS Policies for Multi-Tenant Security

-- Update suppliers RLS
DROP POLICY IF EXISTS "Users can view their own companies" ON public.suppliers;
DROP POLICY IF EXISTS "Users can create their own suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Users can update their own suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Users can delete their own suppliers" ON public.suppliers;

CREATE POLICY "Admins can view all suppliers"
ON public.suppliers
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own supplier"
ON public.suppliers
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.supplier_id = suppliers.id
  )
);

CREATE POLICY "Only admins can create suppliers"
ON public.suppliers
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update suppliers"
ON public.suppliers
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete suppliers"
ON public.suppliers
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Update airline_companies RLS (readable by all authenticated, writable by admin)
DROP POLICY IF EXISTS "Users can view their own companies" ON public.airline_companies;
DROP POLICY IF EXISTS "Users can create their own companies" ON public.airline_companies;
DROP POLICY IF EXISTS "Users can update their own companies" ON public.airline_companies;
DROP POLICY IF EXISTS "Users can delete their own companies" ON public.airline_companies;

CREATE POLICY "Authenticated users can view airline companies"
ON public.airline_companies
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only admins can create airline companies"
ON public.airline_companies
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update airline companies"
ON public.airline_companies
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete airline companies"
ON public.airline_companies
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Update mileage_accounts RLS for supplier scoping
DROP POLICY IF EXISTS "Users can view their own accounts" ON public.mileage_accounts;
DROP POLICY IF EXISTS "Users can create their own accounts" ON public.mileage_accounts;
DROP POLICY IF EXISTS "Users can update their own accounts" ON public.mileage_accounts;
DROP POLICY IF EXISTS "Users can delete their own accounts" ON public.mileage_accounts;

CREATE POLICY "Admins can view all accounts"
ON public.mileage_accounts
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their supplier's accounts"
ON public.mileage_accounts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.supplier_id = mileage_accounts.supplier_id
  )
);

CREATE POLICY "Users can create accounts for their supplier"
ON public.mileage_accounts
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.supplier_id = mileage_accounts.supplier_id
  )
);

CREATE POLICY "Users can update their supplier's accounts"
ON public.mileage_accounts
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin') OR
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.supplier_id = mileage_accounts.supplier_id
  )
);

CREATE POLICY "Only admins can delete accounts"
ON public.mileage_accounts
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));