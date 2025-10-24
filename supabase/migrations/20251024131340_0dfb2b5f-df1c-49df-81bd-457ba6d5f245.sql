-- Enable pgcrypto for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create enums
CREATE TYPE public.renewal_type AS ENUM ('annual', 'rolling');
CREATE TYPE public.cpf_status AS ENUM ('available', 'blocked', 'expired');
CREATE TYPE public.account_status AS ENUM ('active', 'inactive');
CREATE TYPE public.sale_status AS ENUM ('pending', 'completed', 'cancelled');
CREATE TYPE public.ticket_status AS ENUM ('confirmed', 'pending', 'cancelled');

-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create airline_companies table
CREATE TABLE public.airline_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  cpf_limit INTEGER NOT NULL DEFAULT 25,
  renewal_type public.renewal_type NOT NULL DEFAULT 'annual',
  renewal_config JSONB DEFAULT '{}',
  cost_per_mile DECIMAL(10, 4) NOT NULL DEFAULT 0.029,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, code)
);

-- Create mileage_accounts table
CREATE TABLE public.mileage_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  airline_company_id UUID NOT NULL REFERENCES public.airline_companies(id) ON DELETE CASCADE,
  account_number TEXT NOT NULL,
  balance BIGINT NOT NULL DEFAULT 0,
  cost_per_mile DECIMAL(10, 4) NOT NULL,
  status public.account_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create cpf_registry table with encryption
CREATE TABLE public.cpf_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  airline_company_id UUID NOT NULL REFERENCES public.airline_companies(id) ON DELETE CASCADE,
  cpf_encrypted TEXT NOT NULL,
  full_name TEXT NOT NULL,
  status public.cpf_status NOT NULL DEFAULT 'available',
  blocked_until TIMESTAMP WITH TIME ZONE,
  last_used_at TIMESTAMP WITH TIME ZONE,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sales table
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  client_cpf_encrypted TEXT NOT NULL,
  client_contact TEXT,
  mileage_account_id UUID REFERENCES public.mileage_accounts(id) ON DELETE SET NULL,
  cpf_used_id UUID REFERENCES public.cpf_registry(id) ON DELETE SET NULL,
  miles_used BIGINT NOT NULL,
  cost_per_mile DECIMAL(10, 4) NOT NULL,
  total_cost DECIMAL(10, 2) NOT NULL,
  sale_price DECIMAL(10, 2) NOT NULL,
  profit DECIMAL(10, 2) NOT NULL,
  profit_margin DECIMAL(5, 2) NOT NULL,
  status public.sale_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tickets table
CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  ticket_code TEXT NOT NULL,
  route TEXT NOT NULL,
  departure_date DATE NOT NULL,
  return_date DATE,
  passenger_name TEXT NOT NULL,
  passenger_cpf_encrypted TEXT NOT NULL,
  airline TEXT NOT NULL,
  status public.ticket_status NOT NULL DEFAULT 'pending',
  issued_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_mileage_accounts_user_id ON public.mileage_accounts(user_id);
CREATE INDEX idx_mileage_accounts_airline ON public.mileage_accounts(airline_company_id);
CREATE INDEX idx_cpf_registry_user_id ON public.cpf_registry(user_id);
CREATE INDEX idx_cpf_registry_airline ON public.cpf_registry(airline_company_id);
CREATE INDEX idx_cpf_registry_status ON public.cpf_registry(status);
CREATE INDEX idx_sales_user_id ON public.sales(user_id);
CREATE INDEX idx_sales_status ON public.sales(status);
CREATE INDEX idx_tickets_sale_id ON public.tickets(sale_id);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.airline_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mileage_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpf_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_airline_companies_updated_at BEFORE UPDATE ON public.airline_companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mileage_accounts_updated_at BEFORE UPDATE ON public.mileage_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cpf_registry_updated_at BEFORE UPDATE ON public.cpf_registry
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for airline_companies
CREATE POLICY "Users can view their own companies"
  ON public.airline_companies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own companies"
  ON public.airline_companies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own companies"
  ON public.airline_companies FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own companies"
  ON public.airline_companies FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for mileage_accounts
CREATE POLICY "Users can view their own accounts"
  ON public.mileage_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own accounts"
  ON public.mileage_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own accounts"
  ON public.mileage_accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own accounts"
  ON public.mileage_accounts FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for cpf_registry
CREATE POLICY "Users can view their own CPFs"
  ON public.cpf_registry FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own CPFs"
  ON public.cpf_registry FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own CPFs"
  ON public.cpf_registry FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own CPFs"
  ON public.cpf_registry FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for sales
CREATE POLICY "Users can view their own sales"
  ON public.sales FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sales"
  ON public.sales FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sales"
  ON public.sales FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sales"
  ON public.sales FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for tickets
CREATE POLICY "Users can view tickets from their own sales"
  ON public.tickets FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.sales
    WHERE sales.id = tickets.sale_id
    AND sales.user_id = auth.uid()
  ));

CREATE POLICY "Users can create tickets for their own sales"
  ON public.tickets FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.sales
    WHERE sales.id = tickets.sale_id
    AND sales.user_id = auth.uid()
  ));

CREATE POLICY "Users can update tickets from their own sales"
  ON public.tickets FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.sales
    WHERE sales.id = tickets.sale_id
    AND sales.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete tickets from their own sales"
  ON public.tickets FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.sales
    WHERE sales.id = tickets.sale_id
    AND sales.user_id = auth.uid()
  ));

-- Helper functions for CPF encryption/decryption
CREATE OR REPLACE FUNCTION public.encrypt_cpf(cpf_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN encode(pgp_sym_encrypt(cpf_text, current_setting('app.settings.encryption_key', true)), 'base64');
END;
$$;

CREATE OR REPLACE FUNCTION public.decrypt_cpf(cpf_encrypted TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN pgp_sym_decrypt(decode(cpf_encrypted, 'base64'), current_setting('app.settings.encryption_key', true));
END;
$$;