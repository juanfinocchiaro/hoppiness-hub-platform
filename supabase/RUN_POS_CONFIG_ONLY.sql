-- =============================================
-- MÍNIMO para habilitar el toggle POS
-- Ejecutá en Supabase Dashboard > SQL Editor
-- =============================================

CREATE TABLE IF NOT EXISTS public.pos_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL UNIQUE REFERENCES branches(id) ON DELETE CASCADE,
  impresora_caja_ip VARCHAR(15),
  impresora_cocina_ip VARCHAR(15),
  tiempo_preparacion_default INTEGER DEFAULT 15,
  llamadores_habilitados BOOLEAN DEFAULT TRUE,
  llamador_min INTEGER DEFAULT 1,
  llamador_max INTEGER DEFAULT 50,
  acepta_efectivo BOOLEAN DEFAULT TRUE,
  acepta_debito BOOLEAN DEFAULT TRUE,
  acepta_credito BOOLEAN DEFAULT TRUE,
  acepta_mercadopago BOOLEAN DEFAULT TRUE,
  acepta_transferencia BOOLEAN DEFAULT TRUE,
  delivery_habilitado BOOLEAN DEFAULT TRUE,
  costo_delivery_default DECIMAL(10,2) DEFAULT 0,
  radio_delivery_km DECIMAL(5,2),
  facturacion_habilitada BOOLEAN DEFAULT TRUE,
  afip_punto_venta INTEGER,
  afip_cuit VARCHAR(13),
  alertar_stock_minimo BOOLEAN DEFAULT TRUE,
  alertar_stock_critico BOOLEAN DEFAULT TRUE,
  pos_enabled BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pos_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can manage pos_config" ON pos_config;
CREATE POLICY "Staff can manage pos_config" ON pos_config FOR ALL
  USING (public.has_branch_access_v2(auth.uid(), branch_id) OR public.is_superadmin(auth.uid()))
  WITH CHECK (public.has_branch_access_v2(auth.uid(), branch_id) OR public.is_superadmin(auth.uid()));
