-- Adicionar coluna para armazenar o custo do milheiro de fornecedor
ALTER TABLE public.sales
ADD COLUMN counter_cost_per_thousand NUMERIC(10, 2);

COMMENT ON COLUMN public.sales.counter_cost_per_thousand IS 'Custo de compra do milheiro do fornecedor (balcão de milhas) em R$';

-- Atualizar função de validação para incluir custo do milheiro
CREATE OR REPLACE FUNCTION public.validate_sale_source()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sale_source = 'internal_account' AND NEW.mileage_account_id IS NULL THEN
    RAISE EXCEPTION 'mileage_account_id é obrigatório para vendas de conta interna';
  END IF;
  
  IF NEW.sale_source = 'mileage_counter' THEN
    IF NEW.counter_seller_name IS NULL OR NEW.counter_airline_program IS NULL THEN
      RAISE EXCEPTION 'Informações do vendedor e programa são obrigatórias para vendas de balcão';
    END IF;
    
    IF NEW.counter_cost_per_thousand IS NULL OR NEW.counter_cost_per_thousand <= 0 THEN
      RAISE EXCEPTION 'Custo do milheiro é obrigatório para vendas de balcão';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = 'public';