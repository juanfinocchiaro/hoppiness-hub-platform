
-- Add INSERT, UPDATE, DELETE policies for product-images bucket
CREATE POLICY "Staff can upload product images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-images'
  AND is_staff(auth.uid())
);

CREATE POLICY "Staff can update product images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'product-images'
  AND is_staff(auth.uid())
);

CREATE POLICY "Staff can delete product images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'product-images'
  AND is_staff(auth.uid())
);
