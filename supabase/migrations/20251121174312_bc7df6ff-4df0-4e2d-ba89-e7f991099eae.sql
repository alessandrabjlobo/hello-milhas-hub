-- MIGRATION: Adicionar client_id em sales e campos de segmentação em customers
-- FASE 1: Relacionamento vendas-clientes e segmentação

-- 1.1. Adicionar coluna client_id para relacionar vendas com clientes
ALTER TABLE public.sales
ADD COLUMN client_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;

-- Criar índice para melhorar performance
CREATE INDEX idx_sales_client_id ON public.sales(client_id);

-- Atualizar vendas existentes tentando relacionar com clientes pelo CPF
UPDATE public.sales s
SET client_id = c.id
FROM public.customers c
WHERE s.client_cpf_encrypted = c.cpf_encrypted
  AND s.supplier_id = c.supplier_id
  AND s.client_id IS NULL;

COMMENT ON COLUMN public.sales.client_id IS 'FK para customers - rastreia histórico de vendas por cliente';

-- 1.2. Adicionar campos de segmentação e informações adicionais em customers
ALTER TABLE public.customers
ADD COLUMN tags JSONB DEFAULT '[]'::jsonb,
ADD COLUMN city TEXT,
ADD COLUMN state TEXT,
ADD COLUMN country TEXT DEFAULT 'Brasil',
ADD COLUMN notes TEXT;

-- Criar índice GIN para busca em tags
CREATE INDEX idx_customers_tags ON public.customers USING GIN (tags);

COMMENT ON COLUMN public.customers.tags IS 'Tags para segmentação (VIP, recorrente, alto gasto, etc.)';
COMMENT ON COLUMN public.customers.notes IS 'Observações sobre o cliente';

-- 1.3. Melhorar trigger de atualização de clientes
CREATE OR REPLACE FUNCTION public.update_customer_stats()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_client_id UUID;
  v_sale_value NUMERIC;
BEGIN
  -- Só atualizar se tiver nome e CPF do cliente
  IF NEW.client_name IS NOT NULL AND NEW.client_cpf_encrypted IS NOT NULL AND NEW.supplier_id IS NOT NULL THEN
    
    -- Calcular valor da venda (com juros se disponível, senão usa price_total ou sale_price)
    v_sale_value := COALESCE(NEW.final_price_with_interest, NEW.price_total, NEW.sale_price, 0);
    
    -- Buscar ou criar cliente
    SELECT id INTO v_client_id
    FROM customers
    WHERE supplier_id = NEW.supplier_id
      AND cpf_encrypted = NEW.client_cpf_encrypted;
    
    IF v_client_id IS NULL THEN
      -- Criar novo cliente
      INSERT INTO customers (
        supplier_id, 
        name, 
        cpf_encrypted, 
        phone,
        email,
        total_purchases, 
        total_spent, 
        last_purchase_at
      )
      VALUES (
        NEW.supplier_id,
        NEW.client_name,
        NEW.client_cpf_encrypted,
        NEW.client_contact,
        NULL,
        1,
        v_sale_value,
        NEW.created_at
      )
      RETURNING id INTO v_client_id;
    ELSE
      -- Atualizar cliente existente
      UPDATE customers SET
        total_purchases = total_purchases + 1,
        total_spent = total_spent + v_sale_value,
        last_purchase_at = NEW.created_at,
        phone = COALESCE(NEW.client_contact, phone),
        name = NEW.client_name,
        updated_at = now()
      WHERE id = v_client_id;
    END IF;
    
    -- Atualizar client_id na venda
    NEW.client_id = v_client_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recriar trigger (garante execução BEFORE INSERT)
DROP TRIGGER IF EXISTS update_customer_stats_trigger ON sales;
CREATE TRIGGER update_customer_stats_trigger
  BEFORE INSERT ON sales
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_stats();

COMMENT ON FUNCTION update_customer_stats() IS 
'Atualiza estatísticas do cliente e cria relacionamento com venda via client_id. Usa final_price_with_interest quando disponível para cálculo correto do valor total gasto.';