-- ============================================================
-- PROGRAM RULES & AIRLINE COMPANIES - COMPLETE RLS FIX
-- ============================================================

-- 1. Ensure program_rules table exists with correct structure
CREATE TABLE IF NOT EXISTS public.program_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL,
  airline_id UUID NOT NULL,
  cpf_limit INTEGER NOT NULL DEFAULT 25,
  renewal_type TEXT NOT NULL CHECK (renewal_type IN ('annual', 'rolling')),
  updated_by UUID NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (supplier_id, airline_id)
);

-- 2. Enable RLS on program_rules
ALTER TABLE public.program_rules ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "program_rules_select_own_supplier" ON public.program_rules;
DROP POLICY IF EXISTS "program_rules_insert_own_supplier" ON public.program_rules;
DROP POLICY IF EXISTS "program_rules_update_own_supplier" ON public.program_rules;
DROP POLICY IF EXISTS "program_rules_delete_own_supplier" ON public.program_rules;

-- 4. Create RLS policies for program_rules
CREATE POLICY "program_rules_select_own_supplier" ON public.program_rules
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.supplier_id = program_rules.supplier_id
  )
);

CREATE POLICY "program_rules_insert_own_supplier" ON public.program_rules
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.supplier_id = program_rules.supplier_id
  )
);

CREATE POLICY "program_rules_update_own_supplier" ON public.program_rules
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.supplier_id = program_rules.supplier_id
  )
);

CREATE POLICY "program_rules_delete_own_supplier" ON public.program_rules
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.supplier_id = program_rules.supplier_id
  )
);

-- 5. Ensure airline_companies has proper RLS
ALTER TABLE public.airline_companies ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can view airline companies" ON public.airline_companies;
DROP POLICY IF EXISTS "Only admins can create airline companies" ON public.airline_companies;
DROP POLICY IF EXISTS "Only admins can update airline companies" ON public.airline_companies;
DROP POLICY IF EXISTS "Only admins can delete airline companies" ON public.airline_companies;

-- Create new policies
CREATE POLICY "Authenticated users can view airline companies" ON public.airline_companies
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only admins can create airline companies" ON public.airline_companies
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update airline companies" ON public.airline_companies
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete airline companies" ON public.airline_companies
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 6. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.program_rules TO authenticated;
GRANT SELECT ON public.airline_companies TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.airline_companies TO authenticated;

-- 7. Create updated_at trigger for program_rules
CREATE OR REPLACE FUNCTION public.update_program_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_program_rules_updated_at ON public.program_rules;
CREATE TRIGGER update_program_rules_updated_at
  BEFORE UPDATE ON public.program_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_program_rules_updated_at();