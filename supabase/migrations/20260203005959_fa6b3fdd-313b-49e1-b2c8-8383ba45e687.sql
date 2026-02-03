-- =====================================================
-- SISTEMA DE COACHING Y CERTIFICACIONES - HOPPINESS
-- =====================================================

-- 1. TABLAS DE CATÁLOGO
-- =====================================================

-- Estaciones de trabajo
CREATE TABLE public.work_stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'utensils',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Competencias por estación (5 por cada estación)
CREATE TABLE public.station_competencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES public.work_stations(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(station_id, key)
);

-- Competencias generales (10 competencias con pesos)
CREATE TABLE public.general_competencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  weight NUMERIC NOT NULL DEFAULT 1.0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Competencias para encargados (8 competencias)
CREATE TABLE public.manager_competencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. TABLAS DE DATOS
-- =====================================================

-- Certificaciones por empleado/estación
CREATE TABLE public.employee_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  station_id UUID NOT NULL REFERENCES public.work_stations(id) ON DELETE CASCADE,
  level INTEGER NOT NULL DEFAULT 0 CHECK (level >= 0 AND level <= 3),
  certified_at TIMESTAMPTZ,
  certified_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, branch_id, station_id)
);

-- Coachings mensuales
CREATE TABLE public.coachings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  evaluated_by UUID NOT NULL,
  coaching_date DATE NOT NULL DEFAULT CURRENT_DATE,
  coaching_month INTEGER NOT NULL CHECK (coaching_month >= 1 AND coaching_month <= 12),
  coaching_year INTEGER NOT NULL CHECK (coaching_year >= 2020),
  
  -- Scores calculados
  general_score NUMERIC(3,2) CHECK (general_score IS NULL OR (general_score >= 1 AND general_score <= 4)),
  station_score NUMERIC(3,2) CHECK (station_score IS NULL OR (station_score >= 1 AND station_score <= 4)),
  overall_score NUMERIC(3,2) CHECK (overall_score IS NULL OR (overall_score >= 1 AND overall_score <= 4)),
  
  -- Notas cualitativas
  strengths TEXT,
  areas_to_improve TEXT,
  action_plan TEXT,
  manager_notes TEXT,
  
  -- Confirmación empleado
  acknowledged_at TIMESTAMPTZ,
  acknowledged_notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Un coaching por empleado por mes
  UNIQUE(user_id, branch_id, coaching_month, coaching_year)
);

-- Scores por estación en cada coaching
CREATE TABLE public.coaching_station_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coaching_id UUID NOT NULL REFERENCES public.coachings(id) ON DELETE CASCADE,
  station_id UUID NOT NULL REFERENCES public.work_stations(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 4),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(coaching_id, station_id)
);

-- Scores individuales por competencia
CREATE TABLE public.coaching_competency_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coaching_id UUID NOT NULL REFERENCES public.coachings(id) ON DELETE CASCADE,
  competency_type TEXT NOT NULL CHECK (competency_type IN ('station', 'general', 'manager')),
  competency_id UUID NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 4),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(coaching_id, competency_type, competency_id)
);

-- 3. ÍNDICES
-- =====================================================
CREATE INDEX idx_employee_certifications_user ON public.employee_certifications(user_id);
CREATE INDEX idx_employee_certifications_branch ON public.employee_certifications(branch_id);
CREATE INDEX idx_coachings_user ON public.coachings(user_id);
CREATE INDEX idx_coachings_branch ON public.coachings(branch_id);
CREATE INDEX idx_coachings_period ON public.coachings(coaching_year, coaching_month);
CREATE INDEX idx_coaching_station_scores_coaching ON public.coaching_station_scores(coaching_id);
CREATE INDEX idx_coaching_competency_scores_coaching ON public.coaching_competency_scores(coaching_id);

-- 4. FUNCIONES DE SEGURIDAD
-- =====================================================

-- Verificar si puede gestionar coaching en una sucursal
CREATE OR REPLACE FUNCTION public.can_manage_coaching(_user_id UUID, _branch_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_superadmin(_user_id) OR EXISTS (
    SELECT 1 FROM user_branch_roles
    WHERE user_id = _user_id 
    AND branch_id = _branch_id
    AND local_role IN ('franquiciado', 'encargado')
    AND is_active = true
  )
$$;

-- Verificar si puede ver un coaching específico
CREATE OR REPLACE FUNCTION public.can_view_coaching(_user_id UUID, _coaching_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM coachings c
    WHERE c.id = _coaching_id
    AND (
      c.user_id = _user_id -- Es el empleado evaluado
      OR can_manage_coaching(_user_id, c.branch_id) -- Es manager del local
    )
  )
$$;

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_coaching_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_coachings_updated_at
  BEFORE UPDATE ON public.coachings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_coaching_updated_at();

CREATE TRIGGER update_certifications_updated_at
  BEFORE UPDATE ON public.employee_certifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_coaching_updated_at();

-- 5. HABILITAR RLS
-- =====================================================
ALTER TABLE public.work_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.station_competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.general_competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manager_competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coachings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_station_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_competency_scores ENABLE ROW LEVEL SECURITY;

-- 6. POLÍTICAS RLS - CATÁLOGOS (lectura pública autenticada)
-- =====================================================

-- work_stations
CREATE POLICY "work_stations_select" ON public.work_stations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "work_stations_admin" ON public.work_stations
  FOR ALL TO authenticated
  USING (is_superadmin(auth.uid()))
  WITH CHECK (is_superadmin(auth.uid()));

-- station_competencies
CREATE POLICY "station_competencies_select" ON public.station_competencies
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "station_competencies_admin" ON public.station_competencies
  FOR ALL TO authenticated
  USING (is_superadmin(auth.uid()))
  WITH CHECK (is_superadmin(auth.uid()));

-- general_competencies
CREATE POLICY "general_competencies_select" ON public.general_competencies
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "general_competencies_admin" ON public.general_competencies
  FOR ALL TO authenticated
  USING (is_superadmin(auth.uid()))
  WITH CHECK (is_superadmin(auth.uid()));

-- manager_competencies
CREATE POLICY "manager_competencies_select" ON public.manager_competencies
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "manager_competencies_admin" ON public.manager_competencies
  FOR ALL TO authenticated
  USING (is_superadmin(auth.uid()))
  WITH CHECK (is_superadmin(auth.uid()));

-- 7. POLÍTICAS RLS - CERTIFICACIONES
-- =====================================================

-- Ver propias o todas si es manager
CREATE POLICY "certifications_select" ON public.employee_certifications
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() 
    OR can_manage_coaching(auth.uid(), branch_id)
  );

-- Solo managers pueden crear/modificar
CREATE POLICY "certifications_insert" ON public.employee_certifications
  FOR INSERT TO authenticated
  WITH CHECK (can_manage_coaching(auth.uid(), branch_id));

CREATE POLICY "certifications_update" ON public.employee_certifications
  FOR UPDATE TO authenticated
  USING (can_manage_coaching(auth.uid(), branch_id))
  WITH CHECK (can_manage_coaching(auth.uid(), branch_id));

-- 8. POLÍTICAS RLS - COACHINGS
-- =====================================================

-- Ver propios o todos del local si es manager
CREATE POLICY "coachings_select" ON public.coachings
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() 
    OR can_manage_coaching(auth.uid(), branch_id)
  );

-- Solo managers pueden crear
CREATE POLICY "coachings_insert" ON public.coachings
  FOR INSERT TO authenticated
  WITH CHECK (can_manage_coaching(auth.uid(), branch_id));

-- Managers pueden editar, empleado solo puede confirmar
CREATE POLICY "coachings_update" ON public.coachings
  FOR UPDATE TO authenticated
  USING (
    can_manage_coaching(auth.uid(), branch_id)
    OR (user_id = auth.uid() AND acknowledged_at IS NULL)
  );

-- 9. POLÍTICAS RLS - SCORES
-- =====================================================

-- coaching_station_scores
CREATE POLICY "coaching_station_scores_select" ON public.coaching_station_scores
  FOR SELECT TO authenticated
  USING (can_view_coaching(auth.uid(), coaching_id));

CREATE POLICY "coaching_station_scores_insert" ON public.coaching_station_scores
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM coachings c 
      WHERE c.id = coaching_id 
      AND can_manage_coaching(auth.uid(), c.branch_id)
    )
  );

CREATE POLICY "coaching_station_scores_update" ON public.coaching_station_scores
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM coachings c 
      WHERE c.id = coaching_id 
      AND can_manage_coaching(auth.uid(), c.branch_id)
    )
  );

-- coaching_competency_scores
CREATE POLICY "coaching_competency_scores_select" ON public.coaching_competency_scores
  FOR SELECT TO authenticated
  USING (can_view_coaching(auth.uid(), coaching_id));

CREATE POLICY "coaching_competency_scores_insert" ON public.coaching_competency_scores
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM coachings c 
      WHERE c.id = coaching_id 
      AND can_manage_coaching(auth.uid(), c.branch_id)
    )
  );

CREATE POLICY "coaching_competency_scores_update" ON public.coaching_competency_scores
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM coachings c 
      WHERE c.id = coaching_id 
      AND can_manage_coaching(auth.uid(), c.branch_id)
    )
  );

-- 10. DATOS INICIALES - ESTACIONES
-- =====================================================
INSERT INTO public.work_stations (key, name, icon, sort_order) VALUES
  ('cocinero', 'Cocinero/a', 'chef-hat', 1),
  ('cajero', 'Cajero/a', 'calculator', 2),
  ('runner', 'Runner', 'package', 3),
  ('lavacopas', 'Lavacopas', 'droplets', 4);

-- 11. DATOS INICIALES - COMPETENCIAS POR ESTACIÓN
-- =====================================================

-- Competencias Cocinero
INSERT INTO public.station_competencies (station_id, key, name, description, sort_order)
SELECT id, 'mise_en_place', 'Mise en place', 'Preparación previa de ingredientes y estación', 1
FROM public.work_stations WHERE key = 'cocinero';

INSERT INTO public.station_competencies (station_id, key, name, description, sort_order)
SELECT id, 'coccion_carne', 'Cocción de carne', 'Dominio del punto de cocción y técnica smash', 2
FROM public.work_stations WHERE key = 'cocinero';

INSERT INTO public.station_competencies (station_id, key, name, description, sort_order)
SELECT id, 'armado_burger', 'Armado de burger', 'Presentación y orden de ingredientes', 3
FROM public.work_stations WHERE key = 'cocinero';

INSERT INTO public.station_competencies (station_id, key, name, description, sort_order)
SELECT id, 'tiempos_cocina', 'Tiempos de cocina', 'Velocidad y coordinación de pedidos', 4
FROM public.work_stations WHERE key = 'cocinero';

INSERT INTO public.station_competencies (station_id, key, name, description, sort_order)
SELECT id, 'limpieza_cocina', 'Limpieza de estación', 'Mantener estación limpia durante servicio', 5
FROM public.work_stations WHERE key = 'cocinero';

-- Competencias Cajero
INSERT INTO public.station_competencies (station_id, key, name, description, sort_order)
SELECT id, 'toma_pedidos', 'Toma de pedidos', 'Claridad y precisión al registrar pedidos', 1
FROM public.work_stations WHERE key = 'cajero';

INSERT INTO public.station_competencies (station_id, key, name, description, sort_order)
SELECT id, 'cobros', 'Manejo de cobros', 'Efectivo, tarjetas y medios digitales', 2
FROM public.work_stations WHERE key = 'cajero';

INSERT INTO public.station_competencies (station_id, key, name, description, sort_order)
SELECT id, 'atencion_cliente', 'Atención al cliente', 'Cortesía y resolución de consultas', 3
FROM public.work_stations WHERE key = 'cajero';

INSERT INTO public.station_competencies (station_id, key, name, description, sort_order)
SELECT id, 'conocimiento_menu', 'Conocimiento del menú', 'Ingredientes, precios y sugerencias', 4
FROM public.work_stations WHERE key = 'cajero';

INSERT INTO public.station_competencies (station_id, key, name, description, sort_order)
SELECT id, 'cierre_caja', 'Cierre de caja', 'Cuadre y documentación de turno', 5
FROM public.work_stations WHERE key = 'cajero';

-- Competencias Runner
INSERT INTO public.station_competencies (station_id, key, name, description, sort_order)
SELECT id, 'entrega_pedidos', 'Entrega de pedidos', 'Identificación correcta de mesa/cliente', 1
FROM public.work_stations WHERE key = 'runner';

INSERT INTO public.station_competencies (station_id, key, name, description, sort_order)
SELECT id, 'presentacion_mesa', 'Presentación en mesa', 'Servicio y disposición de productos', 2
FROM public.work_stations WHERE key = 'runner';

INSERT INTO public.station_competencies (station_id, key, name, description, sort_order)
SELECT id, 'reposicion_insumos', 'Reposición de insumos', 'Mantener salseras, servilleteros, etc.', 3
FROM public.work_stations WHERE key = 'runner';

INSERT INTO public.station_competencies (station_id, key, name, description, sort_order)
SELECT id, 'limpieza_salon', 'Limpieza de salón', 'Mesas, piso y área de clientes', 4
FROM public.work_stations WHERE key = 'runner';

INSERT INTO public.station_competencies (station_id, key, name, description, sort_order)
SELECT id, 'comunicacion_cocina', 'Comunicación con cocina', 'Coordinación de tiempos y prioridades', 5
FROM public.work_stations WHERE key = 'runner';

-- Competencias Lavacopas
INSERT INTO public.station_competencies (station_id, key, name, description, sort_order)
SELECT id, 'lavado_utensilios', 'Lavado de utensilios', 'Limpieza correcta de ollas, sartenes, etc.', 1
FROM public.work_stations WHERE key = 'lavacopas';

INSERT INTO public.station_competencies (station_id, key, name, description, sort_order)
SELECT id, 'organizacion_cocina', 'Organización de cocina', 'Orden de utensilios y almacenamiento', 2
FROM public.work_stations WHERE key = 'lavacopas';

INSERT INTO public.station_competencies (station_id, key, name, description, sort_order)
SELECT id, 'manejo_residuos', 'Manejo de residuos', 'Separación y disposición de basura', 3
FROM public.work_stations WHERE key = 'lavacopas';

INSERT INTO public.station_competencies (station_id, key, name, description, sort_order)
SELECT id, 'limpieza_profunda', 'Limpieza profunda', 'Desengrase, desinfección de áreas', 4
FROM public.work_stations WHERE key = 'lavacopas';

INSERT INTO public.station_competencies (station_id, key, name, description, sort_order)
SELECT id, 'apoyo_cocina', 'Apoyo a cocina', 'Colaboración con mise en place cuando se requiere', 5
FROM public.work_stations WHERE key = 'lavacopas';

-- 12. DATOS INICIALES - COMPETENCIAS GENERALES
-- =====================================================
INSERT INTO public.general_competencies (key, name, description, weight, sort_order) VALUES
  ('puntualidad', 'Puntualidad', 'Llega a horario y respeta los tiempos', 1.5, 1),
  ('presentacion', 'Presentación personal', 'Uniforme limpio, higiene personal', 1.0, 2),
  ('actitud', 'Actitud positiva', 'Disposición y entusiasmo en el trabajo', 1.5, 3),
  ('trabajo_equipo', 'Trabajo en equipo', 'Colaboración con compañeros', 1.5, 4),
  ('comunicacion', 'Comunicación', 'Claridad al expresarse con equipo y clientes', 1.0, 5),
  ('iniciativa', 'Iniciativa', 'Propone mejoras y actúa proactivamente', 1.0, 6),
  ('responsabilidad', 'Responsabilidad', 'Cumple con tareas asignadas', 1.5, 7),
  ('aprendizaje', 'Capacidad de aprendizaje', 'Incorpora feedback y mejora', 1.0, 8),
  ('resolucion_problemas', 'Resolución de problemas', 'Maneja situaciones imprevistas', 1.0, 9),
  ('normas_seguridad', 'Normas y seguridad', 'Cumple protocolos de higiene y seguridad', 1.0, 10);

-- 13. DATOS INICIALES - COMPETENCIAS DE ENCARGADO
-- =====================================================
INSERT INTO public.manager_competencies (key, name, description, sort_order) VALUES
  ('liderazgo', 'Liderazgo', 'Guía y motiva al equipo efectivamente', 1),
  ('organizacion', 'Organización', 'Planifica turnos y tareas eficientemente', 2),
  ('toma_decisiones', 'Toma de decisiones', 'Decide con criterio en situaciones críticas', 3),
  ('gestion_conflictos', 'Gestión de conflictos', 'Resuelve problemas entre empleados o con clientes', 4),
  ('capacitacion', 'Capacitación', 'Entrena y desarrolla al equipo', 5),
  ('control_operativo', 'Control operativo', 'Supervisa calidad y tiempos de servicio', 6),
  ('manejo_caja', 'Manejo de caja', 'Control financiero del turno', 7),
  ('comunicacion_marca', 'Comunicación con marca', 'Reportes y coordinación con central', 8);