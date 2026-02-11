
-- Step 1: Add rdo_category_code column to menu_productos
ALTER TABLE menu_productos 
ADD COLUMN IF NOT EXISTS rdo_category_code TEXT REFERENCES rdo_categories(code);

CREATE INDEX IF NOT EXISTS idx_menu_productos_rdo ON menu_productos(rdo_category_code);
