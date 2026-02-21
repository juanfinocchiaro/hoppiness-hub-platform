-- Reverse cash_register_movements when an order is cancelled.
-- Creates an expense entry for each income entry linked to the cancelled order.
CREATE OR REPLACE FUNCTION public.reverse_cash_on_order_cancel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_mov RECORD;
BEGIN
  IF NEW.estado <> 'cancelado' OR COALESCE(OLD.estado, '') = 'cancelado' THEN
    RETURN NEW;
  END IF;

  FOR v_mov IN
    SELECT id, shift_id, branch_id, payment_method, amount, recorded_by
    FROM cash_register_movements
    WHERE order_id = NEW.id
      AND type = 'income'
  LOOP
    INSERT INTO cash_register_movements (
      shift_id,
      branch_id,
      type,
      payment_method,
      amount,
      concept,
      order_id,
      recorded_by
    ) VALUES (
      v_mov.shift_id,
      v_mov.branch_id,
      'expense',
      v_mov.payment_method,
      v_mov.amount,
      'Reversion por cancelacion de pedido #' || NEW.numero_pedido,
      NEW.id,
      v_mov.recorded_by
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reverse_cash_on_order_cancel ON public.pedidos;
CREATE TRIGGER trg_reverse_cash_on_order_cancel
AFTER UPDATE OF estado ON public.pedidos
FOR EACH ROW
EXECUTE FUNCTION public.reverse_cash_on_order_cancel();
