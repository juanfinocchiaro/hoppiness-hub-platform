
-- =============================================
-- 1. tipo_especial already added in failed migration (DDL succeeded)
-- Verify and add if needed
-- =============================================
ALTER TABLE public.proveedores 
  ADD COLUMN IF NOT EXISTS tipo_especial VARCHAR(20) DEFAULT 'normal';

-- =============================================
-- 2. CREAR CATEGORÍA DE INSUMO (tipo 'operativo' para pasar check)
-- =============================================
INSERT INTO public.categorias_insumo (id, nombre, tipo, descripcion, orden, activo)
VALUES ('00000000-0000-0000-0000-000000000010', 'Servicios Marca', 'operativo', 'Canon y marketing de marca', 99, true)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 3. CREAR INSUMOS ESPECIALES PARA CANON
-- =============================================
INSERT INTO public.insumos (id, nombre, categoria_id, unidad_base, categoria_pl, creado_por, activo)
VALUES 
  ('00000000-0000-0000-0000-000000000011', 'Canon Marca (4.5%)', '00000000-0000-0000-0000-000000000010', 'servicio', 'publicidad_marca', 'sistema', true),
  ('00000000-0000-0000-0000-000000000012', 'Marketing Marca (0.5%)', '00000000-0000-0000-0000-000000000010', 'servicio', 'publicidad_marca', 'sistema', true)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 4. CREAR PROVEEDOR ESPECIAL "Hoppiness Club"
-- =============================================
INSERT INTO public.proveedores (
  id, ambito, razon_social, cuit, tipo_especial,
  permite_cuenta_corriente, activo
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'marca',
  'Hoppiness Club',
  'XX-XXXXXXXX-X',
  'canon_marca',
  true,
  true
) ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 5. TRIGGER: GENERAR FACTURA DE CANON AL CARGAR VENTAS
-- =============================================
CREATE OR REPLACE FUNCTION public.generar_factura_canon()
RETURNS TRIGGER AS $$
DECLARE
  canon_monto NUMERIC(12,2);
  marketing_monto NUMERIC(12,2);
  total_canon NUMERIC(12,2);
  v_factura_numero VARCHAR(50);
  v_factura_id UUID;
  v_branch_code TEXT;
BEGIN
  -- Calcular canon (4.5%) + marketing (0.5%) sobre FC
  canon_monto := NEW.fc_total * 0.045;
  marketing_monto := NEW.fc_total * 0.005;
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
    'Canon 4.5%: $' || ROUND(canon_monto) || ' | Marketing 0.5%: $' || ROUND(marketing_monto) || ' | FC: $' || ROUND(NEW.fc_total) || ' | FT: $' || ROUND(NEW.ft_total)
  )
  RETURNING id INTO v_factura_id;

  -- Crear items de factura (detalle)
  INSERT INTO public.items_factura (factura_id, insumo_id, cantidad, unidad, precio_unitario, subtotal, categoria_pl)
  VALUES
    (v_factura_id, '00000000-0000-0000-0000-000000000011', 1, 'servicio', canon_monto, canon_monto, 'publicidad_marca'),
    (v_factura_id, '00000000-0000-0000-0000-000000000012', 1, 'servicio', marketing_monto, marketing_monto, 'publicidad_marca');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS trigger_generar_factura_canon ON public.ventas_mensuales_local;
CREATE TRIGGER trigger_generar_factura_canon
  AFTER INSERT OR UPDATE ON public.ventas_mensuales_local
  FOR EACH ROW
  EXECUTE FUNCTION public.generar_factura_canon();

-- =============================================
-- 6. VISTA: CUENTA CORRIENTE MARCA
-- =============================================
CREATE OR REPLACE VIEW public.cuenta_corriente_marca AS
SELECT 
  f.id,
  f.branch_id,
  b.name AS local_nombre,
  f.periodo,
  f.factura_numero,
  f.factura_fecha,
  f.total AS monto_canon,
  f.saldo_pendiente,
  f.estado_pago,
  f.fecha_vencimiento,
  f.observaciones AS detalle
FROM public.facturas_proveedores f
JOIN public.branches b ON b.id = f.branch_id
WHERE f.proveedor_id = '00000000-0000-0000-0000-000000000001'
  AND f.deleted_at IS NULL
ORDER BY f.periodo DESC, b.name;
