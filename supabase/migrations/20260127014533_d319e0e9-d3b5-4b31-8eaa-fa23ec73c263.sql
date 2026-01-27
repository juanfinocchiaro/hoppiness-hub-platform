-- =====================================================
-- PARTE 2: Agregar columnas de fichaje a branches
-- =====================================================

-- Código único de fichaje (ej: mnt, nvc)
ALTER TABLE public.branches 
  ADD COLUMN IF NOT EXISTS clock_code VARCHAR(10) UNIQUE;

-- IPs permitidas para validar fichaje
ALTER TABLE public.branches 
  ADD COLUMN IF NOT EXISTS allowed_ips TEXT[];

-- Actualizar Manantiales con su código
UPDATE public.branches 
SET clock_code = 'mnt' 
WHERE slug = 'manantiales';

-- =====================================================
-- PARTE 2: Crear los 4 locales faltantes
-- =====================================================

INSERT INTO public.branches (
  name, 
  slug, 
  address, 
  city, 
  phone, 
  clock_code,
  is_active,
  opening_time,
  closing_time,
  delivery_enabled,
  takeaway_enabled,
  dine_in_enabled,
  enforce_labor_law
)
VALUES 
  (
    'Nueva Córdoba', 
    'nueva-cordoba', 
    'Por definir',
    'Córdoba', 
    NULL,
    'nvc',
    true,
    '12:00:00',
    '23:30:00',
    true,
    true,
    true,
    true
  ),
  (
    'Villa Allende', 
    'villa-allende', 
    'Por definir',
    'Villa Allende', 
    NULL,
    'val',
    true,
    '12:00:00',
    '23:30:00',
    true,
    true,
    true,
    true
  ),
  (
    'General Paz', 
    'general-paz', 
    'Por definir',
    'Córdoba', 
    NULL,
    'gpa',
    true,
    '12:00:00',
    '23:30:00',
    true,
    true,
    true,
    true
  ),
  (
    'Villa Carlos Paz', 
    'villa-carlos-paz', 
    'Por definir',
    'Villa Carlos Paz', 
    NULL,
    'vcp',
    true,
    '12:00:00',
    '23:30:00',
    true,
    true,
    true,
    true
  )
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- PARTE 10: Tabla de fichajes (clock_entries)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.clock_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  entry_type TEXT NOT NULL CHECK (entry_type IN ('clock_in', 'clock_out')),
  
  photo_url TEXT,
  
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_clock_entries_branch_date 
  ON public.clock_entries(branch_id, created_at);
CREATE INDEX IF NOT EXISTS idx_clock_entries_user 
  ON public.clock_entries(user_id, created_at);

-- RLS
ALTER TABLE public.clock_entries ENABLE ROW LEVEL SECURITY;

-- Policy: Usuarios pueden ver sus propios fichajes
CREATE POLICY "Users can view own clock entries"
  ON public.clock_entries FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Usuarios pueden insertar sus propios fichajes
CREATE POLICY "Users can insert own clock entries"
  ON public.clock_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Managers pueden ver fichajes de su sucursal
CREATE POLICY "Managers can view branch clock entries"
  ON public.clock_entries FOR SELECT
  USING (
    public.is_superadmin(auth.uid()) OR
    public.has_branch_access_v2(auth.uid(), branch_id)
  );

-- =====================================================
-- Agregar PIN de fichaje a profiles
-- =====================================================

ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS clock_pin VARCHAR(4);

-- Función para validar PIN de fichaje
CREATE OR REPLACE FUNCTION public.validate_clock_pin(_branch_code TEXT, _pin TEXT)
RETURNS TABLE(user_id UUID, full_name TEXT, branch_id UUID, branch_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id,
    p.full_name,
    b.id as branch_id,
    b.name as branch_name
  FROM profiles p
  JOIN user_roles_v2 ur ON ur.user_id = p.user_id
  JOIN branches b ON b.clock_code = _branch_code
  WHERE p.clock_pin = _pin
    AND ur.is_active = true
    AND (ur.brand_role = 'superadmin' OR b.id = ANY(ur.branch_ids))
  LIMIT 1;
END;
$$;