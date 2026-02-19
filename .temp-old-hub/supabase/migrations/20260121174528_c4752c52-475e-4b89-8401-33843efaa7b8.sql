-- Add pos_thumb_url to products for POS-optimized thumbnails
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS pos_thumb_url text;

-- Add image_updated_at for cache busting
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS image_updated_at timestamp with time zone DEFAULT now();

-- Comment for documentation
COMMENT ON COLUMN public.products.pos_thumb_url IS 'URL of POS-optimized thumbnail (4:3 with padding)';
COMMENT ON COLUMN public.products.image_updated_at IS 'Timestamp when product image was last updated';