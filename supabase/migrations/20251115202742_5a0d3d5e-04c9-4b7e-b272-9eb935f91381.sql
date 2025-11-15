-- ============================================
-- MIGRATION: Corrigir lógica de contagem de CPFs distintos
-- ============================================

-- 1. Remover trigger antigo que incrementa incorretamente
DROP TRIGGER IF EXISTS trigger_increment_cpf_count ON public.sales;

-- 2. Remover função antiga (se existir)
DROP FUNCTION IF EXISTS public.increment_account_cpf_count();

-- 3. Criar função wrapper para trigger
CREATE OR REPLACE FUNCTION public.update_account_cpf_count_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Atualizar cpf_count da conta após venda
  IF NEW.mileage_account_id IS NOT NULL THEN
    PERFORM update_account_cpf_count(NEW.mileage_account_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- 4. Criar trigger que conta CPFs distintos
CREATE TRIGGER trigger_update_cpf_count_after_sale
AFTER INSERT ON public.sales
FOR EACH ROW
WHEN (NEW.mileage_account_id IS NOT NULL)
EXECUTE FUNCTION update_account_cpf_count_trigger();