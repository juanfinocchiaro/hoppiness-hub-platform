-- Add integration_status column to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS integration_status TEXT 
  DEFAULT 'auto_accepted'
  CHECK (integration_status IN ('pending', 'accepted', 'rejected', 'auto_accepted'));

-- Add related fields for integration tracking  
ALTER TABLE orders ADD COLUMN IF NOT EXISTS integration_accepted_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS integration_accepted_by UUID;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS integration_rejected_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS integration_rejected_by UUID;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS integration_rejection_reason TEXT;

-- Index for querying pending orders
CREATE INDEX IF NOT EXISTS idx_orders_integration_status ON orders(integration_status);