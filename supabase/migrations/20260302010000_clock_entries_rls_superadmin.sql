-- Allow superadmin to delete, update, and insert clock entries
-- Previously only encargado/franquiciado could perform these operations

-- 1. RPC for superadmin delete (bypasses RLS via SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.admin_delete_clock_entry(_entry_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_superadmin(auth.uid()) THEN
    RAISE EXCEPTION 'Solo superadmin puede usar esta función';
  END IF;

  UPDATE employee_time_state SET last_event_id = NULL
    WHERE last_event_id = _entry_id;
  UPDATE employee_time_state SET open_clock_in_id = NULL, current_state = 'off'
    WHERE open_clock_in_id = _entry_id;

  DELETE FROM clock_entries WHERE id = _entry_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fichaje no encontrado: %', _entry_id;
  END IF;
END;
$$;

-- 2. RPC for superadmin update (bypasses RLS via SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.admin_update_clock_entry(
  _entry_id uuid,
  _entry_type text DEFAULT NULL,
  _created_at timestamptz DEFAULT NULL,
  _manual_reason text DEFAULT NULL,
  _manual_by uuid DEFAULT NULL,
  _original_created_at timestamptz DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_superadmin(auth.uid()) THEN
    RAISE EXCEPTION 'Solo superadmin puede usar esta función';
  END IF;
  UPDATE clock_entries SET
    entry_type = COALESCE(_entry_type, entry_type),
    created_at = COALESCE(_created_at, created_at),
    manual_reason = COALESCE(_manual_reason, manual_reason),
    manual_by = COALESCE(_manual_by, manual_by),
    is_manual = true,
    original_created_at = COALESCE(_original_created_at, original_created_at)
  WHERE id = _entry_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fichaje no encontrado: %', _entry_id;
  END IF;
END;
$$;

-- 3. Also fix the RLS policies to include superadmin (belt and suspenders)
DROP POLICY IF EXISTS clock_entries_delete_by_manager ON clock_entries;
CREATE POLICY clock_entries_delete_by_manager ON clock_entries
  FOR DELETE
  USING (
    is_superadmin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_branch_roles ubr
      WHERE ubr.user_id = auth.uid()
        AND ubr.branch_id = clock_entries.branch_id
        AND ubr.local_role IN ('encargado', 'franquiciado')
        AND ubr.is_active = true
    )
  );

DROP POLICY IF EXISTS clock_entries_update_by_manager ON clock_entries;
CREATE POLICY clock_entries_update_by_manager ON clock_entries
  FOR UPDATE
  USING (
    is_superadmin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_branch_roles ubr
      WHERE ubr.user_id = auth.uid()
        AND ubr.branch_id = clock_entries.branch_id
        AND ubr.local_role IN ('encargado', 'franquiciado')
        AND ubr.is_active = true
    )
  )
  WITH CHECK (
    is_superadmin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_branch_roles ubr
      WHERE ubr.user_id = auth.uid()
        AND ubr.branch_id = clock_entries.branch_id
        AND ubr.local_role IN ('encargado', 'franquiciado')
        AND ubr.is_active = true
    )
  );

DROP POLICY IF EXISTS clock_entries_insert_manual_by_manager ON clock_entries;
CREATE POLICY clock_entries_insert_manual_by_manager ON clock_entries
  FOR INSERT
  WITH CHECK (
    is_superadmin(auth.uid())
    OR (
      is_manual = true
      AND manual_by = auth.uid()
      AND EXISTS (
        SELECT 1 FROM user_branch_roles ubr
        WHERE ubr.user_id = auth.uid()
          AND ubr.branch_id = clock_entries.branch_id
          AND ubr.local_role IN ('encargado', 'franquiciado')
          AND ubr.is_active = true
      )
    )
  );
