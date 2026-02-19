-- =====================================================
-- FASE 1: Crear nueva estructura de roles simplificada
-- =====================================================

-- 1. Crear enum para roles de marca
DO $$ BEGIN
  CREATE TYPE brand_role_type AS ENUM ('superadmin', 'coordinador', 'informes', 'contador_marca');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Crear enum para roles locales
DO $$ BEGIN
  CREATE TYPE local_role_type AS ENUM ('franquiciado', 'encargado', 'contador_local', 'cajero', 'empleado');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. Crear nueva tabla user_roles_v2 (simplificada)
CREATE TABLE IF NOT EXISTS public.user_roles_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Rol en panel marca (NULL si no tiene acceso)
    brand_role brand_role_type,
    
    -- Rol en panel local (NULL si no tiene acceso a ningún local)
    local_role local_role_type,
    
    -- Sucursales a las que tiene acceso (vacío = todas para superadmin)
    branch_ids UUID[] DEFAULT '{}',
    
    -- PIN para autorizaciones (solo encargado y franquiciado)
    authorization_pin_hash TEXT,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT unique_user_role UNIQUE(user_id)
);

-- 4. Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_roles_v2_user ON public.user_roles_v2(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_v2_brand ON public.user_roles_v2(brand_role) WHERE brand_role IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_roles_v2_local ON public.user_roles_v2(local_role) WHERE local_role IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_roles_v2_branches ON public.user_roles_v2 USING GIN(branch_ids);

-- 5. Trigger para updated_at
CREATE OR REPLACE FUNCTION update_user_roles_v2_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS tr_user_roles_v2_updated ON public.user_roles_v2;
CREATE TRIGGER tr_user_roles_v2_updated
    BEFORE UPDATE ON public.user_roles_v2
    FOR EACH ROW
    EXECUTE FUNCTION update_user_roles_v2_updated_at();

-- 6. Enable RLS
ALTER TABLE public.user_roles_v2 ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles_v2;
CREATE POLICY "Users can view own role"
ON public.user_roles_v2 FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Superadmin can manage all roles" ON public.user_roles_v2;
CREATE POLICY "Superadmin can manage all roles"
ON public.user_roles_v2 FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles_v2 ur
        WHERE ur.user_id = auth.uid() 
        AND ur.brand_role = 'superadmin'
        AND ur.is_active = true
    )
);

DROP POLICY IF EXISTS "Franquiciado can manage local subordinates" ON public.user_roles_v2;
CREATE POLICY "Franquiciado can manage local subordinates"
ON public.user_roles_v2 FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles_v2 ur
        WHERE ur.user_id = auth.uid() 
        AND ur.local_role = 'franquiciado'
        AND ur.is_active = true
        AND ur.branch_ids && user_roles_v2.branch_ids
    )
    AND user_roles_v2.local_role IN ('encargado', 'contador_local', 'cajero', 'empleado')
    AND user_roles_v2.brand_role IS NULL
);

DROP POLICY IF EXISTS "Encargado can manage cajero and empleado" ON public.user_roles_v2;
CREATE POLICY "Encargado can manage cajero and empleado"
ON public.user_roles_v2 FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles_v2 ur
        WHERE ur.user_id = auth.uid() 
        AND ur.local_role = 'encargado'
        AND ur.is_active = true
        AND ur.branch_ids && user_roles_v2.branch_ids
    )
    AND user_roles_v2.local_role IN ('cajero', 'empleado')
    AND user_roles_v2.brand_role IS NULL
);

-- =====================================================
-- FASE 2: Tabla de tokens para KDS sin login
-- =====================================================

CREATE TABLE IF NOT EXISTS public.kds_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
    name TEXT DEFAULT 'KDS Principal',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    last_used_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_kds_tokens_branch ON public.kds_tokens(branch_id);
CREATE INDEX IF NOT EXISTS idx_kds_tokens_token ON public.kds_tokens(token) WHERE is_active = true;

-- RLS para kds_tokens
ALTER TABLE public.kds_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Franquiciado can manage kds tokens" ON public.kds_tokens;
CREATE POLICY "Franquiciado can manage kds tokens"
ON public.kds_tokens FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles_v2 ur
        WHERE ur.user_id = auth.uid() 
        AND ur.is_active = true
        AND (
            ur.brand_role = 'superadmin'
            OR (ur.local_role IN ('franquiciado', 'encargado') AND kds_tokens.branch_id = ANY(ur.branch_ids))
        )
    )
);

-- =====================================================
-- FASE 3: Funciones de verificación de permisos
-- =====================================================

-- Función para verificar si es superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles_v2
        WHERE user_id = _user_id 
        AND brand_role = 'superadmin'
        AND is_active = true
    )
$$;

-- Función para obtener rol de marca
CREATE OR REPLACE FUNCTION public.get_brand_role(_user_id UUID)
RETURNS brand_role_type
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT brand_role FROM public.user_roles_v2
    WHERE user_id = _user_id AND is_active = true
    LIMIT 1
$$;

-- Función para obtener rol local
CREATE OR REPLACE FUNCTION public.get_local_role(_user_id UUID)
RETURNS local_role_type
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT local_role FROM public.user_roles_v2
    WHERE user_id = _user_id AND is_active = true
    LIMIT 1
$$;

-- Función para verificar acceso a sucursal
CREATE OR REPLACE FUNCTION public.has_branch_access_v2(_user_id UUID, _branch_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles_v2
        WHERE user_id = _user_id 
        AND is_active = true
        AND (
            brand_role = 'superadmin'
            OR _branch_id = ANY(branch_ids)
        )
    )
$$;

-- Función para verificar PIN de autorización
CREATE OR REPLACE FUNCTION public.verify_authorization_pin(_branch_id UUID, _pin TEXT)
RETURNS TABLE(user_id UUID, full_name TEXT, local_role local_role_type)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pin_hash TEXT;
BEGIN
  v_pin_hash := encode(digest(_pin, 'sha256'), 'hex');
  
  RETURN QUERY
  SELECT 
    ur.user_id,
    p.full_name,
    ur.local_role
  FROM user_roles_v2 ur
  JOIN profiles p ON p.user_id = ur.user_id
  WHERE ur.authorization_pin_hash = v_pin_hash
    AND ur.is_active = true
    AND ur.local_role IN ('encargado', 'franquiciado')
    AND (ur.brand_role = 'superadmin' OR _branch_id = ANY(ur.branch_ids))
  LIMIT 1;
END;
$$;

-- Función para validar token KDS
CREATE OR REPLACE FUNCTION public.validate_kds_token(_token TEXT)
RETURNS TABLE(branch_id UUID, branch_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Actualizar last_used_at
  UPDATE kds_tokens SET last_used_at = now() WHERE token = _token AND is_active = true;
  
  RETURN QUERY
  SELECT kt.branch_id, b.name
  FROM kds_tokens kt
  JOIN branches b ON b.id = kt.branch_id
  WHERE kt.token = _token AND kt.is_active = true;
END;
$$;

-- =====================================================
-- FASE 4: Insertar superadmin inicial
-- =====================================================

-- Insertar rol de superadmin para juan.finocchiar@gmail.com
INSERT INTO public.user_roles_v2 (user_id, brand_role, local_role, branch_ids)
SELECT 
    u.id,
    'superadmin'::brand_role_type,
    'franquiciado'::local_role_type,
    ARRAY(SELECT id FROM branches WHERE is_active = true)
FROM auth.users u
WHERE u.email = 'juan.finocchiar@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET
    brand_role = 'superadmin',
    local_role = 'franquiciado',
    branch_ids = ARRAY(SELECT id FROM branches WHERE is_active = true),
    is_active = true;