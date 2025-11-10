-- Add payment tracking fields to sales table
ALTER TABLE sales 
  ADD COLUMN IF NOT EXISTS payment_status text,
  ADD COLUMN IF NOT EXISTS paid_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS payment_notes text;

-- Create ENUM for payment_status
DO $$ BEGIN
  CREATE TYPE payment_status_enum AS ENUM ('pending', 'partial', 'paid', 'overdue', 'refunded');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Update existing null values to 'pending'
UPDATE sales SET payment_status = 'pending' WHERE payment_status IS NULL;

-- Alter payment_status to use ENUM and set default
ALTER TABLE sales 
  ALTER COLUMN payment_status TYPE payment_status_enum 
  USING payment_status::payment_status_enum,
  ALTER COLUMN payment_status SET DEFAULT 'pending'::payment_status_enum,
  ALTER COLUMN payment_status SET NOT NULL;