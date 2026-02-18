-- =============================================================
-- Migration: Atomic inspection creation + Shift closure upsert
-- Date: 2026-02-17 (batch 2)
-- =============================================================

-- 1) Transactional RPC: create inspection + items from templates atomically
-- If items fail, the inspection is rolled back too.
CREATE OR REPLACE FUNCTION create_inspection_with_items(
  p_branch_id uuid,
  p_inspection_type text,
  p_inspector_id uuid,
  p_present_manager_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_inspection_id uuid;
  v_template record;
BEGIN
  -- Insert inspection
  INSERT INTO branch_inspections (
    branch_id, inspection_type, inspector_id, present_manager_id, status
  ) VALUES (
    p_branch_id, p_inspection_type, p_inspector_id, p_present_manager_id, 'en_curso'
  )
  RETURNING id INTO v_inspection_id;

  -- Insert items from active templates for this type
  INSERT INTO inspection_items (
    inspection_id, category, item_key, item_label, sort_order,
    complies, observations, photo_urls
  )
  SELECT
    v_inspection_id,
    t.category,
    t.item_key,
    t.item_label,
    t.sort_order,
    NULL,
    NULL,
    '[]'::jsonb
  FROM inspection_templates t
  WHERE t.inspection_type = p_inspection_type
    AND t.is_active = true
  ORDER BY t.sort_order;

  RETURN v_inspection_id;
END;
$$;

-- 2) Add unique constraint for shift_closures upsert
-- This enables ON CONFLICT for the check-then-act race condition fix.
-- Use DO block to make it idempotent.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'shift_closures_branch_fecha_turno_key'
  ) THEN
    ALTER TABLE shift_closures
      ADD CONSTRAINT shift_closures_branch_fecha_turno_key
      UNIQUE (branch_id, fecha, turno);
  END IF;
END;
$$;
