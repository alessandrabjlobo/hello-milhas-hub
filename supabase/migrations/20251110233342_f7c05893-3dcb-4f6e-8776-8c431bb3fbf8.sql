-- FASE 1 & 2: Adicionar first_use_date e modificar trigger para usar program_rules

-- Adicionar coluna first_use_date na tabela cpf_registry
ALTER TABLE cpf_registry 
ADD COLUMN IF NOT EXISTS first_use_date TIMESTAMP WITH TIME ZONE;

-- Para CPFs já existentes, usar last_used_at como first_use_date
UPDATE cpf_registry 
SET first_use_date = last_used_at 
WHERE first_use_date IS NULL AND last_used_at IS NOT NULL;

-- FASE 1: Substituir função increment_account_cpf_count para usar program_rules
CREATE OR REPLACE FUNCTION public.increment_account_cpf_count()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_airline_company_id UUID;
  v_supplier_id UUID;
  v_cpf_limit INTEGER;
  v_renewal_type TEXT;
  v_blocked_until TIMESTAMP WITH TIME ZONE;
  v_first_use_date TIMESTAMP WITH TIME ZONE;
BEGIN
  IF NEW.mileage_account_id IS NOT NULL AND NEW.cpf_used_id IS NOT NULL THEN
    
    -- 1. Buscar airline_company_id e supplier_id da conta
    SELECT airline_company_id, supplier_id 
    INTO v_airline_company_id, v_supplier_id
    FROM mileage_accounts
    WHERE id = NEW.mileage_account_id;
    
    -- 2. Buscar regra do programa (ou usar padrão da conta)
    SELECT cpf_limit, renewal_type 
    INTO v_cpf_limit, v_renewal_type
    FROM program_rules
    WHERE airline_id = v_airline_company_id
      AND supplier_id = v_supplier_id
    LIMIT 1;
    
    -- Se não encontrou regra em program_rules, usar padrão da conta
    IF v_cpf_limit IS NULL THEN
      SELECT cpf_limit INTO v_cpf_limit
      FROM mileage_accounts
      WHERE id = NEW.mileage_account_id;
      v_renewal_type := 'annual'; -- padrão
    END IF;
    
    -- 3. Incrementar contador da conta
    UPDATE mileage_accounts
    SET cpf_count = cpf_count + 1, updated_at = now()
    WHERE id = NEW.mileage_account_id;
    
    -- 4. Buscar first_use_date do CPF (se já foi usado antes)
    SELECT first_use_date INTO v_first_use_date
    FROM cpf_registry
    WHERE id = NEW.cpf_used_id;
    
    -- Se é o primeiro uso, definir first_use_date
    IF v_first_use_date IS NULL THEN
      v_first_use_date := NEW.created_at;
    END IF;
    
    -- 5. Calcular blocked_until com base no renewal_type
    IF v_renewal_type = 'rolling' THEN
      -- Rolling: 1 ano a partir do PRIMEIRO uso
      v_blocked_until := v_first_use_date + INTERVAL '1 year';
    ELSE
      -- Annual: até 1º de janeiro do próximo ano
      v_blocked_until := DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year';
    END IF;
    
    -- 6. Atualizar CPF no registro
    UPDATE cpf_registry
    SET 
      usage_count = usage_count + 1,
      last_used_at = NEW.created_at,
      first_use_date = COALESCE(first_use_date, NEW.created_at),
      status = CASE 
        WHEN usage_count + 1 >= v_cpf_limit THEN 'blocked'::cpf_status
        ELSE 'available'::cpf_status
      END,
      blocked_until = CASE
        WHEN usage_count + 1 >= v_cpf_limit THEN v_blocked_until
        ELSE blocked_until
      END,
      updated_at = now()
    WHERE id = NEW.cpf_used_id;
    
  END IF;
  
  RETURN NEW;
END;
$function$;

-- FASE 3: Criar view que calcula status em tempo real (desbloqueia automaticamente)
CREATE OR REPLACE VIEW cpf_registry_with_status AS
SELECT 
  cr.*,
  CASE 
    WHEN cr.status = 'blocked' 
      AND cr.blocked_until IS NOT NULL 
      AND cr.blocked_until <= CURRENT_TIMESTAMP 
    THEN 'available'::cpf_status
    ELSE cr.status
  END AS computed_status,
  CASE
    WHEN cr.blocked_until IS NOT NULL 
      AND cr.blocked_until <= CURRENT_TIMESTAMP + INTERVAL '30 days'
      AND cr.blocked_until > CURRENT_TIMESTAMP
    THEN true
    ELSE false
  END AS renewal_near
FROM cpf_registry cr;