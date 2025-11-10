-- Permitir NULL nas colunas de custo por milha para vendas de balcão
ALTER TABLE public.sales
ALTER COLUMN cost_per_mile DROP NOT NULL;

ALTER TABLE public.sales
ALTER COLUMN cost_per_mile_snapshot DROP NOT NULL;

-- Adicionar comentários explicativos
COMMENT ON COLUMN public.sales.cost_per_mile IS 'Custo por milha no momento da venda (NULL para vendas de balcão)';
COMMENT ON COLUMN public.sales.cost_per_mile_snapshot IS 'Snapshot do custo por milha da conta (NULL para vendas de balcão)';