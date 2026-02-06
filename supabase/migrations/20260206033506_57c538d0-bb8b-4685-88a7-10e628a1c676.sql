-- 1. Agregar columna coaching_type a tabla coachings
ALTER TABLE public.coachings 
ADD COLUMN IF NOT EXISTS coaching_type TEXT 
DEFAULT 'manager_to_employee';

-- Agregar constraint check
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'coachings_coaching_type_check'
  ) THEN
    ALTER TABLE public.coachings 
    ADD CONSTRAINT coachings_coaching_type_check 
    CHECK (coaching_type IN ('brand_to_manager', 'manager_to_employee'));
  END IF;
END $$;

-- Index para filtrar por tipo
CREATE INDEX IF NOT EXISTS idx_coachings_type ON public.coachings(coaching_type);

-- 2. Poblar competencias de encargado (manager_competencies)
INSERT INTO public.manager_competencies (key, name, description, sort_order, is_active) 
VALUES 
  ('leadership_team', 'Gestión del equipo', 'Liderazgo, delegación, motivación del personal', 1, true),
  ('coaching_compliance', 'Cumplimiento de coachings', 'Porcentaje de empleados evaluados mensualmente', 2, true),
  ('operations', 'Gestión operativa', 'Control de cierres, turnos y stock', 3, true),
  ('customer_service', 'Atención a clientes', 'Resolución de conflictos y manejo de quejas', 4, true),
  ('brand_standards', 'Estándares de marca', 'Cumplimiento de imagen y procesos de la franquicia', 5, true),
  ('communication', 'Comunicación con marca', 'Calidad de reportes, respuesta y proactividad', 6, true)
ON CONFLICT (key) DO NOTHING;