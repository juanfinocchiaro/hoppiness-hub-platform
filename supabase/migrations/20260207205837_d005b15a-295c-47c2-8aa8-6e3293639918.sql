-- =============================================================================
-- SISTEMA DE SUPERVISIONES DE SUCURSALES (Coordinadores)
-- =============================================================================

-- 1. Tabla de templates de inspección (ítems del checklist)
CREATE TABLE public.inspection_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inspection_type TEXT NOT NULL CHECK (inspection_type IN ('boh', 'foh')),
  category TEXT NOT NULL,
  item_key TEXT NOT NULL,
  item_label TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(inspection_type, item_key)
);

-- 2. Tabla principal de inspecciones
CREATE TABLE public.branch_inspections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  inspection_type TEXT NOT NULL CHECK (inspection_type IN ('boh', 'foh')),
  inspector_id UUID NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'en_curso' CHECK (status IN ('en_curso', 'completada', 'cancelada')),
  score_total INT CHECK (score_total >= 0 AND score_total <= 100),
  present_manager_id UUID,
  general_notes TEXT,
  critical_findings TEXT,
  action_items JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Tabla de ítems de inspección (resultados del checklist)
CREATE TABLE public.inspection_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inspection_id UUID NOT NULL REFERENCES public.branch_inspections(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  item_key TEXT NOT NULL,
  item_label TEXT NOT NULL,
  complies BOOLEAN, -- NULL = N/A
  observations TEXT,
  photo_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(inspection_id, item_key)
);

-- =============================================================================
-- ÍNDICES
-- =============================================================================

CREATE INDEX idx_branch_inspections_branch_id ON public.branch_inspections(branch_id);
CREATE INDEX idx_branch_inspections_inspector_id ON public.branch_inspections(inspector_id);
CREATE INDEX idx_branch_inspections_status ON public.branch_inspections(status);
CREATE INDEX idx_branch_inspections_started_at ON public.branch_inspections(started_at DESC);
CREATE INDEX idx_inspection_items_inspection_id ON public.inspection_items(inspection_id);
CREATE INDEX idx_inspection_templates_type ON public.inspection_templates(inspection_type);

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

ALTER TABLE public.inspection_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_items ENABLE ROW LEVEL SECURITY;

-- inspection_templates: todos pueden leer, solo superadmin puede modificar
CREATE POLICY "inspection_templates_select" ON public.inspection_templates
  FOR SELECT USING (true);

CREATE POLICY "inspection_templates_admin" ON public.inspection_templates
  FOR ALL USING (is_superadmin(auth.uid()))
  WITH CHECK (is_superadmin(auth.uid()));

-- branch_inspections: coordinadores/superadmin todo, encargados/franquiciados ver su local
CREATE POLICY "branch_inspections_superadmin" ON public.branch_inspections
  FOR ALL USING (is_superadmin(auth.uid()))
  WITH CHECK (is_superadmin(auth.uid()));

CREATE POLICY "branch_inspections_coordinador" ON public.branch_inspections
  FOR ALL USING (get_brand_role(auth.uid()) = 'coordinador'::brand_role_type)
  WITH CHECK (get_brand_role(auth.uid()) = 'coordinador'::brand_role_type);

CREATE POLICY "branch_inspections_local_view" ON public.branch_inspections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles_v2 ur
      WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND ur.local_role IN ('franquiciado', 'encargado')
        AND branch_inspections.branch_id = ANY(ur.branch_ids)
    )
  );

-- inspection_items: mismas reglas que branch_inspections
CREATE POLICY "inspection_items_superadmin" ON public.inspection_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.branch_inspections bi WHERE bi.id = inspection_items.inspection_id AND is_superadmin(auth.uid()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.branch_inspections bi WHERE bi.id = inspection_items.inspection_id AND is_superadmin(auth.uid()))
  );

CREATE POLICY "inspection_items_coordinador" ON public.inspection_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.branch_inspections bi WHERE bi.id = inspection_items.inspection_id AND get_brand_role(auth.uid()) = 'coordinador'::brand_role_type)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.branch_inspections bi WHERE bi.id = inspection_items.inspection_id AND get_brand_role(auth.uid()) = 'coordinador'::brand_role_type)
  );

CREATE POLICY "inspection_items_local_view" ON public.inspection_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.branch_inspections bi
      JOIN user_roles_v2 ur ON ur.user_id = auth.uid()
      WHERE bi.id = inspection_items.inspection_id
        AND ur.is_active = true
        AND ur.local_role IN ('franquiciado', 'encargado')
        AND bi.branch_id = ANY(ur.branch_ids)
    )
  );

-- =============================================================================
-- STORAGE BUCKET
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('inspection-photos', 'inspection-photos', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "inspection_photos_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'inspection-photos');

CREATE POLICY "inspection_photos_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'inspection-photos' 
    AND (is_superadmin(auth.uid()) OR get_brand_role(auth.uid()) = 'coordinador'::brand_role_type)
  );

CREATE POLICY "inspection_photos_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'inspection-photos' 
    AND (is_superadmin(auth.uid()) OR get_brand_role(auth.uid()) = 'coordinador'::brand_role_type)
  );

CREATE POLICY "inspection_photos_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'inspection-photos' 
    AND (is_superadmin(auth.uid()) OR get_brand_role(auth.uid()) = 'coordinador'::brand_role_type)
  );

-- =============================================================================
-- DATOS INICIALES: TEMPLATES BOH (17 ítems)
-- =============================================================================

INSERT INTO public.inspection_templates (inspection_type, category, item_key, item_label, sort_order) VALUES
-- Heladeras (5)
('boh', 'heladeras', 'temp_heladeras', 'Temperatura heladeras (superior e inferior)', 1),
('boh', 'heladeras', 'etiquetado_fifo', 'Etiquetado FIFO legible y resistente al frío', 2),
('boh', 'heladeras', 'juntas_burletes', 'Juntas y burletes sin fugas ni condensación', 3),
('boh', 'heladeras', 'ventiladores_rejillas', 'Ventiladores y rejillas limpios', 4),
('boh', 'heladeras', 'stock_vencer', 'Stock próximo a vencer identificado', 5),
-- Depósito (2)
('boh', 'deposito', 'orden_deposito', 'Orden en depósito (carnes, salsas, descartables)', 6),
('boh', 'deposito', 'iluminacion_cableado', 'Iluminación y cableado en depósito', 7),
-- Cocina (6)
('boh', 'cocina', 'campanas_paredes', 'Limpieza de campanas y paredes de cocina', 8),
('boh', 'cocina', 'nivel_aceite', 'Nivel de aceite en freidoras (3/4 cesta)', 9),
('boh', 'cocina', 'fecha_aceite', 'Fecha de cambio de aceite actualizada', 10),
('boh', 'cocina', 'superficie_planchas', 'Superficie de planchas en buen estado', 11),
('boh', 'cocina', 'rejillas_desague', 'Rejillas de desagüe completas', 12),
('boh', 'cocina', 'calidad_corte', 'Calidad de corte de vegetales (brunoise/juliana)', 13),
-- Seguridad (4)
('boh', 'seguridad', 'certificado_desinfeccion', 'Certificado de desinfección visible', 14),
('boh', 'seguridad', 'matafuegos', 'Matafuegos cargado y accesible', 15),
('boh', 'seguridad', 'pisos_grietas', 'Pisos sin grietas peligrosas', 16),
('boh', 'seguridad', 'ausencia_celulares', 'Ausencia de celulares en área operativa', 17);

-- =============================================================================
-- DATOS INICIALES: TEMPLATES FOH (13 ítems)
-- =============================================================================

INSERT INTO public.inspection_templates (inspection_type, category, item_key, item_label, sort_order) VALUES
-- Mostrador (3)
('foh', 'mostrador', 'limpieza_mostrador', 'Limpieza de mostrador y terminales de pago', 1),
('foh', 'mostrador', 'carteleria', 'Cartelería actualizada y libre de polvo', 2),
('foh', 'mostrador', 'uniformes', 'Uniformes del personal limpios y conformes', 3),
-- Producto (3)
('foh', 'producto', 'tiempo_entrega', 'Tiempo pedido-entrega (< 6 min)', 4),
('foh', 'producto', 'presentacion_producto', 'Presentación del producto (envoltorio, frescura)', 5),
('foh', 'producto', 'punto_coccion', 'Punto de cocción de la carne', 6),
-- Salón (5)
('foh', 'salon', 'limpieza_mesas', 'Limpieza de mesas y sillas', 7),
('foh', 'salon', 'iluminacion_salon', 'Estado de iluminación en salón y barra', 8),
('foh', 'salon', 'banos_funcionando', 'Baños: inodoros y lavamanos funcionando', 9),
('foh', 'salon', 'banos_suministros', 'Suministro de papel y jabón en baños', 10),
('foh', 'salon', 'senaletica', 'Señalética interna legible y sin daños', 11),
-- Atención (2)
('foh', 'atencion', 'saludo_atencion', 'Saludo y atención (uso de nombre, despedida)', 12),
('foh', 'atencion', 'claridad_respuestas', 'Claridad de respuestas a preguntas de clientes', 13);

-- =============================================================================
-- TRIGGER PARA updated_at
-- =============================================================================

CREATE TRIGGER update_branch_inspections_updated_at
  BEFORE UPDATE ON public.branch_inspections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();