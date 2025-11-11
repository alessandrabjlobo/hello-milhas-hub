-- Drop old RLS policies on mileage_accounts
DROP POLICY IF EXISTS "Users can create accounts for their supplier" ON mileage_accounts;
DROP POLICY IF EXISTS "Users can update their supplier's accounts" ON mileage_accounts;
DROP POLICY IF EXISTS "Users can view their supplier's accounts" ON mileage_accounts;
DROP POLICY IF EXISTS "Admins can view all accounts" ON mileage_accounts;
DROP POLICY IF EXISTS "Only admins can delete accounts" ON mileage_accounts;

-- Create new RLS policies using user_id for tenant isolation
CREATE POLICY "Users can create their own accounts"
  ON mileage_accounts FOR INSERT
  TO authenticated
  WITH CHECK (NOT is_locked(auth.uid()) AND user_id = auth.uid());

CREATE POLICY "Users can update their own accounts"
  ON mileage_accounts FOR UPDATE
  TO authenticated
  USING (NOT is_locked(auth.uid()) AND user_id = auth.uid());

CREATE POLICY "Users can view their own accounts"
  ON mileage_accounts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own accounts"
  ON mileage_accounts FOR DELETE
  TO authenticated
  USING (NOT is_locked(auth.uid()) AND user_id = auth.uid());

-- Admins can view all accounts
CREATE POLICY "Admins can view all accounts"
  ON mileage_accounts FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add Foreign Key constraint to ensure data integrity
-- This will link mileage_accounts.supplier_id to suppliers.id
ALTER TABLE mileage_accounts
  ADD CONSTRAINT fk_mileage_accounts_supplier
  FOREIGN KEY (supplier_id)
  REFERENCES suppliers(id)
  ON DELETE RESTRICT;