-- Create function to update account balance atomically
CREATE OR REPLACE FUNCTION public.update_account_balance(
  account_id UUID,
  miles_delta BIGINT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.mileage_accounts
  SET balance = balance + miles_delta,
      updated_at = now()
  WHERE id = account_id;
END;
$$;