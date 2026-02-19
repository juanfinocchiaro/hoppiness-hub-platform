
-- ============================================================
-- AFIP Integration: 3 tables + RLS + trigger
-- ============================================================

-- 1. afip_config: Configuración AFIP por sucursal
CREATE TABLE public.afip_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  cuit TEXT,
  razon_social TEXT,
  direccion_fiscal TEXT,
  inicio_actividades DATE,
  punto_venta INTEGER,
  certificado_crt TEXT,        -- PEM del certificado
  clave_privada_enc TEXT,      -- Clave privada encriptada con AFIP_ENCRYPTION_KEY
  estado_conexion TEXT NOT NULL DEFAULT 'sin_configurar', -- sin_configurar | conectado | error
  ultimo_error TEXT,
  ultima_verificacion TIMESTAMPTZ,
  ultimo_nro_factura_a BIGINT DEFAULT 0,
  ultimo_nro_factura_b BIGINT DEFAULT 0,
  ultimo_nro_factura_c BIGINT DEFAULT 0,
  es_produccion BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (branch_id)
);

ALTER TABLE public.afip_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "superadmin_full_afip_config" ON public.afip_config
  FOR ALL USING (is_superadmin(auth.uid()));

CREATE POLICY "franquiciado_afip_config" ON public.afip_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_branch_roles
      WHERE user_id = auth.uid()
        AND branch_id = afip_config.branch_id
        AND local_role = 'franquiciado'
        AND is_active = true
    )
  );

CREATE TRIGGER update_afip_config_updated_at
  BEFORE UPDATE ON public.afip_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_roles_v2_updated_at();

-- 2. facturas_emitidas: Log de facturas
CREATE TABLE public.facturas_emitidas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  pedido_id UUID REFERENCES public.pedidos(id) ON DELETE SET NULL,
  tipo_comprobante TEXT NOT NULL,   -- 'A', 'B', 'C'
  punto_venta INTEGER NOT NULL,
  numero_comprobante BIGINT NOT NULL,
  cae TEXT,
  cae_vencimiento DATE,
  fecha_emision DATE NOT NULL DEFAULT CURRENT_DATE,
  receptor_cuit TEXT,
  receptor_razon_social TEXT,
  receptor_condicion_iva TEXT,
  neto NUMERIC(12,2) NOT NULL DEFAULT 0,
  iva NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  moneda TEXT NOT NULL DEFAULT 'PES',
  afip_request JSONB,
  afip_response JSONB,
  emitido_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (branch_id, tipo_comprobante, punto_venta, numero_comprobante)
);

ALTER TABLE public.facturas_emitidas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "branch_access_facturas" ON public.facturas_emitidas
  FOR SELECT USING (can_access_branch(auth.uid(), branch_id));

CREATE POLICY "superadmin_all_facturas" ON public.facturas_emitidas
  FOR ALL USING (is_superadmin(auth.uid()));

CREATE POLICY "franquiciado_insert_facturas" ON public.facturas_emitidas
  FOR INSERT WITH CHECK (
    can_access_branch(auth.uid(), branch_id)
  );

-- 3. afip_errores_log: Log de errores
CREATE TABLE public.afip_errores_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  tipo_error TEXT NOT NULL,
  codigo_afip TEXT,
  mensaje TEXT,
  request_data JSONB,
  response_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.afip_errores_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "superadmin_errores" ON public.afip_errores_log
  FOR ALL USING (is_superadmin(auth.uid()));

CREATE POLICY "branch_manager_errores" ON public.afip_errores_log
  FOR SELECT USING (
    is_branch_manager_v2(auth.uid(), branch_id)
  );

-- Indexes
CREATE INDEX idx_facturas_emitidas_branch_fecha ON public.facturas_emitidas(branch_id, fecha_emision);
CREATE INDEX idx_afip_errores_branch ON public.afip_errores_log(branch_id, created_at DESC);
