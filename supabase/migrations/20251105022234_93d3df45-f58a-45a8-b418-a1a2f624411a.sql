-- Add helper functions for RLS
CREATE OR REPLACE FUNCTION public.get_user_supplier_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT supplier_id
  FROM public.profiles
  WHERE id = _user_id
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin'::app_role)
$$;

CREATE OR REPLACE FUNCTION public.is_locked(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.billing_subscriptions
    WHERE user_id = _user_id
      AND status != 'active'
      AND grace_period_ends < CURRENT_DATE
  )
$$;