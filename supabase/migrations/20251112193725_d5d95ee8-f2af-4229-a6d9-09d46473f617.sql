-- Desabilitar trigger de auditoria temporariamente
ALTER TABLE mileage_accounts DISABLE TRIGGER audit_mileage_accounts;

-- Correção do supplier_id nas contas existentes
UPDATE mileage_accounts ma
SET supplier_id = p.supplier_id,
    updated_at = now()
FROM profiles p
WHERE ma.user_id = p.id
  AND (ma.supplier_id IS NULL OR ma.supplier_id != p.supplier_id);

-- Reabilitar trigger de auditoria
ALTER TABLE mileage_accounts ENABLE TRIGGER audit_mileage_accounts;

-- Criar políticas de storage para bucket ticket-pdfs
CREATE POLICY "Anyone can view ticket attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'ticket-pdfs');

CREATE POLICY "Users can upload their own tickets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'ticket-pdfs' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete their own tickets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'ticket-pdfs' AND
  auth.uid() IS NOT NULL
);

-- Função para reprocessar vendas existentes e registrar CPFs
CREATE OR REPLACE FUNCTION public.backfill_cpf_registry()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sale_record RECORD;
  cpf_record JSONB;
  existing_cpf_id UUID;
BEGIN
  FOR sale_record IN 
    SELECT 
      s.id,
      s.user_id,
      s.passenger_cpfs,
      ma.airline_company_id,
      ma.supplier_id,
      s.created_at
    FROM sales s
    JOIN mileage_accounts ma ON ma.id = s.mileage_account_id
    WHERE s.sale_source = 'internal_account'
      AND s.passenger_cpfs IS NOT NULL
      AND jsonb_array_length(s.passenger_cpfs) > 0
  LOOP
    FOR cpf_record IN SELECT * FROM jsonb_array_elements(sale_record.passenger_cpfs)
    LOOP
      -- Verificar se CPF já existe
      SELECT id INTO existing_cpf_id
      FROM cpf_registry
      WHERE airline_company_id = sale_record.airline_company_id
        AND cpf_encrypted = (cpf_record->>'cpf');
      
      IF existing_cpf_id IS NULL THEN
        -- Inserir novo CPF
        INSERT INTO cpf_registry (
          user_id,
          airline_company_id,
          full_name,
          cpf_encrypted,
          usage_count,
          first_use_date,
          last_used_at,
          status
        ) VALUES (
          sale_record.user_id,
          sale_record.airline_company_id,
          cpf_record->>'name',
          cpf_record->>'cpf',
          1,
          sale_record.created_at,
          sale_record.created_at,
          'available'
        );
      ELSE
        -- Incrementar contador
        UPDATE cpf_registry
        SET 
          usage_count = usage_count + 1,
          last_used_at = GREATEST(last_used_at, sale_record.created_at),
          first_use_date = LEAST(COALESCE(first_use_date, sale_record.created_at), sale_record.created_at)
        WHERE id = existing_cpf_id;
      END IF;
    END LOOP;
    
    -- Atualizar contador da conta
    PERFORM update_account_cpf_count(sale_record.airline_company_id);
  END LOOP;
END;
$$;

-- Executar backfill
SELECT backfill_cpf_registry();