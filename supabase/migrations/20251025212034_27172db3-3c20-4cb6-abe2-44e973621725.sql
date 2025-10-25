-- FASE 2: Melhorias na tabela quotes
-- Remover campos antigos e adicionar novos
ALTER TABLE public.quotes
  DROP COLUMN IF EXISTS valid_until,
  DROP COLUMN IF EXISTS cost_per_thousand;

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS flight_details JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS payment_methods TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Comentário explicativo da estrutura flight_details:
COMMENT ON COLUMN public.quotes.flight_details IS 'Estrutura JSON: {
  "departure_time": "08:00",
  "arrival_time": "14:30", 
  "duration": "6h 30m",
  "stops": 1,
  "stop_cities": ["Miami"]
}';