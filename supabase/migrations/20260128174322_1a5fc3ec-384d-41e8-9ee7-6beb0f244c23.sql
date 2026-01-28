-- =====================================================
-- FASE 1: Migración de BD + Nuevas tablas
-- =====================================================

-- 1. Agregar user_id a employee_schedules
ALTER TABLE employee_schedules 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Migrar datos existentes (vincular employee_id con user_id via profiles.phone)
UPDATE employee_schedules es
SET user_id = p.user_id
FROM employees e
JOIN profiles p ON p.phone = e.phone
WHERE es.employee_id = e.id
AND es.user_id IS NULL;

-- 2. Agregar user_id a salary_advances
ALTER TABLE salary_advances 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Migrar datos existentes
UPDATE salary_advances sa
SET user_id = p.user_id
FROM employees e
JOIN profiles p ON p.phone = e.phone
WHERE sa.employee_id = e.id
AND sa.user_id IS NULL;

-- 3. Agregar signed_document_url a warnings
ALTER TABLE warnings 
ADD COLUMN IF NOT EXISTS signed_document_url TEXT;

-- 4. Agregar custom_label a communications
ALTER TABLE communications 
ADD COLUMN IF NOT EXISTS custom_label TEXT;

-- 5. Crear tabla de reglamentos (versiones)
CREATE TABLE IF NOT EXISTS regulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INTEGER NOT NULL,
  title TEXT NOT NULL DEFAULT 'Reglamento Interno',
  document_url TEXT NOT NULL,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Índice para versión activa
CREATE INDEX IF NOT EXISTS idx_regulations_active ON regulations(is_active, effective_date DESC);

-- 6. Crear tabla de firmas de reglamento
CREATE TABLE IF NOT EXISTS regulation_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  regulation_id UUID NOT NULL REFERENCES regulations(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  signed_document_url TEXT NOT NULL,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, regulation_id)
);

-- Índices para regulation_signatures
CREATE INDEX IF NOT EXISTS idx_reg_sig_user ON regulation_signatures(user_id);
CREATE INDEX IF NOT EXISTS idx_reg_sig_branch ON regulation_signatures(branch_id);

-- 7. Insertar turnos por defecto para sucursales que no tienen
INSERT INTO branch_shifts (branch_id, name, start_time, end_time, sort_order, is_active)
SELECT b.id, 'Mañana', '08:00:00'::time, '12:00:00'::time, 1, false
FROM branches b
WHERE NOT EXISTS (
  SELECT 1 FROM branch_shifts bs WHERE bs.branch_id = b.id AND bs.name = 'Mañana'
);

INSERT INTO branch_shifts (branch_id, name, start_time, end_time, sort_order, is_active)
SELECT b.id, 'Mediodía', '12:00:00'::time, '17:00:00'::time, 2, true
FROM branches b
WHERE NOT EXISTS (
  SELECT 1 FROM branch_shifts bs WHERE bs.branch_id = b.id AND bs.name = 'Mediodía'
);

INSERT INTO branch_shifts (branch_id, name, start_time, end_time, sort_order, is_active)
SELECT b.id, 'Noche', '17:00:00'::time, '00:00:00'::time, 3, true
FROM branches b
WHERE NOT EXISTS (
  SELECT 1 FROM branch_shifts bs WHERE bs.branch_id = b.id AND bs.name = 'Noche'
);

INSERT INTO branch_shifts (branch_id, name, start_time, end_time, sort_order, is_active)
SELECT b.id, 'Trasnoche', '00:00:00'::time, '08:00:00'::time, 4, false
FROM branches b
WHERE NOT EXISTS (
  SELECT 1 FROM branch_shifts bs WHERE bs.branch_id = b.id AND bs.name = 'Trasnoche'
);

-- 8. Habilitar RLS en nuevas tablas
ALTER TABLE regulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulation_signatures ENABLE ROW LEVEL SECURITY;

-- 9. Políticas RLS para regulations
CREATE POLICY "Authenticated users can view active regulations"
  ON regulations FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage regulations"
  ON regulations FOR ALL TO authenticated
  USING (public.is_superadmin(auth.uid()));

-- 10. Políticas RLS para regulation_signatures
CREATE POLICY "Users can view their own signatures"
  ON regulation_signatures FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Branch managers can view branch signatures"
  ON regulation_signatures FOR SELECT TO authenticated
  USING (
    public.is_superadmin(auth.uid()) OR
    public.has_branch_access_v2(auth.uid(), branch_id)
  );

CREATE POLICY "Branch managers can insert signatures"
  ON regulation_signatures FOR INSERT TO authenticated
  WITH CHECK (
    public.is_superadmin(auth.uid()) OR
    public.has_branch_access_v2(auth.uid(), branch_id)
  );