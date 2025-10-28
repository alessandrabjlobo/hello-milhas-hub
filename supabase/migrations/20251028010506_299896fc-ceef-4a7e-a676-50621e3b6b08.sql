-- Migration 6: Billing Subscriptions Table

CREATE TYPE public.subscription_plan AS ENUM ('start', 'pro');
CREATE TYPE public.subscription_status AS ENUM ('active', 'grace_period', 'suspended', 'cancelled');

CREATE TABLE public.billing_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  plan subscription_plan NOT NULL DEFAULT 'start',
  status subscription_status NOT NULL DEFAULT 'active',
  renewal_date DATE NOT NULL,
  grace_period_ends DATE,
  pix_instructions TEXT,
  receipt_url TEXT,
  receipt_uploaded_at TIMESTAMPTZ,
  receipt_reviewed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.billing_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own subscription"
ON public.billing_subscriptions
FOR SELECT
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update their own subscription"
ON public.billing_subscriptions
FOR UPDATE
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all subscriptions"
ON public.billing_subscriptions
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all subscriptions"
ON public.billing_subscriptions
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_billing_subscriptions_updated_at
BEFORE UPDATE ON public.billing_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();