-- Agregar campo para horarios públicos por día de la semana
-- Formato: JSONB con keys 0-6 (domingo-sábado) y valores {opens, closes, closed}
ALTER TABLE public.branches 
ADD COLUMN IF NOT EXISTS public_hours JSONB DEFAULT '{
  "0": {"opens": "19:30", "closes": "00:00"},
  "1": {"opens": "19:30", "closes": "23:30"},
  "2": {"opens": "19:30", "closes": "23:30"},
  "3": {"opens": "19:30", "closes": "00:00"},
  "4": {"opens": "19:30", "closes": "00:00"},
  "5": {"opens": "19:30", "closes": "00:30"},
  "6": {"opens": "19:30", "closes": "00:30"}
}'::jsonb;

COMMENT ON COLUMN public.branches.public_hours IS 'Horarios públicos por día (0=Dom, 1=Lun, ..., 6=Sab). Formato: {opens, closes, closed?}';