-- Add scope column to suppliers table to differentiate brand vs local suppliers
ALTER TABLE suppliers 
ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT 'local' CHECK (scope IN ('brand', 'local'));

-- Update existing suppliers that are used in mandatory products to be brand scope
UPDATE suppliers s
SET scope = 'brand'
WHERE EXISTS (
  SELECT 1 FROM brand_mandatory_products bmp 
  WHERE bmp.primary_supplier_id = s.id OR bmp.backup_supplier_id = s.id
);

-- Brand suppliers should not have branch_id
UPDATE suppliers 
SET branch_id = NULL 
WHERE scope = 'brand';

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_suppliers_scope ON suppliers(scope);
CREATE INDEX IF NOT EXISTS idx_suppliers_branch_scope ON suppliers(branch_id, scope);