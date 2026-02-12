
-- 1. Add tipo column to items_carta
ALTER TABLE items_carta
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'item';

-- 2. Create junction table: which extras each item accepts
CREATE TABLE IF NOT EXISTS item_extra_asignaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_carta_id uuid NOT NULL REFERENCES items_carta(id) ON DELETE CASCADE,
  extra_id uuid NOT NULL REFERENCES items_carta(id) ON DELETE CASCADE,
  orden integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(item_carta_id, extra_id)
);

-- RLS for item_extra_asignaciones
ALTER TABLE item_extra_asignaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read extra assignments"
  ON item_extra_asignaciones FOR SELECT
  USING (is_staff());

CREATE POLICY "Financial managers can manage extra assignments"
  ON item_extra_asignaciones FOR ALL
  USING (is_financial_manager(auth.uid()));

-- 3. Migrate existing extras from preparaciones to items_carta tipo='extra'
-- Use the EXTRAS category that already exists: 19e688b4-c4c8-45cb-8176-ee6aeae52d9b

-- Carne 45g con queso cheddar (costo=698.29, no price set)
INSERT INTO items_carta (nombre, tipo, categoria_carta_id, precio_base, fc_objetivo, costo_total)
VALUES ('Extra Carne 45g con cheddar', 'extra', '19e688b4-c4c8-45cb-8176-ee6aeae52d9b', 0, 32, 698.29);

-- Cebolla Crispy (costo=6.04, no price set)
INSERT INTO items_carta (nombre, tipo, categoria_carta_id, precio_base, fc_objetivo, costo_total)
VALUES ('Extra Cebolla Crispy', 'extra', '19e688b4-c4c8-45cb-8176-ee6aeae52d9b', 0, 32, 6.04);

-- Provoleta grillada (costo=461.36, precio_extra=-1 which is invalid, set to 0)
INSERT INTO items_carta (nombre, tipo, categoria_carta_id, precio_base, fc_objetivo, costo_total)
VALUES ('Extra Provoleta grillada', 'extra', '19e688b4-c4c8-45cb-8176-ee6aeae52d9b', 0, 32, 461.36);
