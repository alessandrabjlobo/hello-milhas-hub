-- Migration 2: Suppliers-Airlines Junction Table

CREATE TABLE public.suppliers_airlines (
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE NOT NULL,
  airline_company_id UUID REFERENCES public.airline_companies(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (supplier_id, airline_company_id)
);

-- Enable RLS
ALTER TABLE public.suppliers_airlines ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their supplier's airlines"
ON public.suppliers_airlines
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.supplier_id = suppliers_airlines.supplier_id
  )
);

CREATE POLICY "Supplier owners can manage their airlines"
ON public.suppliers_airlines
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  (
    public.has_role(auth.uid(), 'supplier_owner') AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.supplier_id = suppliers_airlines.supplier_id
    )
  )
);

CREATE POLICY "Supplier owners can delete their airlines"
ON public.suppliers_airlines
FOR DELETE
USING (
  public.has_role(auth.uid(), 'admin') OR
  (
    public.has_role(auth.uid(), 'supplier_owner') AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.supplier_id = suppliers_airlines.supplier_id
    )
  )
);