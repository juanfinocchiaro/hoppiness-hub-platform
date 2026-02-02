-- ============================================
-- FASE 0: MIGRACIÓN HOPPINESS HUB V2
-- ============================================

-- 1. Nueva tabla para roles específicos por sucursal
CREATE TABLE public.user_branch_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  local_role local_role_type NOT NULL,
  authorization_pin_hash TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Un usuario solo puede tener un rol por sucursal
  UNIQUE(user_id, branch_id)
);

-- Índices para performance
CREATE INDEX idx_ubr_user_id ON user_branch_roles(user_id);
CREATE INDEX idx_ubr_branch_id ON user_branch_roles(branch_id);
CREATE INDEX idx_ubr_active ON user_branch_roles(is_active) WHERE is_active = true;

-- Trigger para updated_at
CREATE TRIGGER update_user_branch_roles_updated_at
  BEFORE UPDATE ON user_branch_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE user_branch_roles ENABLE ROW LEVEL SECURITY;

-- Superadmin ve todo
CREATE POLICY "ubr_superadmin" ON user_branch_roles
  FOR ALL TO authenticated
  USING (is_superadmin(auth.uid()));

-- Encargados/Franquiciados pueden gestionar su sucursal
CREATE POLICY "ubr_branch_managers" ON user_branch_roles
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_branch_roles ubr2
      WHERE ubr2.user_id = auth.uid()
      AND ubr2.branch_id = user_branch_roles.branch_id
      AND ubr2.local_role IN ('encargado', 'franquiciado')
      AND ubr2.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_branch_roles ubr2
      WHERE ubr2.user_id = auth.uid()
      AND ubr2.branch_id = user_branch_roles.branch_id
      AND ubr2.local_role IN ('encargado', 'franquiciado')
      AND ubr2.is_active = true
    )
  );

-- Usuario ve sus propios roles
CREATE POLICY "ubr_own" ON user_branch_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 2. Migrar datos existentes desde user_roles_v2
INSERT INTO user_branch_roles (user_id, branch_id, local_role, authorization_pin_hash, is_active)
SELECT 
  ur.user_id,
  unnest(ur.branch_ids) as branch_id,
  ur.local_role,
  ur.authorization_pin_hash,
  ur.is_active
FROM user_roles_v2 ur
WHERE ur.local_role IS NOT NULL 
  AND ur.branch_ids IS NOT NULL 
  AND array_length(ur.branch_ids, 1) > 0
ON CONFLICT (user_id, branch_id) DO NOTHING;

-- 3. Funciones helper para la nueva estructura
CREATE OR REPLACE FUNCTION public.get_local_role_for_branch(_user_id uuid, _branch_id uuid)
RETURNS local_role_type
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT local_role FROM user_branch_roles
  WHERE user_id = _user_id 
    AND branch_id = _branch_id
    AND is_active = true
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_user_branches(_user_id uuid)
RETURNS TABLE(branch_id uuid, local_role local_role_type)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT branch_id, local_role 
  FROM user_branch_roles
  WHERE user_id = _user_id AND is_active = true
$$;

-- Función para verificar si usuario tiene acceso a una sucursal (nueva versión)
CREATE OR REPLACE FUNCTION public.has_branch_role(_user_id uuid, _branch_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_branch_roles
    WHERE user_id = _user_id 
    AND branch_id = _branch_id
    AND is_active = true
  ) OR is_superadmin(_user_id)
$$;

-- Función para verificar si es HR en una sucursal (usa nueva tabla)
CREATE OR REPLACE FUNCTION public.is_hr_for_branch_v2(_user_id uuid, _branch_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
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

-- 4. Campos para comunicados
ALTER TABLE communications 
  ADD COLUMN IF NOT EXISTS requires_confirmation BOOLEAN DEFAULT false;

ALTER TABLE communication_reads 
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;

-- 5. Campos para sistema de ayuda
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS help_dismissed_pages TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS show_floating_help BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- Comentarios
COMMENT ON TABLE user_branch_roles IS 'Roles de usuario específicos por sucursal - un usuario puede tener roles diferentes en diferentes sucursales';
COMMENT ON COLUMN communications.requires_confirmation IS 'Si true, el usuario debe confirmar explícitamente que leyó el comunicado';
COMMENT ON COLUMN communication_reads.confirmed_at IS 'Timestamp de confirmación explícita (diferente de read_at)';
COMMENT ON COLUMN profiles.help_dismissed_pages IS 'IDs de páginas donde el usuario descartó la ayuda contextual';
COMMENT ON COLUMN profiles.show_floating_help IS 'Si mostrar el botón flotante de ayuda';
COMMENT ON COLUMN profiles.onboarding_completed_at IS 'Timestamp cuando el usuario completó el onboarding';