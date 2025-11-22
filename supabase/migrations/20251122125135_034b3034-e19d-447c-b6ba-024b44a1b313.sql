-- Adicionar colunas airline_program e locator_code na tabela sales (se não existirem)
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS airline_program TEXT,
  ADD COLUMN IF NOT EXISTS locator_code TEXT;