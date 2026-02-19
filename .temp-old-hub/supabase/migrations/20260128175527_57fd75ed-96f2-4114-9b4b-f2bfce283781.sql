-- Add missing columns to regulations table
ALTER TABLE public.regulations 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS pdf_url TEXT,
ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ DEFAULT now();

-- Update existing rows to use document_url as pdf_url if pdf_url is null
UPDATE public.regulations SET pdf_url = document_url WHERE pdf_url IS NULL AND document_url IS NOT NULL;
UPDATE public.regulations SET published_at = created_at WHERE published_at IS NULL;

-- Add regulation_version column to regulation_signatures for easier querying
ALTER TABLE public.regulation_signatures
ADD COLUMN IF NOT EXISTS regulation_version INTEGER;