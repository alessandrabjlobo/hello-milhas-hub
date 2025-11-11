-- Adicionar campos para configuração personalizada de juros por parcela
ALTER TABLE credit_interest_config 
ADD COLUMN config_type TEXT DEFAULT 'total' CHECK (config_type IN ('total', 'per_installment')),
ADD COLUMN per_installment_rates JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN credit_interest_config.config_type IS 'Tipo de configuração: total (taxa única) ou per_installment (taxa por parcela)';
COMMENT ON COLUMN credit_interest_config.per_installment_rates IS 'Taxas personalizadas por número de parcelas (ex: {"6": 3.5, "12": 6.75})';