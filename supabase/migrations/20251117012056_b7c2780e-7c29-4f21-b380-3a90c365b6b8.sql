-- Adicionar campo notes à tabela quotes
ALTER TABLE public.quotes 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Comentário para documentação
COMMENT ON COLUMN public.quotes.notes IS 'Observações e anotações do orçamento';