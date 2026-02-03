-- Fase A: Sistema de Posiciones de Trabajo Configurables

-- 1. Crear tabla work_positions
CREATE TABLE public.work_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  label text NOT NULL,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Insertar datos iniciales
INSERT INTO public.work_positions (key, label, sort_order) VALUES
  ('cajero', 'Cajero/a', 1),
  ('sandwichero', 'Sandwichero', 2),
  ('cafetero', 'Cafetero', 3),
  ('runner', 'Runner', 4),
  ('lavacopas', 'Lavacopas', 5),
  ('encargado_turno', 'Encargado de Turno', 6);

-- 3. Modificar employee_schedules para usar text en lugar de ENUM
ALTER TABLE employee_schedules 
  ALTER COLUMN work_position TYPE text USING work_position::text;

-- 4. Migrar datos existentes de 'cocinero' a 'sandwichero'
UPDATE employee_schedules 
SET work_position = 'sandwichero' 
WHERE work_position = 'cocinero';

-- 5. Habilitar RLS
ALTER TABLE work_positions ENABLE ROW LEVEL SECURITY;

-- 6. Política de lectura para usuarios autenticados
CREATE POLICY "work_positions_read" ON work_positions
  FOR SELECT TO authenticated
  USING (true);

-- 7. Política de escritura solo para superadmin
CREATE POLICY "work_positions_admin" ON work_positions
  FOR ALL TO authenticated
  USING (is_superadmin(auth.uid()))
  WITH CHECK (is_superadmin(auth.uid()));

-- 8. Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_work_positions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_work_positions_updated_at
  BEFORE UPDATE ON work_positions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_work_positions_updated_at();