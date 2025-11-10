-- Fase 1: Adicionar suporte a Débito e Crédito com taxas customizadas

-- Adicionar coluna payment_type
ALTER TABLE credit_interest_config 
  ADD COLUMN payment_type TEXT NOT NULL DEFAULT 'credit' 
  CHECK (payment_type IN ('credit', 'debit'));

-- Adicionar constraint: débito só pode ter 1 parcela
ALTER TABLE credit_interest_config
  ADD CONSTRAINT debit_single_installment 
  CHECK (
    (payment_type = 'debit' AND installments = 1) OR 
    payment_type = 'credit'
  );

-- Adicionar índice para melhor performance
CREATE INDEX idx_payment_interest_type 
  ON credit_interest_config(supplier_id, payment_type, is_active);