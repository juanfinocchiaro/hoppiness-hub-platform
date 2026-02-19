-- =============================================
-- POS - Integración con shift_closures, items_carta, triggers
-- =============================================

-- 1. closure_category en items_carta (mapeo a categorías de cierre)
ALTER TABLE public.items_carta
ADD COLUMN IF NOT EXISTS closure_category VARCHAR(30);

COMMENT ON COLUMN public.items_carta.closure_category IS 'Categoría para cierre de turno: clasica, original, veggie, etc.';

-- 2. fuente en shift_closures
ALTER TABLE public.shift_closures
ADD COLUMN IF NOT EXISTS fuente VARCHAR(20) DEFAULT 'manual';

COMMENT ON COLUMN public.shift_closures.fuente IS 'pos = generado desde POS, manual = carga manual';

-- 3. Función generar número de pedido del día
CREATE OR REPLACE FUNCTION public.generar_numero_pedido(p_branch_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_numero INTEGER;
BEGIN
  SELECT COALESCE(MAX(numero_pedido), 0) + 1 INTO v_numero
  FROM pedidos
  WHERE branch_id = p_branch_id
    AND created_at::date = CURRENT_DATE;

  RETURN v_numero;
END;
$$;

-- 4. Función asignar llamador disponible
CREATE OR REPLACE FUNCTION public.asignar_llamador(p_branch_id UUID, p_pedido_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_numero INTEGER;
BEGIN
  SELECT numero INTO v_numero
  FROM llamadores
  WHERE branch_id = p_branch_id
    AND en_uso = FALSE
  ORDER BY numero
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_numero IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE llamadores
  SET en_uso = TRUE, pedido_id = p_pedido_id, asignado_at = NOW()
  WHERE branch_id = p_branch_id AND numero = v_numero;

  RETURN v_numero;
END;
$$;

-- 5. Función liberar llamador
CREATE OR REPLACE FUNCTION public.liberar_llamador(p_pedido_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE llamadores
  SET en_uso = FALSE, pedido_id = NULL, asignado_at = NULL
  WHERE pedido_id = p_pedido_id;
END;
$$;

-- 6. Trigger descontar stock al crear pedido_item (solo insumos directos en composición)
CREATE OR REPLACE FUNCTION public.descontar_stock_pedido()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_branch_id UUID;
  v_composicion RECORD;
  v_cantidad_descontar DECIMAL(10,3);
BEGIN
  SELECT branch_id INTO v_branch_id FROM pedidos WHERE id = NEW.pedido_id;

  FOR v_composicion IN
    SELECT icc.insumo_id, icc.cantidad::DECIMAL(10,3) AS cantidad_receta
    FROM item_carta_composicion icc
    WHERE icc.item_carta_id = NEW.item_carta_id
      AND icc.insumo_id IS NOT NULL
  LOOP
    v_cantidad_descontar := v_composicion.cantidad_receta * NEW.cantidad;

    UPDATE stock_actual
    SET cantidad = cantidad - v_cantidad_descontar,
        updated_at = NOW()
    WHERE branch_id = v_branch_id
      AND insumo_id = v_composicion.insumo_id
      AND cantidad >= v_cantidad_descontar;

    IF FOUND THEN
      INSERT INTO stock_movimientos (
        branch_id, insumo_id, tipo, cantidad,
        cantidad_anterior, cantidad_nueva, pedido_id
      )
      SELECT
        v_branch_id,
        v_composicion.insumo_id,
        'venta',
        -v_cantidad_descontar,
        sa.cantidad + v_cantidad_descontar,
        sa.cantidad - v_cantidad_descontar,
        NEW.pedido_id
      FROM stock_actual sa
      WHERE sa.branch_id = v_branch_id
        AND sa.insumo_id = v_composicion.insumo_id;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_descontar_stock ON pedido_items;
CREATE TRIGGER trg_descontar_stock
AFTER INSERT ON pedido_items
FOR EACH ROW
EXECUTE FUNCTION descontar_stock_pedido();

-- 7. RPC generar_shift_closure_desde_pos (placeholder - lógica completa en Fase 7)
CREATE OR REPLACE FUNCTION public.generar_shift_closure_desde_pos(
  p_branch_id UUID,
  p_fecha DATE,
  p_turno TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SET search_path TO 'public'
SECURITY DEFINER
AS $$
DECLARE
  v_closure_id UUID;
  v_cerrado_por UUID := auth.uid();
BEGIN
  IF NOT (public.has_branch_access_v2(v_cerrado_por, p_branch_id) OR public.is_superadmin(v_cerrado_por)) THEN
    RAISE EXCEPTION 'No tienes acceso a esta sucursal';
  END IF;

  IF p_turno NOT IN ('mañana', 'mediodía', 'noche', 'trasnoche') THEN
    RAISE EXCEPTION 'Turno inválido';
  END IF;

  INSERT INTO shift_closures (
    branch_id, fecha, turno,
    hamburguesas, ventas_local, ventas_apps,
    total_hamburguesas, total_vendido, total_efectivo, total_digital,
    facturacion_esperada, facturacion_diferencia,
    total_facturado, cerrado_por, fuente
  )
  SELECT
    p_branch_id,
    p_fecha,
    p_turno,
    '{}'::jsonb,
    '{}'::jsonb,
    '{}'::jsonb,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    v_cerrado_por,
    'pos'
  WHERE NOT EXISTS (
    SELECT 1 FROM shift_closures
    WHERE branch_id = p_branch_id AND fecha = p_fecha AND turno = p_turno
  )
  RETURNING id INTO v_closure_id;

  IF v_closure_id IS NULL THEN
    SELECT id INTO v_closure_id FROM shift_closures
    WHERE branch_id = p_branch_id AND fecha = p_fecha AND turno = p_turno;
  END IF;

  RETURN v_closure_id;
END;
$$;
