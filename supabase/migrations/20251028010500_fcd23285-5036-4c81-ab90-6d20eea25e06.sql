-- Migration 5: Audit Triggers for mileage_accounts and mileage_movements

-- Function to log audit trail
CREATE OR REPLACE FUNCTION public.log_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _supplier_id UUID;
  _diff JSONB;
BEGIN
  -- Get supplier_id based on table
  IF TG_TABLE_NAME = 'mileage_accounts' THEN
    IF TG_OP = 'DELETE' THEN
      _supplier_id := OLD.supplier_id;
    ELSE
      _supplier_id := NEW.supplier_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'mileage_movements' THEN
    IF TG_OP = 'DELETE' THEN
      SELECT ma.supplier_id INTO _supplier_id
      FROM mileage_accounts ma
      WHERE ma.id = OLD.account_id;
    ELSE
      SELECT ma.supplier_id INTO _supplier_id
      FROM mileage_accounts ma
      WHERE ma.id = NEW.account_id;
    END IF;
  END IF;

  -- Build diff
  IF TG_OP = 'INSERT' THEN
    _diff := jsonb_build_object('new', row_to_json(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    _diff := jsonb_build_object('old', row_to_json(OLD), 'new', row_to_json(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    _diff := jsonb_build_object('old', row_to_json(OLD));
  END IF;

  -- Insert audit log
  INSERT INTO public.audit_logs (
    table_name,
    record_id,
    action,
    changed_by,
    diff,
    supplier_id
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    lower(TG_OP),
    auth.uid(),
    _diff,
    _supplier_id
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers
CREATE TRIGGER audit_mileage_accounts
AFTER INSERT OR UPDATE OR DELETE ON public.mileage_accounts
FOR EACH ROW EXECUTE FUNCTION public.log_audit();

CREATE TRIGGER audit_mileage_movements
AFTER INSERT OR UPDATE OR DELETE ON public.mileage_movements
FOR EACH ROW EXECUTE FUNCTION public.log_audit();