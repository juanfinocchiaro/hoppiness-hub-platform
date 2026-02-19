-- =============================================
-- Fase 1: Compras suman stock
-- Al insertar item en items_factura (insumo), sumar a stock_actual y registrar movimiento compra
-- =============================================

CREATE OR REPLACE FUNCTION public.sumar_stock_desde_compra()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_branch_id UUID;
  v_unidad_base TEXT;
  v_contenido DECIMAL(12,4);
  v_cantidad_base DECIMAL(10,3);
  v_cantidad_anterior DECIMAL(10,3);
  v_cantidad_nueva DECIMAL(10,3);
BEGIN
  -- Solo ítems de tipo insumo con insumo_id
  IF NEW.insumo_id IS NULL OR (NEW.tipo_item IS NOT NULL AND NEW.tipo_item != 'insumo') THEN
    RETURN NEW;
  END IF;

  SELECT f.branch_id INTO v_branch_id
  FROM facturas_proveedores f
  WHERE f.id = NEW.factura_id AND f.deleted_at IS NULL;
  IF v_branch_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Convertir cantidad a unidad_base del insumo
  SELECT i.unidad_base, COALESCE(i.unidad_compra_contenido, 1)
  INTO v_unidad_base, v_contenido
  FROM insumos i
  WHERE i.id = NEW.insumo_id;

  IF v_unidad_base IS NULL THEN
    v_unidad_base := COALESCE(NEW.unidad, 'un');
    v_contenido := 1;
  END IF;

  -- Si la unidad del ítem es la de compra (ej. caja, kg), convertir a unidad_base
  IF NEW.unidad IS NOT NULL AND LOWER(TRIM(NEW.unidad)) != LOWER(v_unidad_base) AND v_contenido > 0 THEN
    v_cantidad_base := NEW.cantidad * v_contenido;
  ELSE
    v_cantidad_base := NEW.cantidad;
  END IF;

  IF v_cantidad_base <= 0 THEN
    RETURN NEW;
  END IF;

  -- Leer cantidad anterior antes de actualizar
  SELECT COALESCE(sa.cantidad, 0) INTO v_cantidad_anterior
  FROM stock_actual sa
  WHERE sa.branch_id = v_branch_id AND sa.insumo_id = NEW.insumo_id;

  INSERT INTO stock_actual (branch_id, insumo_id, cantidad, unidad)
  VALUES (v_branch_id, NEW.insumo_id, v_cantidad_base, v_unidad_base)
  ON CONFLICT (branch_id, insumo_id)
  DO UPDATE SET
    cantidad = stock_actual.cantidad + v_cantidad_base,
    updated_at = NOW();

  v_cantidad_nueva := COALESCE(v_cantidad_anterior, 0) + v_cantidad_base;

  INSERT INTO stock_movimientos (
    branch_id, insumo_id, tipo, cantidad,
    cantidad_anterior, cantidad_nueva,
    factura_proveedor_id, motivo
  )
  VALUES (
    v_branch_id, NEW.insumo_id, 'compra', v_cantidad_base,
    COALESCE(v_cantidad_anterior, 0), v_cantidad_nueva,
    NEW.factura_id, 'Compra factura proveedor'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sumar_stock_compra ON items_factura;
CREATE TRIGGER trg_sumar_stock_compra
  AFTER INSERT ON items_factura
  FOR EACH ROW
  WHEN (NEW.insumo_id IS NOT NULL)
  EXECUTE FUNCTION public.sumar_stock_desde_compra();

COMMENT ON FUNCTION public.sumar_stock_desde_compra IS 'Suma stock al cargar ítem de factura con insumo; registra movimiento tipo compra';
