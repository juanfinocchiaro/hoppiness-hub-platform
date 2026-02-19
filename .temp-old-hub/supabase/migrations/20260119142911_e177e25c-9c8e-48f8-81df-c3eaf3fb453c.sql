-- Add distance-based pricing fields to delivery_zones
ALTER TABLE public.delivery_zones
ADD COLUMN IF NOT EXISTS pricing_mode text NOT NULL DEFAULT 'fixed',
ADD COLUMN IF NOT EXISTS base_fee numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS price_per_km numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_distance_km numeric(5,2) DEFAULT NULL;

-- Add invoice configuration fields to branches
ALTER TABLE public.branches
ADD COLUMN IF NOT EXISTS auto_invoice_integrations boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS invoice_provider text DEFAULT NULL;

-- Add comment explaining pricing_mode values
COMMENT ON COLUMN public.delivery_zones.pricing_mode IS 'fixed = use delivery_fee, distance = base_fee + (distance * price_per_km)';