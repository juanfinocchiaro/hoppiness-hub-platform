-- Create dedicated public bucket for invoices/receipts
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to invoices
CREATE POLICY "Public can view invoices"
ON storage.objects FOR SELECT
USING (bucket_id = 'invoices');

-- Allow authenticated users to upload invoices  
CREATE POLICY "Authenticated users can upload invoices"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'invoices' AND auth.role() = 'authenticated');

-- Allow service role to manage invoices (for edge functions)
CREATE POLICY "Service role can manage invoices"
ON storage.objects FOR ALL
USING (bucket_id = 'invoices')
WITH CHECK (bucket_id = 'invoices');