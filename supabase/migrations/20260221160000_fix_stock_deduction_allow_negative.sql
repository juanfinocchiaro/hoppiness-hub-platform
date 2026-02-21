-- Fix: allow stock to go negative on sales, auto-create stock_actual row if missing,
-- and correct cantidad_nueva calculation in stock_movimientos.

CREATE OR REPLACE FUNCTION public.descontar_stock_pedido()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_branch_id UUID;
  v_composicion RECORD;
  v_cantidad_descontar DECIMAL(10,3);
  v_cantidad_anterior DECIMAL(10,3);
  v_cantidad_nueva DECIMAL(10,3);
BEGIN
  SELECT branch_id INTO v_branch_id FROM pedidos WHERE id = NEW.pedido_id;

  FOR v_composicion IN
    SELECT icc.insumo_id, icc.cantidad::DECIMAL(10,3) AS cantidad_receta
    FROM item_carta_composicion icc
    WHERE icc.item_carta_id = NEW.item_carta_id
      AND icc.insumo_id IS NOT NULL
  LOOP
    v_cantidad_descontar := v_composicion.cantidad_receta * NEW.cantidad;

    INSERT INTO stock_actual (branch_id, insumo_id, cantidad, unidad)
    SELECT v_branch_id, v_composicion.insumo_id, 0, COALESCE(i.unidad_base, 'un')
    FROM insumos i WHERE i.id = v_composicion.insumo_id
    ON CONFLICT (branch_id, insumo_id) DO NOTHING;

    SELECT cantidad INTO v_cantidad_anterior
    FROM stock_actual
    WHERE branch_id = v_branch_id AND insumo_id = v_composicion.insumo_id;

    v_cantidad_nueva := v_cantidad_anterior - v_cantidad_descontar;

    UPDATE stock_actual
    SET cantidad = v_cantidad_nueva,
        updated_at = NOW()
    WHERE branch_id = v_branch_id
      AND insumo_id = v_composicion.insumo_id;

    INSERT INTO stock_movimientos (
      branch_id, insumo_id, tipo, cantidad,
      cantidad_anterior, cantidad_nueva, pedido_id
    )
    VALUES (
      v_branch_id,
      v_composicion.insumo_id,
      'venta',
      -v_cantidad_descontar,
      v_cantidad_anterior,
      v_cantidad_nueva,
      NEW.pedido_id
    );
  END LOOP;

  RETURN NEW;
END;
$$;
