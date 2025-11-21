-- Adicionar campos adicionais à tabela agency_settings para dados completos da agência
ALTER TABLE public.agency_settings
ADD COLUMN IF NOT EXISTS cnpj_cpf TEXT,
ADD COLUMN IF NOT EXISTS responsible_name TEXT,
ADD COLUMN IF NOT EXISTS billing_email TEXT,
ADD COLUMN IF NOT EXISTS street TEXT,
ADD COLUMN IF NOT EXISTS number TEXT,
ADD COLUMN IF NOT EXISTS complement TEXT,
ADD COLUMN IF NOT EXISTS neighborhood TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS zip_code TEXT;

COMMENT ON COLUMN public.agency_settings.cnpj_cpf IS 'CNPJ ou CPF da agência';
COMMENT ON COLUMN public.agency_settings.responsible_name IS 'Nome do responsável pela agência';
COMMENT ON COLUMN public.agency_settings.billing_email IS 'Email para faturamento e contabilidade';
COMMENT ON COLUMN public.agency_settings.street IS 'Rua/Avenida do endereço';
COMMENT ON COLUMN public.agency_settings.number IS 'Número do endereço';
COMMENT ON COLUMN public.agency_settings.complement IS 'Complemento do endereço';
COMMENT ON COLUMN public.agency_settings.neighborhood IS 'Bairro';
COMMENT ON COLUMN public.agency_settings.city IS 'Cidade';
COMMENT ON COLUMN public.agency_settings.state IS 'Estado (UF)';
COMMENT ON COLUMN public.agency_settings.zip_code IS 'CEP';