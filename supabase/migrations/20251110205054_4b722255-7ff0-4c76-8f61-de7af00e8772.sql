-- Create ticket-pdfs storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('ticket-pdfs', 'ticket-pdfs', false)
ON CONFLICT (id) DO NOTHING;

-- RLS Policy: Users can upload their own ticket PDFs
CREATE POLICY "Users can upload ticket PDFs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'ticket-pdfs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS Policy: Users can view their own ticket PDFs
CREATE POLICY "Users can view their ticket PDFs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'ticket-pdfs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS Policy: Users can update their own ticket PDFs
CREATE POLICY "Users can update their ticket PDFs"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'ticket-pdfs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS Policy: Users can delete their own ticket PDFs
CREATE POLICY "Users can delete their ticket PDFs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'ticket-pdfs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);