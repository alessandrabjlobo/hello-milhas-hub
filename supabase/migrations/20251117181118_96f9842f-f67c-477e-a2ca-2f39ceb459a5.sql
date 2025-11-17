-- Adicionar coluna cost_per_mile à tabela quotes
ALTER TABLE public.quotes 
ADD COLUMN IF NOT EXISTS cost_per_mile NUMERIC(10,2);

-- Comentário para documentação
COMMENT ON COLUMN public.quotes.cost_per_mile IS 'Valor do milheiro (custo por mil milhas) utilizado no cálculo do orçamento. Este valor é fixo e não deve ser recalculado ao editar o orçamento.';

-- Criar índice para melhorar performance em consultas que filtram por cost_per_mile
CREATE INDEX IF NOT EXISTS idx_quotes_cost_per_mile 
  ON public.quotes(cost_per_mile) 
  WHERE cost_per_mile IS NOT NULL;