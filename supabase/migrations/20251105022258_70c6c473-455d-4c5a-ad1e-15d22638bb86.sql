-- Create storage bucket for tickets and set up RLS policies

INSERT INTO storage.buckets (id, name, public)
VALUES ('tickets', 'tickets', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for tickets bucket
CREATE POLICY "Users can read their supplier's ticket files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'tickets' AND (
    public.is_admin(auth.uid()) OR
    (storage.foldername(name))[1] = public.get_user_supplier_id(auth.uid())::text
  )
);

CREATE POLICY "Users can upload ticket files for their supplier"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'tickets' AND
  NOT public.is_locked(auth.uid()) AND (
    public.is_admin(auth.uid()) OR
    (storage.foldername(name))[1] = public.get_user_supplier_id(auth.uid())::text
  )
);

CREATE POLICY "Users can update their supplier's ticket files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'tickets' AND
  NOT public.is_locked(auth.uid()) AND (
    public.is_admin(auth.uid()) OR
    (storage.foldername(name))[1] = public.get_user_supplier_id(auth.uid())::text
  )
);

CREATE POLICY "Users can delete their supplier's ticket files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'tickets' AND
  NOT public.is_locked(auth.uid()) AND (
    public.is_admin(auth.uid()) OR
    (storage.foldername(name))[1] = public.get_user_supplier_id(auth.uid())::text
  )
);