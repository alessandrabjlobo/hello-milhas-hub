-- Create suppliers table
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  pix_key TEXT,
  payment_type TEXT NOT NULL DEFAULT 'per_use',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for suppliers
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for suppliers
CREATE POLICY "Users can view their own suppliers"
ON public.suppliers
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own suppliers"
ON public.suppliers
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own suppliers"
ON public.suppliers
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own suppliers"
ON public.suppliers
FOR DELETE
USING (auth.uid() = user_id);

-- Add supplier-related fields to mileage_accounts
ALTER TABLE public.mileage_accounts 
ADD COLUMN supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
ADD COLUMN account_holder_name TEXT,
ADD COLUMN account_holder_cpf TEXT,
ADD COLUMN password_encrypted TEXT,
ADD COLUMN cpf_limit INTEGER NOT NULL DEFAULT 25,
ADD COLUMN cpf_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN last_cpf_renewal_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create password encryption/decryption functions (similar to CPF)
CREATE OR REPLACE FUNCTION public.encrypt_password(password_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN encode(pgp_sym_encrypt(password_text, current_setting('app.settings.encryption_key', true)), 'base64');
END;
$$;

CREATE OR REPLACE FUNCTION public.decrypt_password(password_encrypted TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN pgp_sym_decrypt(decode(password_encrypted, 'base64'), current_setting('app.settings.encryption_key', true));
END;
$$;

-- Create supplier_transactions table
CREATE TABLE public.supplier_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.mileage_accounts(id) ON DELETE SET NULL,
  sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'payment')),
  amount NUMERIC NOT NULL,
  miles_quantity BIGINT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for supplier_transactions
ALTER TABLE public.supplier_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for supplier_transactions
CREATE POLICY "Users can view their own transactions"
ON public.supplier_transactions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own transactions"
ON public.supplier_transactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions"
ON public.supplier_transactions
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions"
ON public.supplier_transactions
FOR DELETE
USING (auth.uid() = user_id);

-- Create verification_code_requests table
CREATE TABLE public.verification_code_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.mileage_accounts(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'received', 'cancelled')),
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  received_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS for verification_code_requests
ALTER TABLE public.verification_code_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for verification_code_requests
CREATE POLICY "Users can view their own verification requests"
ON public.verification_code_requests
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own verification requests"
ON public.verification_code_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own verification requests"
ON public.verification_code_requests
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own verification requests"
ON public.verification_code_requests
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for suppliers updated_at
CREATE TRIGGER update_suppliers_updated_at
BEFORE UPDATE ON public.suppliers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();