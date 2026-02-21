-- =====================================================
-- POS: cancelacion de pedidos + CMV automatico en RDO
-- =====================================================

-- 1) Revertir stock cuando un pedido pasa a cancelado
CREATE OR REPLACE FUNCTION public.reverse_stock_on_order_cancel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_mov RECORD;
  v_prev NUMERIC(12,3);
  v_new NUMERIC(12,3);
  v_unidad TEXT;
  v_qty_restore NUMERIC(12,3);
BEGIN
  IF NEW.estado <> 'cancelado' OR COALESCE(OLD.estado, '') = 'cancelado' THEN
    RETURN NEW;
  END IF;

  FOR v_mov IN
    SELECT id, insumo_id, cantidad
    FROM stock_movimientos
    WHERE pedido_id = NEW.id
      AND tipo = 'venta'
  LOOP
    v_qty_restore := ABS(COALESCE(v_mov.cantidad, 0));
    IF v_qty_restore <= 0 THEN
      CONTINUE;
    END IF;

    SELECT cantidad INTO v_prev
    FROM stock_actual
    WHERE branch_id = NEW.branch_id
      AND insumo_id = v_mov.insumo_id;

    IF v_prev IS NULL THEN
      SELECT COALESCE(unidad_base, 'un') INTO v_unidad
      FROM insumos
      WHERE id = v_mov.insumo_id;

      INSERT INTO stock_actual (branch_id, insumo_id, cantidad, unidad)
      VALUES (NEW.branch_id, v_mov.insumo_id, v_qty_restore, COALESCE(v_unidad, 'un'))
      ON CONFLICT (branch_id, insumo_id) DO UPDATE
      SET cantidad = stock_actual.cantidad + EXCLUDED.cantidad,
          updated_at = now();

      v_prev := 0;
      v_new := v_qty_restore;
    ELSE
      v_new := v_prev + v_qty_restore;
      UPDATE stock_actual
      SET cantidad = v_new,
          updated_at = now()
      WHERE branch_id = NEW.branch_id
        AND insumo_id = v_mov.insumo_id;
    END IF;

    INSERT INTO stock_movimientos (
      branch_id,
      insumo_id,
      tipo,
      cantidad,
      cantidad_anterior,
      cantidad_nueva,
      pedido_id,
      motivo
    ) VALUES (
      NEW.branch_id,
      v_mov.insumo_id,
      'ajuste',
      v_qty_restore,
      v_prev,
      v_new,
      NEW.id,
      'Reversion por cancelacion de pedido'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reverse_stock_on_order_cancel ON public.pedidos;
CREATE TRIGGER trg_reverse_stock_on_order_cancel
AFTER UPDATE OF estado ON public.pedidos
FOR EACH ROW
EXECUTE FUNCTION public.reverse_stock_on_order_cancel();

-- 2) Crear movimiento de RDO automatico por cada consumo de stock en ventas POS
CREATE OR REPLACE FUNCTION public.sync_stock_sale_to_rdo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_rdo_code TEXT;
  v_periodo TEXT;
  v_costo_unit NUMERIC(12,4);
  v_categoria_pl TEXT;
  v_monto NUMERIC(12,2);
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE rdo_movimientos
    SET deleted_at = now()
    WHERE source_table = 'stock_movimientos'
      AND source_id = OLD.id
      AND deleted_at IS NULL;
    RETURN OLD;
  END IF;

  IF NEW.tipo <> 'venta' THEN
    UPDATE rdo_movimientos
    SET deleted_at = now()
    WHERE source_table = 'stock_movimientos'
      AND source_id = NEW.id
      AND deleted_at IS NULL;
    RETURN NEW;
  END IF;

  SELECT COALESCE(i.rdo_category_code, ''), COALESCE(i.costo_por_unidad_base, 0), COALESCE(i.categoria_pl, '')
  INTO v_rdo_code, v_costo_unit, v_categoria_pl
  FROM insumos i
  WHERE i.id = NEW.insumo_id;

  IF v_rdo_code = '' THEN
    v_rdo_code := CASE v_categoria_pl
      WHEN 'materia_prima' THEN 'cmv_hamburguesas'
      WHEN 'descartables' THEN 'descartables_salon'
      WHEN 'limpieza' THEN 'limpieza_higiene'
      WHEN 'mantenimiento' THEN 'mantenimiento'
      WHEN 'marketing' THEN 'marketing'
      ELSE 'cmv_hamburguesas'
    END;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM rdo_categories WHERE code = v_rdo_code) THEN
    RETURN NEW;
  END IF;

  v_monto := ROUND(ABS(COALESCE(NEW.cantidad, 0)) * COALESCE(v_costo_unit, 0), 2);
  IF v_monto <= 0 THEN
    UPDATE rdo_movimientos
    SET deleted_at = now()
    WHERE source_table = 'stock_movimientos'
      AND source_id = NEW.id
      AND deleted_at IS NULL;
    RETURN NEW;
  END IF;

  v_periodo := to_char((COALESCE(NEW.created_at, now()) AT TIME ZONE 'America/Argentina/Cordoba'), 'YYYY-MM');

  DELETE FROM rdo_movimientos
  WHERE source_table = 'stock_movimientos'
    AND source_id = NEW.id
    AND deleted_at IS NULL;

  INSERT INTO rdo_movimientos (
    branch_id,
    periodo,
    rdo_category_code,
    origen,
    monto,
    descripcion,
    source_table,
    source_id,
    created_by
  ) VALUES (
    NEW.branch_id,
    v_periodo,
    v_rdo_code,
    'consumo_inventario',
    v_monto,
    COALESCE(NEW.motivo, 'Consumo automatico por venta POS'),
    'stock_movimientos',
    NEW.id,
    NEW.created_by
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_stock_sale_rdo ON public.stock_movimientos;
CREATE TRIGGER trg_sync_stock_sale_rdo
AFTER INSERT OR UPDATE OR DELETE ON public.stock_movimientos
FOR EACH ROW
EXECUTE FUNCTION public.sync_stock_sale_to_rdo();
