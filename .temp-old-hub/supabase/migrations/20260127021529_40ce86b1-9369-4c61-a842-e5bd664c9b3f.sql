-- =============================================
-- PARTE 1: Campos faltantes en profiles
-- =============================================

-- Agregar fecha de nacimiento
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS birth_date DATE;

-- Agregar avatar_url para foto de perfil
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- =============================================
-- PARTE 2: Tabla de solicitudes de horarios
-- =============================================

CREATE TABLE IF NOT EXISTS public.schedule_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  request_type TEXT NOT NULL CHECK (request_type IN ('day_off', 'shift_change', 'other')),
  request_date DATE NOT NULL,
  reason TEXT,
  
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  response_note TEXT,
  responded_by UUID REFERENCES auth.users(id),
  responded_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para schedule_requests
CREATE INDEX IF NOT EXISTS idx_schedule_requests_branch ON schedule_requests(branch_id);
CREATE INDEX IF NOT EXISTS idx_schedule_requests_user ON schedule_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_schedule_requests_status ON schedule_requests(status);
CREATE INDEX IF NOT EXISTS idx_schedule_requests_date ON schedule_requests(request_date);

-- RLS para schedule_requests
ALTER TABLE public.schedule_requests ENABLE ROW LEVEL SECURITY;

-- Empleados pueden ver sus propias solicitudes
CREATE POLICY "Users can view own requests" ON schedule_requests
  FOR SELECT USING (auth.uid() = user_id);

-- Empleados pueden crear solicitudes
CREATE POLICY "Users can create own requests" ON schedule_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins y encargados pueden ver todas las solicitudes de sus sucursales
CREATE POLICY "Staff can view branch requests" ON schedule_requests
  FOR SELECT USING (
    public.is_admin(auth.uid()) OR 
    public.has_branch_access(auth.uid(), branch_id)
  );

-- Admins y encargados pueden actualizar solicitudes
CREATE POLICY "Staff can update branch requests" ON schedule_requests
  FOR UPDATE USING (
    public.is_admin(auth.uid()) OR 
    public.has_branch_access(auth.uid(), branch_id)
  );

-- =============================================
-- PARTE 3: Tabla de días especiales
-- =============================================

CREATE TABLE IF NOT EXISTS public.special_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE, -- NULL = aplica a todos
  
  day_date DATE NOT NULL,
  day_type TEXT NOT NULL CHECK (day_type IN ('holiday', 'birthday', 'event', 'other')),
  description TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id), -- Para cumpleaños, referencia al empleado
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para special_days
CREATE INDEX IF NOT EXISTS idx_special_days_date ON special_days(day_date);
CREATE INDEX IF NOT EXISTS idx_special_days_branch ON special_days(branch_id);
CREATE INDEX IF NOT EXISTS idx_special_days_type ON special_days(day_type);

-- RLS para special_days
ALTER TABLE public.special_days ENABLE ROW LEVEL SECURITY;

-- Todos pueden ver días especiales
CREATE POLICY "Anyone can view special days" ON special_days
  FOR SELECT USING (true);

-- Solo admins y encargados pueden crear/editar
CREATE POLICY "Staff can manage special days" ON special_days
  FOR ALL USING (
    public.is_admin(auth.uid()) OR 
    (branch_id IS NOT NULL AND public.has_branch_access(auth.uid(), branch_id))
  );

-- =============================================
-- PARTE 4: Mejoras en communication_reads
-- =============================================

-- Asegurar que existe la columna para tracking de lectura
ALTER TABLE public.communication_reads
ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ DEFAULT now();

-- =============================================
-- PARTE 5: Verificar daily_sales tiene campos correctos
-- =============================================

-- Agregar campos faltantes si no existen
ALTER TABLE public.daily_sales
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

ALTER TABLE public.daily_sales
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.daily_sales
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;