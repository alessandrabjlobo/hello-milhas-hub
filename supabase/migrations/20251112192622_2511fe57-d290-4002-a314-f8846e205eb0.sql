-- Função RPC para verificar existência de CPF respeitando RLS
CREATE OR REPLACE FUNCTION public.check_cpf_exists(
  p_airline_company_id UUID,
  p_cpf_encrypted TEXT
) 
RETURNS TABLE (
  id UUID,
  usage_count INTEGER,
  last_used_at TIMESTAMPTZ,
  first_use_date TIMESTAMPTZ,
  status cpf_status,
  blocked_until TIMESTAMPTZ
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cr.id, 
    cr.usage_count, 
    cr.last_used_at,
    cr.first_use_date,
    cr.status,
    cr.blocked_until
  FROM cpf_registry cr
  INNER JOIN mileage_accounts ma ON ma.id = cr.airline_company_id
  WHERE cr.airline_company_id = p_airline_company_id
    AND cr.cpf_encrypted = p_cpf_encrypted
    AND (
      public.is_admin(auth.uid()) 
      OR ma.supplier_id = public.get_user_supplier_id(auth.uid())
    )
  LIMIT 1;
END;
$$;