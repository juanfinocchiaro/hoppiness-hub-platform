CREATE OR REPLACE FUNCTION public.recalcular_todos_los_costos()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
BEGIN
  -- First recalculate all recipes
  FOR r IN SELECT id FROM preparaciones WHERE deleted_at IS NULL
  LOOP
    PERFORM recalcular_costo_preparacion(r.id);
  END LOOP;

  -- Then recalculate all menu items
  FOR r IN SELECT id FROM items_carta WHERE deleted_at IS NULL AND activo = true
  LOOP
    PERFORM recalcular_costo_item_carta(r.id);
  END LOOP;
END;
$$;