-- Fase 1: Criar tabela de transações de pagamento
CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  payment_method TEXT NOT NULL,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS policies para payment_transactions
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their supplier's payment transactions"
  ON payment_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sales s
      WHERE s.id = payment_transactions.sale_id
      AND s.supplier_id = get_user_supplier_id(auth.uid())
    )
  );

CREATE POLICY "Users can create payment transactions for their supplier's sales"
  ON payment_transactions FOR INSERT
  WITH CHECK (
    NOT is_locked(auth.uid()) AND
    EXISTS (
      SELECT 1 FROM sales s
      WHERE s.id = payment_transactions.sale_id
      AND s.supplier_id = get_user_supplier_id(auth.uid())
    )
  );

CREATE INDEX idx_payment_transactions_sale_id ON payment_transactions(sale_id);
CREATE INDEX idx_payment_transactions_payment_date ON payment_transactions(payment_date DESC);

-- Fase 4: Criar tabela de configuração de formas de pagamento
CREATE TABLE payment_methods_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  method_name TEXT NOT NULL,
  method_type TEXT NOT NULL,
  description TEXT,
  additional_info JSONB DEFAULT '{}'::jsonb,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(supplier_id, method_name)
);

-- RLS policies para payment_methods_config
ALTER TABLE payment_methods_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their supplier's payment methods"
  ON payment_methods_config FOR ALL
  USING (supplier_id = get_user_supplier_id(auth.uid()))
  WITH CHECK (supplier_id = get_user_supplier_id(auth.uid()));

CREATE INDEX idx_payment_methods_supplier ON payment_methods_config(supplier_id, is_active);

-- Fase 6: Modificar tabela quotes
ALTER TABLE quotes
  ADD COLUMN attachments JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN converted_to_sale_id UUID REFERENCES sales(id),
  ADD COLUMN converted_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX idx_quotes_not_converted ON quotes(user_id, converted_to_sale_id) 
  WHERE converted_to_sale_id IS NULL;