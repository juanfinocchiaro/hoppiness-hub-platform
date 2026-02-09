
-- =============================================
-- TABLA: conceptos_servicio (conceptos abstractos/servicios)
-- =============================================
CREATE TABLE public.conceptos_servicio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(200) NOT NULL,
  descripcion TEXT,
  categoria_gasto VARCHAR(50),
  subcategoria VARCHAR(100),
  tipo VARCHAR(30) NOT NULL DEFAULT 'otro',
  es_calculado BOOLEAN DEFAULT FALSE,
  formula_calculo JSONB,
  proveedor_id UUID REFERENCES public.proveedores(id),
  periodicidad VARCHAR(20),
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- RLS
ALTER TABLE public.conceptos_servicio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins full access conceptos_servicio"
  ON public.conceptos_servicio FOR ALL
  TO authenticated
  USING (public.is_superadmin(auth.uid()));

CREATE POLICY "Authenticated users can read active conceptos_servicio"
  ON public.conceptos_servicio FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL AND activo = TRUE);

-- =============================================
-- ALTER items_factura: add tipo_item + concepto_servicio_id
-- =============================================
ALTER TABLE public.items_factura
  ADD COLUMN tipo_item VARCHAR(20) NOT NULL DEFAULT 'insumo',
  ADD COLUMN concepto_servicio_id UUID REFERENCES public.conceptos_servicio(id);

ALTER TABLE public.items_factura
  ALTER COLUMN insumo_id DROP NOT NULL;

ALTER TABLE public.items_factura
  ALTER COLUMN cantidad SET DEFAULT 1,
  ALTER COLUMN unidad DROP NOT NULL;

-- Validation trigger
CREATE OR REPLACE FUNCTION public.validate_item_factura_tipo()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.tipo_item = 'insumo' THEN
    IF NEW.insumo_id IS NULL THEN
      RAISE EXCEPTION 'insumo_id is required when tipo_item = insumo';
    END IF;
    IF NEW.concepto_servicio_id IS NOT NULL THEN
      RAISE EXCEPTION 'concepto_servicio_id must be NULL when tipo_item = insumo';
    END IF;
  ELSIF NEW.tipo_item = 'servicio' THEN
    IF NEW.concepto_servicio_id IS NULL THEN
      RAISE EXCEPTION 'concepto_servicio_id is required when tipo_item = servicio';
    END IF;
    IF NEW.insumo_id IS NOT NULL THEN
      RAISE EXCEPTION 'insumo_id must be NULL when tipo_item = servicio';
    END IF;
  ELSE
    RAISE EXCEPTION 'tipo_item must be insumo or servicio';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_item_tipo
  BEFORE INSERT OR UPDATE ON public.items_factura
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_item_factura_tipo();

-- Indices
CREATE INDEX idx_items_factura_tipo ON public.items_factura(tipo_item);
CREATE INDEX idx_items_factura_concepto ON public.items_factura(concepto_servicio_id) WHERE concepto_servicio_id IS NOT NULL;
CREATE INDEX idx_conceptos_servicio_tipo ON public.conceptos_servicio(tipo);

-- =============================================
-- SEED: Conceptos de servicio comunes
-- =============================================
INSERT INTO public.conceptos_servicio (nombre, descripcion, categoria_gasto, subcategoria, tipo, periodicidad, es_calculado, formula_calculo) VALUES
  ('Canon Marca 4.5%', 'Canon de franquicia sobre facturación contable', 'publicidad_marca', 'fee_marca', 'canon_marca', 'mensual', TRUE, '{"tipo": "porcentaje_ventas", "porcentaje": 4.5, "base": "fc_total"}'),
  ('Marketing Marca 0.5%', 'Contribución al fondo de marketing', 'publicidad_marca', 'marketing', 'canon_marca', 'mensual', TRUE, '{"tipo": "porcentaje_ventas", "porcentaje": 0.5, "base": "fc_total"}'),
  ('Energía Eléctrica EPEC', 'Servicio de energía eléctrica', 'servicios_infraestructura', 'energia_electrica', 'servicio_publico', 'mensual', FALSE, NULL),
  ('Gas Natural ECOGAS', 'Servicio de gas natural', 'servicios_infraestructura', 'gas_natural', 'servicio_publico', 'mensual', FALSE, NULL),
  ('Internet', 'Servicio de internet', 'servicios_infraestructura', 'internet', 'servicio_publico', 'mensual', FALSE, NULL),
  ('Alquiler Local', 'Alquiler mensual del local', 'servicios_infraestructura', 'alquiler', 'alquiler', 'mensual', FALSE, NULL),
  ('Gastos Comunes / Expensas', 'Expensas del local', 'servicios_infraestructura', 'gastos_comunes', 'alquiler', 'mensual', FALSE, NULL),
  ('Honorarios Contador', 'Servicios contables mensuales', 'admin_gestion', 'contador', 'servicio_profesional', 'mensual', FALSE, NULL),
  ('Honorarios Bromatóloga', 'Asesoramiento bromatológico', 'admin_gestion', 'bromatologia', 'servicio_profesional', 'mensual', FALSE, NULL),
  ('Software Gestión', 'Sistema de gestión / software', 'admin_gestion', 'software', 'servicio_profesional', 'mensual', FALSE, NULL);
