
-- Observacion 3: Migrar photo_url a photo_urls (array)
ALTER TABLE inspection_items 
  ADD COLUMN photo_urls TEXT[] DEFAULT '{}';

UPDATE inspection_items 
  SET photo_urls = ARRAY[photo_url] 
  WHERE photo_url IS NOT NULL;

ALTER TABLE inspection_items DROP COLUMN photo_url;

-- Observacion 4: Corregir RLS para encargados usando user_branch_roles
DROP POLICY IF EXISTS branch_inspections_local_view ON branch_inspections;
CREATE POLICY branch_inspections_local_view ON branch_inspections
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_branch_roles ubr
      WHERE ubr.user_id = auth.uid()
      AND ubr.is_active = true
      AND ubr.local_role IN ('franquiciado', 'encargado')
      AND ubr.branch_id = branch_inspections.branch_id
    )
  );

DROP POLICY IF EXISTS inspection_items_local_view ON inspection_items;
CREATE POLICY inspection_items_local_view ON inspection_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM branch_inspections bi
      JOIN user_branch_roles ubr ON ubr.branch_id = bi.branch_id
      WHERE bi.id = inspection_items.inspection_id
      AND ubr.user_id = auth.uid()
      AND ubr.is_active = true
      AND ubr.local_role IN ('franquiciado', 'encargado')
    )
  );
