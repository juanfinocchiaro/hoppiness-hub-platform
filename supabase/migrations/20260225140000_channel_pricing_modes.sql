-- =====================================================================
-- Migration: Channel Pricing Modes (percentage, fixed, mirror, manual)
-- =====================================================================

ALTER TABLE price_lists
  ADD COLUMN IF NOT EXISTS pricing_mode text NOT NULL DEFAULT 'manual'
    CHECK (pricing_mode IN ('base','percentage','fixed_amount','mirror','manual')),
  ADD COLUMN IF NOT EXISTS pricing_value numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mirror_channel text DEFAULT NULL;

COMMENT ON COLUMN price_lists.pricing_mode IS
  'base=uses precio_base, percentage=base*(1+value/100), fixed_amount=base+value, mirror=copies another channel, manual=per-item overrides only';
COMMENT ON COLUMN price_lists.pricing_value IS
  'Numeric value for percentage or fixed_amount mode (e.g. 30 means +30%)';
COMMENT ON COLUMN price_lists.mirror_channel IS
  'Channel to mirror when pricing_mode=mirror (e.g. rappi)';

-- Set sensible defaults for existing rows
UPDATE price_lists SET pricing_mode = 'base' WHERE channel IN ('mostrador', 'webapp');
