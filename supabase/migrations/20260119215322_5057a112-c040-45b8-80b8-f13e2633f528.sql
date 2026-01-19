-- Add file_path column to store the storage path separately
ALTER TABLE public.scanned_documents ADD COLUMN file_path TEXT;

-- Update existing records to extract file_path from file_url
UPDATE public.scanned_documents 
SET file_path = regexp_replace(file_url, '.*scanned-documents/', '')
WHERE file_path IS NULL AND file_url IS NOT NULL;