
-- =============================================
-- MIGRACIÓN 3: TRIGGERS, FUNCIONES Y VISTAS (RETRY)
-- =============================================

-- Triggers de Migración 3 que YA se crearon exitosamente antes del error:
-- calc_porcentaje_ft, calc_canon, actualizar_saldo_compra, actualizar_saldo_canon, validar_periodo_abierto
-- ya existen, así que solo creamos lo que faltó.

-- =============================================
-- TRIGGER: Check porcentajes socios (CORREGIDO)
-- =============================================
CREATE OR REPLACE FUNCTION check_porcentajes_suman_100()
RETURNS TRIGGER AS $$
DECLARE
  total_porcentaje NUMERIC(5,2);
BEGIN
  SELECT SUM(porcentaje_participacion) INTO total_porcentaje
  FROM socios
  WHERE branch_id = NEW.branch_id
    AND activo = TRUE
    AND deleted_at IS NULL;

  IF total_porcentaje IS NOT NULL AND total_porcentaje > 100 THEN
    RAISE EXCEPTION 'La suma de participaciones supera 100%% (actual: %)', total_porcentaje;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_check_porcentajes
  AFTER INSERT OR UPDATE OF porcentaje_participacion, activo
  ON socios
  FOR EACH ROW
  WHEN (NEW.activo = TRUE AND NEW.deleted_at IS NULL)
  EXECUTE FUNCTION check_porcentajes_suman_100();

-- =============================================
-- TRIGGER: Calcular saldo acumulado socio
-- =============================================
CREATE OR REPLACE FUNCTION calcular_saldo_socio()
RETURNS TRIGGER AS $$
DECLARE
  saldo_anterior NUMERIC(12,2);
BEGIN
  SELECT COALESCE(saldo_acumulado, 0) INTO saldo_anterior
  FROM movimientos_socio
  WHERE socio_id = NEW.socio_id
    AND deleted_at IS NULL
    AND (fecha < NEW.fecha OR (fecha = NEW.fecha AND created_at < NEW.created_at))
  ORDER BY fecha DESC, created_at DESC
  LIMIT 1;

  IF saldo_anterior IS NULL THEN saldo_anterior = 0; END IF;

  NEW.saldo_acumulado = saldo_anterior + NEW.monto;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER calc_saldo_socio
  BEFORE INSERT ON movimientos_socio
  FOR EACH ROW EXECUTE FUNCTION calcular_saldo_socio();

-- =============================================
-- TRIGGER: Procesar distribución de utilidades
-- =============================================
CREATE OR REPLACE FUNCTION procesar_distribucion_utilidades()
RETURNS TRIGGER AS $$
DECLARE
  dist JSONB;
BEGIN
  IF NEW.procesado = TRUE AND OLD.procesado = FALSE THEN
    FOR dist IN SELECT * FROM jsonb_array_elements(NEW.distribuciones) LOOP
      INSERT INTO movimientos_socio (
        socio_id, branch_id, tipo, fecha, monto,
        periodo, resultado_periodo, detalle, created_by
      ) VALUES (
        (dist->>'socio_id')::UUID,
        NEW.branch_id,
        'distribucion_utilidades',
        NEW.fecha_distribucion,
        (dist->>'monto')::NUMERIC,
        NEW.periodo,
        NEW.resultado_neto,
        jsonb_build_object(
          'porcentaje', dist->>'porcentaje',
          'reserva_legal', NEW.reserva_legal,
          'monto_distribuible', NEW.monto_distribuible
        ),
        NEW.created_by
      );
    END LOOP;

    NEW.fecha_proceso = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER procesar_dist_util
  BEFORE UPDATE OF procesado
  ON distribuciones_utilidades
  FOR EACH ROW EXECUTE FUNCTION procesar_distribucion_utilidades();

-- =============================================
-- TRIGGER: Auditoría financiera (genérica)
-- =============================================
CREATE OR REPLACE FUNCTION audit_financial_changes()
RETURNS TRIGGER AS $$
DECLARE
  campos_mod TEXT[];
  key TEXT;
  old_json JSONB;
  new_json JSONB;
BEGIN
  old_json = CASE WHEN TG_OP != 'INSERT' THEN row_to_json(OLD)::jsonb ELSE NULL END;
  new_json = CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW)::jsonb ELSE NULL END;

  IF TG_OP = 'UPDATE' THEN
    campos_mod = ARRAY[]::TEXT[];
    FOR key IN SELECT jsonb_object_keys(new_json) LOOP
      IF old_json->key IS DISTINCT FROM new_json->key THEN
        campos_mod = array_append(campos_mod, key);
      END IF;
    END LOOP;
  END IF;

  INSERT INTO financial_audit_log (
    tabla, registro_id, operacion,
    datos_antes, datos_despues, campos_modificados,
    usuario_id, usuario_email
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    old_json, new_json, campos_mod,
    auth.uid(), auth.email()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Apply audit triggers to all financial tables
CREATE TRIGGER audit_compras AFTER INSERT OR UPDATE OR DELETE ON compras FOR EACH ROW EXECUTE FUNCTION audit_financial_changes();
CREATE TRIGGER audit_gastos AFTER INSERT OR UPDATE OR DELETE ON gastos FOR EACH ROW EXECUTE FUNCTION audit_financial_changes();
CREATE TRIGGER audit_pagos_proveedores AFTER INSERT OR UPDATE OR DELETE ON pagos_proveedores FOR EACH ROW EXECUTE FUNCTION audit_financial_changes();
CREATE TRIGGER audit_socios AFTER INSERT OR UPDATE OR DELETE ON socios FOR EACH ROW EXECUTE FUNCTION audit_financial_changes();
CREATE TRIGGER audit_movimientos_socio AFTER INSERT OR UPDATE OR DELETE ON movimientos_socio FOR EACH ROW EXECUTE FUNCTION audit_financial_changes();
CREATE TRIGGER audit_consumos AFTER INSERT OR UPDATE OR DELETE ON consumos_manuales FOR EACH ROW EXECUTE FUNCTION audit_financial_changes();
CREATE TRIGGER audit_canon AFTER INSERT OR UPDATE OR DELETE ON canon_liquidaciones FOR EACH ROW EXECUTE FUNCTION audit_financial_changes();
CREATE TRIGGER audit_ventas AFTER INSERT OR UPDATE OR DELETE ON ventas_mensuales_local FOR EACH ROW EXECUTE FUNCTION audit_financial_changes();

-- =============================================
-- FUNCIÓN HELPER: get_iibb_alicuota
-- =============================================
CREATE OR REPLACE FUNCTION get_iibb_alicuota(_branch_id UUID, _fecha DATE DEFAULT CURRENT_DATE)
RETURNS NUMERIC AS $$
  SELECT iibb_alicuota FROM configuracion_impuestos
  WHERE branch_id = _branch_id
    AND vigencia_desde <= _fecha
    AND (vigencia_hasta IS NULL OR vigencia_hasta >= _fecha)
    AND deleted_at IS NULL
  ORDER BY vigencia_desde DESC
  LIMIT 1;
$$ LANGUAGE sql STABLE SET search_path = public;

-- =============================================
-- VISTA: Precio promedio ponderado del mes
-- =============================================
CREATE OR REPLACE VIEW precio_promedio_mes AS
SELECT
  c.insumo_id,
  i.nombre as insumo_nombre,
  c.branch_id,
  b.name as branch_nombre,
  c.periodo,
  SUM(c.cantidad * c.precio_unitario) / NULLIF(SUM(c.cantidad), 0) as precio_promedio,
  (SELECT c2.precio_unitario FROM compras c2
   WHERE c2.insumo_id = c.insumo_id AND c2.branch_id = c.branch_id
     AND c2.tipo_compra = 'normal' AND c2.cantidad > 0 AND c2.deleted_at IS NULL
   ORDER BY c2.fecha DESC, c2.created_at DESC LIMIT 1) as precio_ultimo,
  COUNT(*) as cantidad_compras,
  SUM(c.cantidad) as cantidad_total,
  MIN(c.precio_unitario) as precio_minimo,
  MAX(c.precio_unitario) as precio_maximo,
  MAX(c.fecha) as fecha_ultima_compra
FROM compras c
JOIN insumos i ON i.id = c.insumo_id
JOIN branches b ON b.id = c.branch_id
WHERE c.tipo_compra = 'normal' AND c.cantidad > 0 AND c.deleted_at IS NULL
GROUP BY c.insumo_id, i.nombre, c.branch_id, b.name, c.periodo;

-- =============================================
-- VISTA: Cuenta corriente de proveedores
-- =============================================
CREATE OR REPLACE VIEW cuenta_corriente_proveedores AS
SELECT
  p.id as proveedor_id,
  p.razon_social,
  c.branch_id,
  b.name as branch_nombre,
  COUNT(c.id) as cantidad_facturas,
  SUM(c.subtotal) as total_facturado,
  SUM(c.saldo_pendiente) as saldo_pendiente,
  SUM(c.subtotal) - SUM(c.saldo_pendiente) as total_pagado,
  COUNT(*) FILTER (WHERE c.estado_pago = 'vencido') as facturas_vencidas,
  COUNT(*) FILTER (WHERE c.estado_pago = 'pendiente') as facturas_pendientes,
  MIN(c.fecha_vencimiento) FILTER (WHERE c.estado_pago IN ('pendiente', 'vencido')) as proximo_vencimiento,
  MAX(c.fecha) as ultima_compra
FROM proveedores p
JOIN compras c ON c.proveedor_id = p.id AND c.deleted_at IS NULL
JOIN branches b ON b.id = c.branch_id
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.razon_social, c.branch_id, b.name;

-- =============================================
-- VISTA: Balance de socios
-- =============================================
CREATE OR REPLACE VIEW balance_socios AS
SELECT
  s.id as socio_id,
  s.nombre,
  s.branch_id,
  b.name as branch_nombre,
  s.porcentaje_participacion,
  COUNT(m.id) as cantidad_movimientos,
  COALESCE(SUM(m.monto) FILTER (WHERE m.tipo = 'aporte_capital'), 0) as total_aportes,
  COALESCE(SUM(m.monto) FILTER (WHERE m.tipo = 'prestamo_socio'), 0) as total_prestamos_dados,
  COALESCE(SUM(m.monto) FILTER (WHERE m.tipo = 'devolucion_prestamo'), 0) as total_devoluciones,
  COALESCE(SUM(m.monto) FILTER (WHERE m.tipo = 'distribucion_utilidades'), 0) as total_utilidades,
  COALESCE(SUM(m.monto) FILTER (WHERE m.tipo IN ('retiro_anticipado', 'retiro_utilidades')), 0) as total_retiros,
  (SELECT saldo_acumulado FROM movimientos_socio
   WHERE socio_id = s.id AND deleted_at IS NULL
   ORDER BY fecha DESC, created_at DESC LIMIT 1) as saldo_actual
FROM socios s
JOIN branches b ON b.id = s.branch_id
LEFT JOIN movimientos_socio m ON m.socio_id = s.id AND m.deleted_at IS NULL
WHERE s.deleted_at IS NULL AND s.activo = TRUE
GROUP BY s.id, s.nombre, s.branch_id, b.name, s.porcentaje_participacion;
