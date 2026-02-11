
-- 1. Make insumo_id nullable
ALTER TABLE public.preparacion_ingredientes 
  ALTER COLUMN insumo_id DROP NOT NULL;

-- 2. Add sub_preparacion_id column
ALTER TABLE public.preparacion_ingredientes 
  ADD COLUMN sub_preparacion_id UUID REFERENCES public.preparaciones(id);

-- 3. Add CHECK: exactly one of insumo_id or sub_preparacion_id must be NOT NULL
ALTER TABLE public.preparacion_ingredientes 
  ADD CONSTRAINT chk_insumo_or_subprep 
  CHECK (
    (insumo_id IS NOT NULL AND sub_preparacion_id IS NULL) OR
    (insumo_id IS NULL AND sub_preparacion_id IS NOT NULL)
  );

-- 4. Update recalcular_costo_preparacion to handle sub-preparations
CREATE OR REPLACE FUNCTION public.recalcular_costo_preparacion(_prep_id uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_costo DECIMAL(12,2) := 0;
  v_tipo TEXT;
  v_es_inter BOOLEAN;
  v_metodo TEXT;
  v_costo_manual DECIMAL(12,2);
BEGIN
  SELECT tipo, es_intercambiable, metodo_costeo, costo_manual
  INTO v_tipo, v_es_inter, v_metodo, v_costo_manual
  FROM preparaciones WHERE id = _prep_id;

  IF v_tipo = 'elaborado' THEN
    -- Sum cost from insumo ingredients
    SELECT COALESCE(SUM(
      pi.cantidad * i.costo_por_unidad_base * 
      CASE WHEN pi.unidad IN ('kg', 'l') THEN 1000 ELSE 1 END
    ), 0)
    INTO v_costo
    FROM preparacion_ingredientes pi
    JOIN insumos i ON i.id = pi.insumo_id
    WHERE pi.preparacion_id = _prep_id
      AND pi.insumo_id IS NOT NULL;

    -- Add cost from sub-preparations
    v_costo := v_costo + COALESCE((
      SELECT SUM(pi.cantidad * COALESCE(p.costo_calculado, 0))
      FROM preparacion_ingredientes pi
      JOIN preparaciones p ON p.id = pi.sub_preparacion_id
      WHERE pi.preparacion_id = _prep_id
        AND pi.sub_preparacion_id IS NOT NULL
    ), 0);

  ELSIF v_tipo = 'componente_terminado' THEN
    IF v_costo_manual IS NOT NULL THEN
      v_costo := v_costo_manual;
    ELSIF v_es_inter THEN
      IF v_metodo = 'mas_caro' THEN
        SELECT COALESCE(MAX(i.costo_por_unidad_base), 0)
        INTO v_costo
        FROM preparacion_opciones po
        JOIN insumos i ON i.id = po.insumo_id
        WHERE po.preparacion_id = _prep_id;
      ELSE
        SELECT COALESCE(AVG(i.costo_por_unidad_base), 0)
        INTO v_costo
        FROM preparacion_opciones po
        JOIN insumos i ON i.id = po.insumo_id
        WHERE po.preparacion_id = _prep_id;
      END IF;
    ELSE
      SELECT COALESCE(i.costo_por_unidad_base, 0)
      INTO v_costo
      FROM preparacion_ingredientes pi
      JOIN insumos i ON i.id = pi.insumo_id
      WHERE pi.preparacion_id = _prep_id
        AND pi.insumo_id IS NOT NULL
      ORDER BY pi.orden LIMIT 1;
    END IF;
  END IF;

  UPDATE preparaciones SET costo_calculado = v_costo WHERE id = _prep_id;
  RETURN v_costo;
END;
$function$;
