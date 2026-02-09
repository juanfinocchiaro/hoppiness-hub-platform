
-- Fix canon trigger to calculate on venta_total instead of FC
CREATE OR REPLACE FUNCTION public.generar_factura_canon()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  canon_monto NUMERIC(12,2);
  marketing_monto NUMERIC(12,2);
  total_canon NUMERIC(12,2);
  v_factura_id UUID;
  v_branch_code TEXT;
  v_vt NUMERIC(12,2);
  v_ef NUMERIC(12,2);
  v_online NUMERIC(12,2);
  v_factura_numero VARCHAR(50);
BEGIN
  v_vt := COALESCE(NEW.venta_total, 0);
  v_ef := COALESCE(NEW.efectivo, 0);
  v_online := v_vt - v_ef;

  IF v_vt <= 0 THEN
    RETURN NEW;
  END IF;

  -- 4.5% uso de marca + 0.5% marketing sobre VENTA TOTAL
  canon_monto := v_vt * 0.045;
  marketing_monto := v_vt * 0.005;
  total_canon := canon_monto + marketing_monto;

  SELECT COALESCE(slug, LEFT(id::text, 4)) INTO v_branch_code 
  FROM branches WHERE id = NEW.branch_id;

  v_factura_numero := 'CANON-' || NEW.periodo || '-' || UPPER(COALESCE(v_branch_code, 'XX'));

  -- Delete previous canon invoice if exists
  DELETE FROM public.facturas_proveedores 
  WHERE proveedor_id = '00000000-0000-0000-0000-000000000001'
    AND branch_id = NEW.branch_id
    AND periodo = NEW.periodo;

  INSERT INTO public.facturas_proveedores (
    id, branch_id, proveedor_id, factura_tipo, factura_numero,
    factura_fecha, subtotal, total, condicion_pago,
    fecha_vencimiento, estado_pago, saldo_pendiente,
    periodo, tipo, observaciones
  ) VALUES (
    gen_random_uuid(),
    NEW.branch_id,
    '00000000-0000-0000-0000-000000000001',
    'C',
    v_factura_numero,
    (DATE_TRUNC('month', (NEW.periodo || '-01')::date) + INTERVAL '1 month' - INTERVAL '1 day')::date,
    total_canon,
    total_canon,
    'cuenta_corriente',
    (DATE_TRUNC('month', (NEW.periodo || '-01')::date) + INTERVAL '1 month' + INTERVAL '10 days')::date,
    'pendiente',
    total_canon,
    NEW.periodo,
    'normal',
    'Canon 4.5%: $' || ROUND(canon_monto) || ' | Mktg 0.5%: $' || ROUND(marketing_monto) || ' | VT: $' || ROUND(v_vt) || ' | Ef: $' || ROUND(v_ef) || ' | Online: $' || ROUND(v_online)
  )
  RETURNING id INTO v_factura_id;

  INSERT INTO public.items_factura (factura_id, insumo_id, cantidad, unidad, precio_unitario, subtotal, categoria_pl)
  VALUES
    (v_factura_id, '00000000-0000-0000-0000-000000000011', 1, 'servicio', canon_monto, canon_monto, 'publicidad_marca'),
    (v_factura_id, '00000000-0000-0000-0000-000000000012', 1, 'servicio', marketing_monto, marketing_monto, 'publicidad_marca');

  RETURN NEW;
END;
$$;
