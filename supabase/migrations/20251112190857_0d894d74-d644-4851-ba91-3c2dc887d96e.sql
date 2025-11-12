-- Criar função RPC para atualizar contador de CPFs automaticamente
CREATE OR REPLACE FUNCTION public.update_account_cpf_count(p_account_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Atualizar o cpf_count da conta baseado no número de CPFs únicos utilizados
  UPDATE mileage_accounts
  SET 
    cpf_count = (
      SELECT COUNT(DISTINCT cr.cpf_encrypted)
      FROM cpf_registry cr
      WHERE cr.airline_company_id = p_account_id
        AND cr.status IN ('available', 'blocked')
    ),
    updated_at = now()
  WHERE id = p_account_id;
END;
$$;