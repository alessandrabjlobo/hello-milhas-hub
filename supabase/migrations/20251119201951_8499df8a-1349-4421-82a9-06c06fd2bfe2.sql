/*
==============================================================================
MIGRATION: Correção da função update_account_cpf_count
==============================================================================

PROBLEMA IDENTIFICADO:
A função estava comparando diretamente p_account_id (ID da conta de milhagem)
com cpf_registry.airline_company_id (ID da companhia aérea), causando 0 CPFs
sempre, pois são tabelas diferentes.

SOLUÇÃO:
1. Buscar o airline_company_id da conta em mileage_accounts
2. Usar esse airline_company_id para contar CPFs distintos em cpf_registry
3. Atualizar o cpf_count na conta

VERIFICAÇÃO DE FOREIGN KEYS:
✅ tickets.sale_id → sales(id) ON DELETE CASCADE (já configurado)
✅ payment_transactions.sale_id → sales(id) ON DELETE CASCADE (já configurado)  
✅ sale_segments.sale_id → sales(id) ON DELETE CASCADE (já configurado)

Nenhuma alteração necessária nas FKs - todas já possuem ON DELETE CASCADE.

SCRIPT DE TESTE (executar após a migration):
---------------------------------------------------------------------------
-- 1. Criar uma conta de teste (copie o ID gerado)
INSERT INTO mileage_accounts (
  user_id, 
  airline_company_id, 
  account_number, 
  balance, 
  cost_per_mile, 
  supplier_id
) 
SELECT 
  auth.uid(),
  (SELECT id FROM airline_companies LIMIT 1),
  'TEST-12345',
  100000,
  0.029,
  (SELECT supplier_id FROM profiles WHERE id = auth.uid())
RETURNING id;
-- Copie o ID retornado, exemplo: 'abc-123-def-456'

-- 2. Inserir alguns CPFs de teste para essa conta
-- Substitua 'abc-123-def-456' pelo ID da conta
-- Substitua o airline_company_id pelo da sua conta
INSERT INTO cpf_registry (
  user_id,
  airline_company_id,  -- ID da companhia aérea (não da conta!)
  full_name,
  cpf_encrypted,
  status
) VALUES
  (auth.uid(), (SELECT airline_company_id FROM mileage_accounts WHERE id = 'abc-123-def-456'), 'PASSAGEIRO 1', 'CPF_ENC_001', 'available'),
  (auth.uid(), (SELECT airline_company_id FROM mileage_accounts WHERE id = 'abc-123-def-456'), 'PASSAGEIRO 2', 'CPF_ENC_002', 'available'),
  (auth.uid(), (SELECT airline_company_id FROM mileage_accounts WHERE id = 'abc-123-def-456'), 'PASSAGEIRO 3', 'CPF_ENC_003', 'blocked');

-- 3. Chamar a função corrigida
SELECT update_account_cpf_count('abc-123-def-456');

-- 4. Verificar se cpf_count foi atualizado para 3
SELECT 
  account_number,
  cpf_count,  -- Deve mostrar 3
  cpf_limit
FROM mileage_accounts 
WHERE id = 'abc-123-def-456';

-- 5. Limpar dados de teste
DELETE FROM cpf_registry WHERE user_id = auth.uid() AND full_name LIKE 'PASSAGEIRO%';
DELETE FROM mileage_accounts WHERE account_number = 'TEST-12345';
---------------------------------------------------------------------------

==============================================================================
*/

-- Recriar a função com a lógica corrigida
CREATE OR REPLACE FUNCTION public.update_account_cpf_count(p_account_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_airline_company_id UUID;
  v_cpf_count INTEGER;
BEGIN
  -- PASSO 1: Buscar o airline_company_id da conta de milhagem
  -- (mileage_accounts guarda qual companhia aérea é: GOL, LATAM, AZUL, etc.)
  SELECT airline_company_id 
  INTO v_airline_company_id
  FROM mileage_accounts
  WHERE id = p_account_id;
  
  -- PASSO 2: Se não encontrou a conta, não faz nada
  IF v_airline_company_id IS NULL THEN
    RAISE NOTICE 'Conta % não encontrada ou sem airline_company_id', p_account_id;
    RETURN;
  END IF;
  
  -- PASSO 3: Contar CPFs distintos registrados para essa companhia aérea
  -- Usa airline_company_id porque vários usuários podem ter contas da mesma cia.
  -- e os CPFs são compartilhados por companhia, não por conta individual
  SELECT COUNT(DISTINCT cr.cpf_encrypted)
  INTO v_cpf_count
  FROM cpf_registry cr
  WHERE cr.airline_company_id = v_airline_company_id
    AND cr.status IN ('available', 'blocked');
  
  RAISE NOTICE 'Conta %: encontrados % CPFs distintos para companhia %', 
    p_account_id, v_cpf_count, v_airline_company_id;
  
  -- PASSO 4: Atualizar o contador de CPFs e a data de atualização
  UPDATE mileage_accounts
  SET 
    cpf_count = v_cpf_count,
    updated_at = now()
  WHERE id = p_account_id;
  
  RAISE NOTICE 'Conta % atualizada: cpf_count = %', p_account_id, v_cpf_count;
END;
$$;