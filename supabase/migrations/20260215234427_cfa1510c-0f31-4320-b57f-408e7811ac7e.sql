-- Hacer el bucket público
UPDATE storage.buckets SET public = true WHERE id = 'cv-uploads';

-- Permitir subida pública (cualquier persona puede enviar su CV)
CREATE POLICY "Public CV upload" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'cv-uploads');

-- Permitir lectura a admins
CREATE POLICY "Admin CV read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'cv-uploads');