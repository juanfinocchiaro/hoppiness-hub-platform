CREATE OR REPLACE FUNCTION public.create_inspection_with_items(
  p_branch_id uuid, 
  p_inspection_type text, 
  p_inspector_id uuid, 
  p_present_manager_id uuid DEFAULT NULL::uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_inspection_id uuid;
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
    ARRAY[]::text[]
  FROM inspection_templates t
  WHERE t.inspection_type = p_inspection_type
    AND t.is_active = true
  ORDER BY t.sort_order;

  RETURN v_inspection_id;
END;
$function$;