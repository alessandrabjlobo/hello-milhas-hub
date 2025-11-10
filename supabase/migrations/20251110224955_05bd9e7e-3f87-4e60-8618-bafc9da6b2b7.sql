-- FASE 3: Criar tabela de clientes
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cpf_encrypted TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  total_purchases INTEGER DEFAULT 0,
  total_spent NUMERIC DEFAULT 0,
  last_purchase_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(supplier_id, cpf_encrypted)
);

CREATE INDEX IF NOT EXISTS idx_customers_supplier ON customers(supplier_id);
CREATE INDEX IF NOT EXISTS idx_customers_cpf ON customers(cpf_encrypted);

-- RLS Policies para customers
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their supplier's customers"
  ON customers
  FOR ALL
  USING (supplier_id = get_user_supplier_id(auth.uid()))
  WITH CHECK (supplier_id = get_user_supplier_id(auth.uid()));

-- Trigger para atualizar clientes automaticamente ao criar venda
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Só atualizar se tiver nome e CPF do cliente
  IF NEW.client_name IS NOT NULL AND NEW.client_cpf_encrypted IS NOT NULL AND NEW.supplier_id IS NOT NULL THEN
    INSERT INTO customers (supplier_id, name, cpf_encrypted, phone, total_purchases, total_spent, last_purchase_at)
    VALUES (
      NEW.supplier_id,
      NEW.client_name,
      NEW.client_cpf_encrypted,
      NEW.client_contact,
      1,
      NEW.sale_price,
      NEW.created_at
    )
    ON CONFLICT (supplier_id, cpf_encrypted) DO UPDATE SET
      total_purchases = customers.total_purchases + 1,
      total_spent = customers.total_spent + NEW.sale_price,
      last_purchase_at = NEW.created_at,
      phone = COALESCE(EXCLUDED.phone, customers.phone),
      name = EXCLUDED.name,
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_customer_stats
AFTER INSERT ON sales
FOR EACH ROW
EXECUTE FUNCTION update_customer_stats();

-- FASE 3: Adicionar colunas financeiras em suppliers
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS total_purchases INTEGER DEFAULT 0;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS total_cost NUMERIC DEFAULT 0;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS last_purchase_at TIMESTAMP WITH TIME ZONE;

-- FASE 1: Trigger para incrementar cpf_count ao criar venda
CREATE OR REPLACE FUNCTION increment_account_cpf_count()
RETURNS TRIGGER AS $$
DECLARE
  account_cpf_limit INTEGER;
BEGIN
  -- Se a venda usou uma conta interna e tem CPF de passageiro
  IF NEW.mileage_account_id IS NOT NULL AND NEW.cpf_used_id IS NOT NULL THEN
    -- Incrementar cpf_count da conta
    UPDATE mileage_accounts
    SET cpf_count = cpf_count + 1,
        updated_at = now()
    WHERE id = NEW.mileage_account_id;
    
    -- Buscar o limite de CPF da conta
    SELECT cpf_limit INTO account_cpf_limit
    FROM mileage_accounts
    WHERE id = NEW.mileage_account_id;
    
    -- Atualizar usage_count do CPF no registro
    UPDATE cpf_registry
    SET 
      usage_count = usage_count + 1,
      last_used_at = NEW.created_at,
      status = CASE 
        WHEN usage_count + 1 >= account_cpf_limit
        THEN 'blocked'::cpf_status
        ELSE 'available'::cpf_status
      END,
      blocked_until = CASE
        WHEN usage_count + 1 >= account_cpf_limit
        THEN NEW.created_at + INTERVAL '1 year'
        ELSE blocked_until
      END,
      updated_at = now()
    WHERE id = NEW.cpf_used_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_cpf_count
AFTER INSERT ON sales
FOR EACH ROW
EXECUTE FUNCTION increment_account_cpf_count();

-- Adicionar updated_at trigger para customers
CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON customers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();