-- =============================================================
-- Migration: contract_type + pagos parciales multi-factura + RPC insert_factura_completa
-- Date: 2026-02-17
-- =============================================================

-- 0) Fix: restore anon read policy on branches (dropped in migration 20260203175541)
-- Without this, the branches_public view returns 0 rows for unauthenticated users,
-- breaking the Contact page's branch selector.
CREATE POLICY "branches_anon_read" ON branches FOR SELECT TO anon
  USING (is_active = true AND public_status IN ('active', 'coming_soon'));

-- 1) Add registered_hours column to employee_data
-- Stores the number of hours "en blanco" (registered). NULL = not set.
ALTER TABLE employee_data
  ADD COLUMN IF NOT EXISTS registered_hours integer DEFAULT NULL;

COMMENT ON COLUMN employee_data.registered_hours
  IS 'Horas mensuales registradas en blanco. 60 = mínimo legal, 190 = jornada completa, NULL = no definido.';

-- 2) Make factura_id nullable on pagos_proveedores (to support multi-invoice payments)
ALTER TABLE pagos_proveedores
  ALTER COLUMN factura_id DROP NOT NULL;

-- 3) Update medio_pago check to include new payment types
-- First drop existing constraint if any, then add the new one
ALTER TABLE pagos_proveedores
  DROP CONSTRAINT IF EXISTS pagos_proveedores_medio_pago_check;

ALTER TABLE pagos_proveedores
  ADD COLUMN IF NOT EXISTS fecha_vencimiento_pago date;

COMMENT ON COLUMN pagos_proveedores.fecha_vencimiento_pago
  IS 'Fecha de vencimiento para cheque/echeq con plazo';

-- 4) Junction table: a single payment can apply to multiple invoices
CREATE TABLE IF NOT EXISTS pago_factura (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pago_id uuid NOT NULL REFERENCES pagos_proveedores(id) ON DELETE CASCADE,
  factura_id uuid NOT NULL REFERENCES facturas_proveedores(id) ON DELETE CASCADE,
  monto_aplicado numeric(12,2) NOT NULL CHECK (monto_aplicado > 0),
  UNIQUE(pago_id, factura_id)
);

-- 5) RLS for pago_factura
ALTER TABLE pago_factura ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pago_factura_select" ON pago_factura
  FOR SELECT USING (true);

CREATE POLICY "pago_factura_insert" ON pago_factura
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "pago_factura_delete" ON pago_factura
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- 6) Transactional RPC: insert factura + items atomically
CREATE OR REPLACE FUNCTION insert_factura_completa(
  p_factura jsonb,
  p_items jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_factura_id uuid;
  v_item jsonb;
BEGIN
  -- Insert the factura header
  INSERT INTO facturas_proveedores (
    branch_id, proveedor_id, factura_tipo, factura_numero,
    factura_fecha, subtotal, iva, otros_impuestos, total,
    condicion_pago, fecha_vencimiento, estado_pago, saldo_pendiente,
    tipo, motivo_extraordinaria, periodo, observaciones, created_by,
    subtotal_bruto, total_descuentos, subtotal_neto,
    imp_internos, iva_21, iva_105, perc_iva, perc_provincial, perc_municipal,
    total_factura
  )
  SELECT
    (p_factura->>'branch_id')::uuid,
    (p_factura->>'proveedor_id')::uuid,
    p_factura->>'factura_tipo',
    p_factura->>'factura_numero',
    (p_factura->>'factura_fecha')::date,
    (p_factura->>'subtotal')::numeric,
    COALESCE((p_factura->>'iva')::numeric, 0),
    COALESCE((p_factura->>'otros_impuestos')::numeric, 0),
    (p_factura->>'total')::numeric,
    p_factura->>'condicion_pago',
    (p_factura->>'fecha_vencimiento')::date,
    p_factura->>'estado_pago',
    (p_factura->>'saldo_pendiente')::numeric,
    COALESCE(p_factura->>'tipo', 'normal'),
    p_factura->>'motivo_extraordinaria',
    p_factura->>'periodo',
    p_factura->>'observaciones',
    (p_factura->>'created_by')::uuid,
    (p_factura->>'subtotal_bruto')::numeric,
    COALESCE((p_factura->>'total_descuentos')::numeric, 0),
    (p_factura->>'subtotal_neto')::numeric,
    COALESCE((p_factura->>'imp_internos')::numeric, 0),
    COALESCE((p_factura->>'iva_21')::numeric, 0),
    COALESCE((p_factura->>'iva_105')::numeric, 0),
    COALESCE((p_factura->>'perc_iva')::numeric, 0),
    COALESCE((p_factura->>'perc_provincial')::numeric, 0),
    COALESCE((p_factura->>'perc_municipal')::numeric, 0),
    (p_factura->>'total_factura')::numeric
  RETURNING id INTO v_factura_id;

  -- Insert each item linked to the new factura
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO items_factura (
      factura_id, tipo_item, insumo_id, concepto_servicio_id,
      cantidad, unidad, precio_unitario, subtotal,
      afecta_costo_base, categoria_pl, alicuota_iva, iva_monto,
      precio_unitario_bruto
    ) VALUES (
      v_factura_id,
      COALESCE(v_item->>'tipo_item', 'insumo'),
      (v_item->>'insumo_id')::uuid,
      (v_item->>'concepto_servicio_id')::uuid,
      (v_item->>'cantidad')::numeric,
      v_item->>'unidad',
      (v_item->>'precio_unitario')::numeric,
      (v_item->>'subtotal')::numeric,
      COALESCE((v_item->>'afecta_costo_base')::boolean, true),
      v_item->>'categoria_pl',
      (v_item->>'alicuota_iva')::numeric,
      (v_item->>'iva_monto')::numeric,
      (v_item->>'precio_unitario_bruto')::numeric
    );
  END LOOP;

  RETURN v_factura_id;
END;
$$;
