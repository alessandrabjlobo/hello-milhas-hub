-- Fix search_path for encrypt_cpf function
CREATE OR REPLACE FUNCTION public.encrypt_cpf(cpf_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN encode(pgp_sym_encrypt(cpf_text, current_setting('app.settings.encryption_key', true)), 'base64');
END;
$$;

-- Fix search_path for decrypt_cpf function
CREATE OR REPLACE FUNCTION public.decrypt_cpf(cpf_encrypted TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN pgp_sym_decrypt(decode(cpf_encrypted, 'base64'), current_setting('app.settings.encryption_key', true));
END;
$$;

-- Fix search_path for update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;