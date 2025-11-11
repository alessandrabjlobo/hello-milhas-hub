-- Adicionar campos Stripe à tabela billing_subscriptions existente
ALTER TABLE public.billing_subscriptions
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS billing_email TEXT,
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_billing_stripe_customer ON public.billing_subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_billing_stripe_subscription ON public.billing_subscriptions(stripe_subscription_id);

-- Comentários para documentação
COMMENT ON COLUMN public.billing_subscriptions.stripe_customer_id IS 'Stripe Customer ID (cus_xxx)';
COMMENT ON COLUMN public.billing_subscriptions.stripe_subscription_id IS 'Stripe Subscription ID (sub_xxx)';
COMMENT ON COLUMN public.billing_subscriptions.billing_email IS 'E-mail usado no checkout Stripe';
COMMENT ON COLUMN public.billing_subscriptions.stripe_price_id IS 'Stripe Price ID do plano atual';

-- Atualizar o enum de status para incluir 'trialing' e 'past_due'
ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'trialing';
ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'past_due';