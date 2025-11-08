-- Create agency_program_settings table to store which programs an agency works with
CREATE TABLE IF NOT EXISTS public.agency_program_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE,
  airline_company_id UUID NOT NULL REFERENCES public.airline_companies(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  cpf_limit INTEGER NOT NULL DEFAULT 25,
  cpf_period TEXT NOT NULL DEFAULT 'month' CHECK (cpf_period IN ('month', 'day')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(supplier_id, airline_company_id)
);

-- Enable RLS
ALTER TABLE public.agency_program_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agency_program_settings
CREATE POLICY "Users can view their supplier's program settings"
ON public.agency_program_settings FOR SELECT
USING (
  is_admin(auth.uid()) OR 
  supplier_id = get_user_supplier_id(auth.uid())
);

CREATE POLICY "Users can create program settings for their supplier"
ON public.agency_program_settings FOR INSERT
WITH CHECK (
  NOT is_locked(auth.uid()) AND (
    is_admin(auth.uid()) OR 
    supplier_id = get_user_supplier_id(auth.uid())
  )
);

CREATE POLICY "Users can update their supplier's program settings"
ON public.agency_program_settings FOR UPDATE
USING (
  NOT is_locked(auth.uid()) AND (
    is_admin(auth.uid()) OR 
    supplier_id = get_user_supplier_id(auth.uid())
  )
);

CREATE POLICY "Users can delete their supplier's program settings"
ON public.agency_program_settings FOR DELETE
USING (
  NOT is_locked(auth.uid()) AND (
    is_admin(auth.uid()) OR 
    supplier_id = get_user_supplier_id(auth.uid())
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_agency_program_settings_updated_at
BEFORE UPDATE ON public.agency_program_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for performance
CREATE INDEX idx_agency_program_settings_supplier ON public.agency_program_settings(supplier_id);
CREATE INDEX idx_agency_program_settings_airline ON public.agency_program_settings(airline_company_id);
CREATE INDEX idx_agency_program_settings_active ON public.agency_program_settings(is_active) WHERE is_active = true;

-- Update sales table to store cost snapshot at sale time
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS cost_per_mile_snapshot NUMERIC;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS margin_value NUMERIC;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS margin_percentage NUMERIC;

-- Add payment_method to sales
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- Add indexes for reporting queries
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public.sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_supplier_created ON public.sales(supplier_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_status ON public.sales(status);

-- Add index for account balances
CREATE INDEX IF NOT EXISTS idx_mileage_accounts_supplier_status ON public.mileage_accounts(supplier_id, status) WHERE status = 'active';