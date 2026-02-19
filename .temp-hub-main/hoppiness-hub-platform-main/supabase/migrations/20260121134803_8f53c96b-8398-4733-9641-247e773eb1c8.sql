-- =====================================================================
-- MIGRATION: Separate Channel (origin) from Service Type (delivery method) - Part 2
-- Previous steps already added service_type column and migrated data
-- =====================================================================

-- Note: service_type column should already exist from partial previous run
-- If not, this will add it:
ALTER TABLE orders ADD COLUMN IF NOT EXISTS service_type TEXT;

-- Migrate any remaining NULL values
UPDATE orders 
SET service_type = order_type::TEXT
WHERE service_type IS NULL;

-- Set default if not set
ALTER TABLE orders ALTER COLUMN service_type SET DEFAULT 'takeaway';

-- Create index if not exists
CREATE INDEX IF NOT EXISTS idx_orders_service_type ON orders(service_type);

-- Update existing channels to match new structure using valid channel_type values
-- Rename 'delivery' channel to 'webapp' (use 'direct' which is an allowed type)
UPDATE channels SET 
  name = 'Web App',
  slug = 'webapp',
  channel_type = 'direct'
WHERE slug = 'delivery';

UPDATE channels SET 
  channel_type = 'pos'
WHERE slug = 'mostrador';

UPDATE channels SET 
  slug = 'mp_delivery',
  name = 'MercadoPago Delivery',
  channel_type = 'marketplace'
WHERE slug = 'mercadopago';

-- Update orders that referenced the old 'takeaway' channel to point to 'mostrador'
UPDATE orders 
SET channel_id = (SELECT id FROM channels WHERE slug = 'mostrador' LIMIT 1)
WHERE channel_id = (SELECT id FROM channels WHERE slug = 'takeaway' LIMIT 1);

-- Delete the 'takeaway' channel (it's a service type, not a channel)
DELETE FROM channels WHERE slug = 'takeaway';

-- Drop the allows_* columns as they're no longer relevant
ALTER TABLE channels DROP COLUMN IF EXISTS allows_delivery;
ALTER TABLE channels DROP COLUMN IF EXISTS allows_takeaway;
ALTER TABLE channels DROP COLUMN IF EXISTS allows_dine_in;

-- Add comments for documentation
COMMENT ON COLUMN orders.service_type IS 'How the order is delivered: delivery (sent to customer), takeaway (customer picks up), dine_in (eat at restaurant)';
COMMENT ON TABLE channels IS 'Sales channels - where orders originate from (webapp, mostrador, rappi, pedidosya, mp_delivery)';