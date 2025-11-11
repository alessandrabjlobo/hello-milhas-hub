-- Remover policies antigas de mileage_movements
DROP POLICY IF EXISTS "Users can create movements for their supplier's accounts" ON mileage_movements;
DROP POLICY IF EXISTS "Users can view movements for their supplier's accounts" ON mileage_movements;

-- Criar novas policies usando user_id ao invés de supplier_id
CREATE POLICY "Users can create movements for their own accounts"
  ON mileage_movements FOR INSERT
  TO authenticated
  WITH CHECK (
    NOT is_locked(auth.uid()) 
    AND (
      is_admin(auth.uid()) 
      OR EXISTS (
        SELECT 1 FROM mileage_accounts ma
        WHERE ma.id = mileage_movements.account_id
        AND ma.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can view movements for their own accounts"
  ON mileage_movements FOR SELECT
  TO authenticated
  USING (
    is_admin(auth.uid()) 
    OR EXISTS (
      SELECT 1 FROM mileage_accounts ma
      WHERE ma.id = mileage_movements.account_id
      AND ma.user_id = auth.uid()
    )
  );