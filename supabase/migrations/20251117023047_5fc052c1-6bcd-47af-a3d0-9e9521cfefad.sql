-- Adicionar coluna para nome/título do orçamento
ALTER TABLE public.quotes 
ADD COLUMN IF NOT EXISTS quote_title TEXT;

COMMENT ON COLUMN public.quotes.quote_title IS 'Nome/título personalizado do orçamento (ex: Viagem João - Miami Nov/2025)';