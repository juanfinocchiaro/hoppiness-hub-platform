ALTER TABLE menu_productos ADD COLUMN IF NOT EXISTS visible_en_carta BOOLEAN DEFAULT true;
CREATE INDEX IF NOT EXISTS idx_menu_productos_visible ON menu_productos(visible_en_carta);