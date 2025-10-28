-- Migration 3: Mileage Movements Table

CREATE TABLE public.mileage_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.mileage_accounts(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  note TEXT,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mileage_movements ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view movements for their supplier's accounts"
ON public.mileage_movements
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR
  EXISTS (
    SELECT 1 FROM public.mileage_accounts ma
    JOIN public.profiles p ON p.supplier_id = ma.supplier_id
    WHERE ma.id = mileage_movements.account_id
      AND p.id = auth.uid()
  )
);

CREATE POLICY "Users can create movements for their supplier's accounts"
ON public.mileage_movements
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  EXISTS (
    SELECT 1 FROM public.mileage_accounts ma
    JOIN public.profiles p ON p.supplier_id = ma.supplier_id
    WHERE ma.id = mileage_movements.account_id
      AND p.id = auth.uid()
  )
);

CREATE POLICY "Only admins can delete movements"
ON public.mileage_movements
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));