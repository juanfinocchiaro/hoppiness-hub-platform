-- Fix delivery_pricing_config: ensure one row per brand (in case 20260224000000 ran without UNIQUE)
-- Safe to run multiple times.

-- Remove duplicate rows, keeping the oldest per brand_id
DELETE FROM public.delivery_pricing_config a
USING public.delivery_pricing_config b
WHERE a.brand_id = b.brand_id AND a.created_at > b.created_at;

-- Add UNIQUE if not present (idempotent: do nothing if constraint exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'delivery_pricing_config_brand_id_key'
      AND conrelid = 'public.delivery_pricing_config'::regclass
  ) THEN
    ALTER TABLE public.delivery_pricing_config
      ADD CONSTRAINT delivery_pricing_config_brand_id_key UNIQUE (brand_id);
  END IF;
END $$;
