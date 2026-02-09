
-- ============================================
-- 1. Refactor ventas_mensuales_local: Add venta_total and efectivo columns
-- ============================================
ALTER TABLE public.ventas_mensuales_local
  ADD COLUMN venta_total numeric(12,2),
  ADD COLUMN efectivo numeric(12,2);

-- Backfill: venta_total = fc_total + ft_total, efectivo defaults to 0
UPDATE public.ventas_mensuales_local 
SET venta_total = fc_total + ft_total, efectivo = 0
WHERE venta_total IS NULL;

-- 2. Add verification columns to pagos_canon
ALTER TABLE public.pagos_canon
  ADD COLUMN verificado boolean NOT NULL DEFAULT false,
  ADD COLUMN verificado_por uuid,
  ADD COLUMN verificado_at timestamptz,
  ADD COLUMN verificado_notas text;

-- Update the trigger function to use venta_total for canon calculation
-- Canon is calculated on FC (facturación contable = venta_total - efectivo... no, FC stays as-is)
-- Actually the user wants: venta_total (total sales) and efectivo (cash portion)
-- FC = venta_total - efectivo (digital/contable), FT = efectivo
-- But let's keep fc_total and ft_total populated for backward compat with canon trigger

-- Replace the trigger function to accept new fields
CREATE OR REPLACE FUNCTION public.generar_factura_canon()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  canon_monto NUMERIC(12,2);
  marketing_monto NUMERIC(12,2);
  total_canon NUMERIC(12,2);
  v_factura_numero VARCHAR(50);
  v_factura_id UUID;
  v_branch_code TEXT;
  v_fc NUMERIC(12,2);
BEGIN
  -- FC is the base for canon calculation
  v_fc := COALESCE(NEW.fc_total, 0);
  
  -- Calcular canon (4.5%) + marketing (0.5%) sobre FC
  canon_monto := v_fc * 0.045;
  marketing_monto := v_fc * 0.005;
  total_canon := canon_monto + marketing_monto;

  -- Si el total es 0, no crear factura
  IF total_canon <= 0 THEN
    RETURN NEW;
  END IF;

  -- Obtener código de sucursal para número de factura
  SELECT COALESCE(slug, LEFT(id::text, 4)) INTO v_branch_code 
  FROM branches WHERE id = NEW.branch_id;

  -- Generar número de factura único
  v_factura_numero := 'CANON-' || NEW.periodo || '-' || UPPER(COALESCE(v_branch_code, 'XX'));

  -- Borrar factura anterior si existe (para re-carga de ventas)
  DELETE FROM public.facturas_proveedores 
  WHERE proveedor_id = '00000000-0000-0000-0000-000000000001'
    AND branch_id = NEW.branch_id
    AND periodo = NEW.periodo;

  -- Crear factura de proveedor "Hoppiness Club"
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
    'Canon 4.5%: $' || ROUND(canon_monto) || ' | Marketing 0.5%: $' || ROUND(marketing_monto) || ' | VT: $' || ROUND(COALESCE(NEW.venta_total, 0)) || ' | Ef: $' || ROUND(COALESCE(NEW.efectivo, 0))
  )
  RETURNING id INTO v_factura_id;

  -- Crear items de factura (detalle)
  INSERT INTO public.items_factura (factura_id, insumo_id, cantidad, unidad, precio_unitario, subtotal, categoria_pl)
  VALUES
    (v_factura_id, '00000000-0000-0000-0000-000000000011', 1, 'servicio', canon_monto, canon_monto, 'publicidad_marca'),
    (v_factura_id, '00000000-0000-0000-0000-000000000012', 1, 'servicio', marketing_monto, marketing_monto, 'publicidad_marca');

  RETURN NEW;
END;
$$;
