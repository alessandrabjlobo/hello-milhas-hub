-- Criar bucket público para imagens de orçamentos
INSERT INTO storage.buckets (id, name, public)
VALUES ('quotes', 'quotes', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: Usuários podem fazer upload de suas próprias imagens
CREATE POLICY "Users can upload quote images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'quotes' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS: Usuários podem ver suas próprias imagens
CREATE POLICY "Users can view their quote images"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'quotes' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS: Usuários podem deletar suas próprias imagens
CREATE POLICY "Users can delete their quote images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'quotes' AND
  auth.uid()::text = (storage.foldername(name))[1]
);