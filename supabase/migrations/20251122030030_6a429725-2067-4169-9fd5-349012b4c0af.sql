-- Aumentar precisão de colunas monetárias para suportar valores grandes
ALTER TABLE public.sales 
  ALTER COLUMN total_cost TYPE numeric(12,2),
  ALTER COLUMN sale_price TYPE numeric(12,2),
  ALTER COLUMN profit TYPE numeric(12,2),
  ALTER COLUMN final_price_with_interest TYPE numeric(12,2),
  ALTER COLUMN counter_cost_per_thousand TYPE numeric(12,2),
  ALTER COLUMN price_total TYPE numeric(12,2),
  ALTER COLUMN margin_value TYPE numeric(12,2),
  ALTER COLUMN boarding_fee TYPE numeric(12,2),
  ALTER COLUMN paid_amount TYPE numeric(12,2),
  ALTER COLUMN total_amount TYPE numeric(12,2);

-- Adicionar 'bulk_import' como valor válido para sale_source
ALTER TABLE public.sales 
  DROP CONSTRAINT IF EXISTS sales_sale_source_check;

ALTER TABLE public.sales 
  ADD CONSTRAINT sales_sale_source_check 
  CHECK (sale_source = ANY (ARRAY[
    'internal_account'::text, 
    'mileage_counter'::text,
    'bulk_import'::text
  ]));

-- Atualizar função validate_sale_source para aceitar bulk_import
CREATE OR REPLACE FUNCTION public.validate_sale_source()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  -- Validar conta interna
  IF NEW.sale_source = 'internal_account' AND NEW.mileage_account_id IS NULL THEN
    RAISE EXCEPTION 'mileage_account_id é obrigatório para vendas de conta interna';
  END IF;
  
  -- Validar balcão
  IF NEW.sale_source = 'mileage_counter' THEN
    IF NEW.counter_seller_name IS NULL OR NEW.counter_airline_program IS NULL THEN
      RAISE EXCEPTION 'Informações do vendedor e programa são obrigatórias para vendas de balcão';
    END IF;
    
    IF NEW.counter_cost_per_thousand IS NULL OR NEW.counter_cost_per_thousand <= 0 THEN
      RAISE EXCEPTION 'Custo do milheiro é obrigatório para vendas de balcão';
    END IF;
  END IF;
  
  -- Importação em lote não exige mileage_account_id nem campos específicos
  IF NEW.sale_source = 'bulk_import' THEN
    -- Permitir mileage_account_id = null
    -- Não validar campos específicos de conta ou balcão
    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$function$;