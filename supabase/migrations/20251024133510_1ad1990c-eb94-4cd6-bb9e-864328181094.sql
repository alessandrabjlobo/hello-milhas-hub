-- Adicionar nome da empresa na tabela de perfis
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_name text DEFAULT 'Minha Empresa';

-- Atualizar tabela de orçamentos para incluir novos campos
ALTER TABLE quotes 
  ADD COLUMN IF NOT EXISTS trip_type text DEFAULT 'round_trip',
  ADD COLUMN IF NOT EXISTS boarding_fee numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS passengers integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS company_name text;