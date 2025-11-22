-- Garantir que existam as colunas airline_program e cost_per_thousand
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS airline_program TEXT,
  ADD COLUMN IF NOT EXISTS cost_per_thousand NUMERIC(18,2);