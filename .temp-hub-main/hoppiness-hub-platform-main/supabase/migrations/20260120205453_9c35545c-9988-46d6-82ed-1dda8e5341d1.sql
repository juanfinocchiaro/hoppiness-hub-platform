-- Add webhook_api_key to branches for external integrations
ALTER TABLE branches ADD COLUMN IF NOT EXISTS webhook_api_key TEXT;

-- Add external_order_id to orders for tracking external platform orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS external_order_id TEXT;

-- Index for looking up orders by external ID
CREATE INDEX IF NOT EXISTS idx_orders_external_id ON orders(external_order_id) WHERE external_order_id IS NOT NULL;

-- Add external_id to products for matching with external platforms
ALTER TABLE products ADD COLUMN IF NOT EXISTS external_id TEXT;

-- Index for product external ID matching
CREATE INDEX IF NOT EXISTS idx_products_external_id ON products(external_id) WHERE external_id IS NOT NULL;