-- Create storage bucket for CV uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('cv-uploads', 'cv-uploads', false, 5242880, ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage policies for CV uploads
-- Anyone can upload (for the form)
CREATE POLICY "Anyone can upload CV" ON storage.objects
FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'cv-uploads');

-- Only admin can view/download
CREATE POLICY "Admin can view CVs" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'cv-uploads' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
    AND is_active = true
  )
);

-- Add attachment fields to contact_messages if not exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contact_messages' AND column_name = 'attachment_url') THEN
    ALTER TABLE public.contact_messages ADD COLUMN attachment_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contact_messages' AND column_name = 'attachment_name') THEN
    ALTER TABLE public.contact_messages ADD COLUMN attachment_name TEXT;
  END IF;
END $$;