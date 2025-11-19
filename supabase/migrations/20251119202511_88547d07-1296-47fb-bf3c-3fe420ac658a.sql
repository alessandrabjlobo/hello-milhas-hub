/*
MIGRATION: Correção da FK quotes.converted_to_sale_id

PROBLEMA: Erro 409 ao excluir vendas porque quotes.converted_to_sale_id 
          referencia sales(id) com NO ACTION (padrão)

SOLUÇÃO: Alterar para ON DELETE SET NULL para preservar orçamentos no histórico
*/

-- Remover constraint antiga
ALTER TABLE public.quotes 
DROP CONSTRAINT IF EXISTS quotes_converted_to_sale_id_fkey;

-- Recriar com ON DELETE SET NULL
ALTER TABLE public.quotes
ADD CONSTRAINT quotes_converted_to_sale_id_fkey
  FOREIGN KEY (converted_to_sale_id)
  REFERENCES public.sales(id)
  ON DELETE SET NULL;

COMMENT ON CONSTRAINT quotes_converted_to_sale_id_fkey ON public.quotes IS 
'FK para sales com ON DELETE SET NULL - preserva orçamento quando venda é excluída';