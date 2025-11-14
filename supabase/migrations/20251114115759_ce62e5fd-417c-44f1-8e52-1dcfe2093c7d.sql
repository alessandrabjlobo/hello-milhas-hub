-- PHASE 1 Migration: Create sale_segments table and update sales table structure
-- This migration is idempotent

-- Step 1: Create sale_segments table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.sale_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL,
  direction text NOT NULL CHECK (direction IN ('oneway', 'roundtrip', 'multicity')),
  from_code text NOT NULL,
  to_code text NOT NULL,
  date timestamptz,
  flight_number text,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT fk_sale
    FOREIGN KEY (sale_id) 
    REFERENCES public.sales(id)
    ON DELETE CASCADE
);

-- Step 2: Add channel column to sales if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'sales' 
    AND column_name = 'channel'
  ) THEN
    ALTER TABLE public.sales ADD COLUMN channel text CHECK (channel IN ('internal', 'balcao'));
    -- Migrate existing data: map sale_source to channel
    UPDATE public.sales SET channel = 
      CASE 
        WHEN sale_source = 'internal_account' THEN 'internal'
        WHEN sale_source = 'mileage_counter' THEN 'balcao'
        ELSE 'internal'
      END
    WHERE channel IS NULL;
    ALTER TABLE public.sales ALTER COLUMN channel SET NOT NULL;
  END IF;
END $$;

-- Step 3: Add program_id column if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'sales' 
    AND column_name = 'program_id'
  ) THEN
    ALTER TABLE public.sales ADD COLUMN program_id uuid REFERENCES public.airline_companies(id);
  END IF;
END $$;

-- Step 4: Add seller_name and seller_contact if not exist (they already exist as counter_seller_name)
-- Just ensure they are properly named
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'sales' 
    AND column_name = 'seller_name'
  ) THEN
    ALTER TABLE public.sales ADD COLUMN seller_name text;
    -- Migrate from counter_seller_name
    UPDATE public.sales SET seller_name = counter_seller_name WHERE counter_seller_name IS NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'sales' 
    AND column_name = 'seller_contact'
  ) THEN
    ALTER TABLE public.sales ADD COLUMN seller_contact text;
    -- Migrate from counter_seller_contact
    UPDATE public.sales SET seller_contact = counter_seller_contact WHERE counter_seller_contact IS NOT NULL;
  END IF;
END $$;

-- Step 5: Add created_by column if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'sales' 
    AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.sales ADD COLUMN created_by uuid REFERENCES auth.users(id);
    -- Populate with user_id for existing records
    UPDATE public.sales SET created_by = user_id WHERE created_by IS NULL;
  END IF;
END $$;

-- Step 6: Add total_amount column if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'sales' 
    AND column_name = 'total_amount'
  ) THEN
    ALTER TABLE public.sales ADD COLUMN total_amount numeric;
    -- Populate with sale_price for existing records
    UPDATE public.sales SET total_amount = sale_price WHERE total_amount IS NULL;
  END IF;
END $$;

-- Step 7: Create updated_at trigger for sale_segments
CREATE OR REPLACE FUNCTION public.update_sale_segments_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sale_segments_updated_at ON public.sale_segments;
CREATE TRIGGER trigger_sale_segments_updated_at
  BEFORE UPDATE ON public.sale_segments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_sale_segments_updated_at();

-- Step 8: Enable RLS on sale_segments
ALTER TABLE public.sale_segments ENABLE ROW LEVEL SECURITY;

-- Step 9: Create RLS policies for sale_segments
DROP POLICY IF EXISTS "Users can view their supplier's sale segments" ON public.sale_segments;
CREATE POLICY "Users can view their supplier's sale segments"
  ON public.sale_segments FOR SELECT
  USING (
    is_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.sales s
      WHERE s.id = sale_segments.sale_id
        AND s.supplier_id = get_user_supplier_id(auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create sale segments for their supplier's sales" ON public.sale_segments;
CREATE POLICY "Users can create sale segments for their supplier's sales"
  ON public.sale_segments FOR INSERT
  WITH CHECK (
    NOT is_locked(auth.uid()) AND (
      is_admin(auth.uid()) OR EXISTS (
        SELECT 1 FROM public.sales s
        WHERE s.id = sale_segments.sale_id
          AND s.supplier_id = get_user_supplier_id(auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Users can update sale segments for their supplier's sales" ON public.sale_segments;
CREATE POLICY "Users can update sale segments for their supplier's sales"
  ON public.sale_segments FOR UPDATE
  USING (
    NOT is_locked(auth.uid()) AND (
      is_admin(auth.uid()) OR EXISTS (
        SELECT 1 FROM public.sales s
        WHERE s.id = sale_segments.sale_id
          AND s.supplier_id = get_user_supplier_id(auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Users can delete sale segments for their supplier's sales" ON public.sale_segments;
CREATE POLICY "Users can delete sale segments for their supplier's sales"
  ON public.sale_segments FOR DELETE
  USING (
    NOT is_locked(auth.uid()) AND (
      is_admin(auth.uid()) OR EXISTS (
        SELECT 1 FROM public.sales s
        WHERE s.id = sale_segments.sale_id
          AND s.supplier_id = get_user_supplier_id(auth.uid())
      )
    )
  );

-- Step 10: Create index on sale_segments for better query performance
CREATE INDEX IF NOT EXISTS idx_sale_segments_sale_id ON public.sale_segments(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_segments_position ON public.sale_segments(sale_id, position);