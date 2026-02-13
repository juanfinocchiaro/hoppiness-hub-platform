
-- V3 Extras: Add reference columns to items_carta
ALTER TABLE items_carta
  ADD COLUMN IF NOT EXISTS composicion_ref_preparacion_id uuid REFERENCES preparaciones(id),
  ADD COLUMN IF NOT EXISTS composicion_ref_insumo_id uuid REFERENCES insumos(id);

COMMENT ON COLUMN items_carta.composicion_ref_preparacion_id IS 'For tipo=extra: links to the preparacion this extra represents';
COMMENT ON COLUMN items_carta.composicion_ref_insumo_id IS 'For tipo=extra: links to the insumo this extra represents';

-- V3 Extras: Create item_extra_asignaciones table
CREATE TABLE IF NOT EXISTS item_extra_asignaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_carta_id uuid NOT NULL REFERENCES items_carta(id) ON DELETE CASCADE,
  extra_id uuid NOT NULL REFERENCES items_carta(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(item_carta_id, extra_id)
);

COMMENT ON TABLE item_extra_asignaciones IS 
  'Links an item (tipo=item) with the extras (tipo=extra) it accepts. item_carta_id = product, extra_id = extra.';

-- Enable RLS
ALTER TABLE item_extra_asignaciones ENABLE ROW LEVEL SECURITY;

-- RLS: staff can read
CREATE POLICY "Staff can read extra assignments"
  ON item_extra_asignaciones FOR SELECT
  USING (is_staff());

-- RLS: superadmin/financial can manage
CREATE POLICY "Financial managers can manage extra assignments"
  ON item_extra_asignaciones FOR ALL
  USING (is_superadmin(auth.uid()));

-- V3 Extras: Drop es_extra from item_carta_composicion (no longer used)
ALTER TABLE item_carta_composicion DROP COLUMN IF EXISTS es_extra;
