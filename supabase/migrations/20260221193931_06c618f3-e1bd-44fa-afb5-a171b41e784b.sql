-- Add promo pricing fields to items_carta for discount badges
ALTER TABLE public.items_carta
ADD COLUMN IF NOT EXISTS precio_promo numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS promo_etiqueta text DEFAULT NULL;

COMMENT ON COLUMN public.items_carta.precio_promo IS 'Promotional price (when set, precio_base shows as strikethrough)';
COMMENT ON COLUMN public.items_carta.promo_etiqueta IS 'Promo badge label (e.g. "2x1", "-30%", "PROMO EFECTIVO")';

-- Add cover_image_url to branches for branch cards
ALTER TABLE public.branches
ADD COLUMN IF NOT EXISTS cover_image_url text DEFAULT NULL;

COMMENT ON COLUMN public.branches.cover_image_url IS 'Cover image URL for public-facing branch cards';