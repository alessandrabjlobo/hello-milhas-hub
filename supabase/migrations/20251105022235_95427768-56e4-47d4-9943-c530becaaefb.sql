-- Update tickets table with verification_status
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_status') THEN
    CREATE TYPE verification_status AS ENUM ('pending', 'requested', 'received', 'completed');
  END IF;
END $$;

ALTER TABLE public.tickets
ADD COLUMN IF NOT EXISTS verification_status verification_status DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS pnr text,
ADD COLUMN IF NOT EXISTS ticket_number text;

-- Update sales table structure
ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS customer_name text,
ADD COLUMN IF NOT EXISTS customer_phone text,
ADD COLUMN IF NOT EXISTS customer_cpf text,
ADD COLUMN IF NOT EXISTS route_text text,
ADD COLUMN IF NOT EXISTS travel_dates jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS passengers integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS miles_needed numeric,
ADD COLUMN IF NOT EXISTS boarding_fee numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS price_total numeric,
ADD COLUMN IF NOT EXISTS price_per_passenger numeric,
ADD COLUMN IF NOT EXISTS profit_estimate numeric,
ADD COLUMN IF NOT EXISTS mileage_account_id uuid REFERENCES public.mileage_accounts(id),
ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.suppliers(id);

-- Backfill supplier_id from user's profile if null
UPDATE public.sales s
SET supplier_id = (SELECT supplier_id FROM public.profiles WHERE id = s.user_id)
WHERE supplier_id IS NULL;