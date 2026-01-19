-- Eliminar constraint UNIQUE para permitir múltiples turnos por día
ALTER TABLE public.branch_schedules 
DROP CONSTRAINT IF EXISTS branch_schedules_branch_id_service_type_day_of_week_key;

-- Agregar columna para ordenar turnos
ALTER TABLE public.branch_schedules 
ADD COLUMN IF NOT EXISTS shift_number INTEGER NOT NULL DEFAULT 1;

-- Crear nuevo índice único que incluye el número de turno
CREATE UNIQUE INDEX IF NOT EXISTS branch_schedules_unique_shift 
ON public.branch_schedules(branch_id, service_type, day_of_week, shift_number);