
-- =============================================================
-- FASE A: Crear tablas nuevas y migrar datos
-- =============================================================

-- 1. Tabla roles
CREATE TABLE public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('brand', 'branch')),
  hierarchy_level INTEGER NOT NULL DEFAULT 0,
  is_system BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insertar roles de marca
INSERT INTO public.roles (key, display_name, scope, hierarchy_level, is_system) VALUES
  ('superadmin',       'Super Admin',       'brand',  100, true),
  ('coordinador',      'Coordinador',       'brand',  80,  true),
  ('community_manager','Community Manager', 'brand',  60,  true),
  ('informes',         'Informes',          'brand',  40,  true),
  ('contador_marca',   'Contador Marca',    'brand',  40,  true);

-- Insertar roles de sucursal (hierarchy matches ROLE_PRIORITY)
INSERT INTO public.roles (key, display_name, scope, hierarchy_level, is_system) VALUES
  ('franquiciado',  'Franquiciado',    'branch', 50, true),
  ('encargado',     'Encargado',       'branch', 40, true),
  ('contador_local','Contador Local',  'branch', 30, true),
  ('cajero',        'Cajero',          'branch', 20, true),
  ('empleado',      'Empleado',        'branch', 10, true);

-- RLS para roles
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read roles" ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Superadmin can manage roles" ON public.roles FOR ALL TO authenticated USING (is_superadmin(auth.uid())) WITH CHECK (is_superadmin(auth.uid()));

-- 2. Tabla permissions
CREATE TABLE public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('brand', 'local')),
  category TEXT NOT NULL,
  is_editable BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Migrar datos desde permission_config
INSERT INTO public.permissions (key, label, scope, category, is_editable)
SELECT permission_key, permission_label, scope, category, is_editable
FROM public.permission_config;

-- RLS para permissions
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read permissions" ON public.permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Superadmin can manage permissions" ON public.permissions FOR ALL TO authenticated USING (is_superadmin(auth.uid())) WITH CHECK (is_superadmin(auth.uid()));

-- 3. Tabla role_permissions (many-to-many)
CREATE TABLE public.role_permissions (
  role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- Migrar datos expandiendo allowed_roles[]
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.permission_config pc
CROSS JOIN LATERAL unnest(pc.allowed_roles) AS role_key
JOIN public.roles r ON r.key = role_key
JOIN public.permissions p ON p.key = pc.permission_key
ON CONFLICT DO NOTHING;

-- RLS para role_permissions
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read role_permissions" ON public.role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Superadmin can manage role_permissions" ON public.role_permissions FOR ALL TO authenticated USING (is_superadmin(auth.uid())) WITH CHECK (is_superadmin(auth.uid()));

-- 4. Tabla user_role_assignments
CREATE TABLE public.user_role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role_id, branch_id)
);

CREATE INDEX idx_ura_user_active ON public.user_role_assignments(user_id, is_active);
CREATE INDEX idx_ura_branch ON public.user_role_assignments(branch_id) WHERE branch_id IS NOT NULL;

-- Migrar brand roles desde user_roles_v2
INSERT INTO public.user_role_assignments (user_id, role_id, branch_id, is_active)
SELECT urv2.user_id, r.id, NULL, urv2.is_active
FROM public.user_roles_v2 urv2
JOIN public.roles r ON r.key = urv2.brand_role::text AND r.scope = 'brand'
WHERE urv2.brand_role IS NOT NULL
ON CONFLICT DO NOTHING;

-- Migrar branch roles desde user_branch_roles
INSERT INTO public.user_role_assignments (user_id, role_id, branch_id, is_active)
SELECT ubr.user_id, r.id, ubr.branch_id, ubr.is_active
FROM public.user_branch_roles ubr
JOIN public.roles r ON r.key = ubr.local_role::text AND r.scope = 'branch'
ON CONFLICT DO NOTHING;

-- RLS para user_role_assignments
ALTER TABLE public.user_role_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own assignments" ON public.user_role_assignments FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Superadmin can read all assignments" ON public.user_role_assignments FOR SELECT TO authenticated USING (is_superadmin(auth.uid()));
CREATE POLICY "HR can read branch assignments" ON public.user_role_assignments FOR SELECT TO authenticated USING (
  branch_id IS NOT NULL AND is_hr_role(auth.uid(), branch_id)
);
CREATE POLICY "Superadmin can manage assignments" ON public.user_role_assignments FOR ALL TO authenticated USING (is_superadmin(auth.uid())) WITH CHECK (is_superadmin(auth.uid()));
CREATE POLICY "HR can insert branch assignments" ON public.user_role_assignments FOR INSERT TO authenticated WITH CHECK (
  branch_id IS NOT NULL AND is_hr_role(auth.uid(), branch_id)
);
CREATE POLICY "HR can update branch assignments" ON public.user_role_assignments FOR UPDATE TO authenticated USING (
  branch_id IS NOT NULL AND is_hr_role(auth.uid(), branch_id)
);

-- =============================================================
-- FASE B: Reescribir helpers RLS para leer del nuevo modelo
-- Mantenemos tipos de retorno ENUM para compatibilidad
-- =============================================================

-- 1. is_superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_role_assignments ura
    JOIN public.roles r ON r.id = ura.role_id
    WHERE ura.user_id = _user_id
      AND r.key = 'superadmin'
      AND ura.is_active = true
  )
$$;

-- 2. get_brand_role (returns brand_role_type for backward compat)
CREATE OR REPLACE FUNCTION public.get_brand_role(_user_id uuid)
RETURNS brand_role_type
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT r.key::brand_role_type
  FROM public.user_role_assignments ura
  JOIN public.roles r ON r.id = ura.role_id
  WHERE ura.user_id = _user_id
    AND r.scope = 'brand'
    AND ura.is_active = true
    AND ura.branch_id IS NULL
  ORDER BY r.hierarchy_level DESC
  LIMIT 1
$$;

-- 3. get_local_role (legacy, returns local_role_type)
CREATE OR REPLACE FUNCTION public.get_local_role(_user_id uuid)
RETURNS local_role_type
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT r.key::local_role_type
  FROM public.user_role_assignments ura
  JOIN public.roles r ON r.id = ura.role_id
  WHERE ura.user_id = _user_id
    AND r.scope = 'branch'
    AND ura.is_active = true
    AND ura.branch_id IS NOT NULL
  ORDER BY r.hierarchy_level DESC
  LIMIT 1
$$;

-- 4. get_local_role_for_branch
CREATE OR REPLACE FUNCTION public.get_local_role_for_branch(_user_id uuid, _branch_id uuid)
RETURNS local_role_type
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT r.key::local_role_type
  FROM public.user_role_assignments ura
  JOIN public.roles r ON r.id = ura.role_id
  WHERE ura.user_id = _user_id
    AND ura.branch_id = _branch_id
    AND r.scope = 'branch'
    AND ura.is_active = true
  ORDER BY r.hierarchy_level DESC
  LIMIT 1
$$;

-- 5. has_branch_access_v2
CREATE OR REPLACE FUNCTION public.has_branch_access_v2(_user_id uuid, _branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT is_superadmin(_user_id) OR EXISTS (
    SELECT 1
    FROM public.user_role_assignments ura
    WHERE ura.user_id = _user_id
      AND ura.branch_id = _branch_id
      AND ura.is_active = true
  )
$$;

-- 6. can_access_branch
CREATE OR REPLACE FUNCTION public.can_access_branch(_user_id uuid, _branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT is_superadmin(_user_id) OR EXISTS (
    SELECT 1
    FROM public.user_role_assignments ura
    WHERE ura.user_id = _user_id
      AND ura.branch_id = _branch_id
      AND ura.is_active = true
  )
$$;

-- 7. is_hr_role
CREATE OR REPLACE FUNCTION public.is_hr_role(_user_id uuid, _branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT is_superadmin(_user_id) OR EXISTS (
    SELECT 1
    FROM public.user_role_assignments ura
    JOIN public.roles r ON r.id = ura.role_id
    WHERE ura.user_id = _user_id
      AND ura.branch_id = _branch_id
      AND r.key IN ('franquiciado', 'encargado')
      AND ura.is_active = true
  )
$$;

-- 8. is_branch_manager_v2
CREATE OR REPLACE FUNCTION public.is_branch_manager_v2(_user_id uuid, _branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_role_assignments ura
    JOIN public.roles r ON r.id = ura.role_id
    WHERE ura.user_id = _user_id
      AND ura.branch_id = _branch_id
      AND r.key IN ('encargado', 'franquiciado')
      AND ura.is_active = true
  )
$$;

-- 9. is_financial_for_branch
CREATE OR REPLACE FUNCTION public.is_financial_for_branch(_user_id uuid, _branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT is_superadmin(_user_id) OR EXISTS (
    SELECT 1
    FROM public.user_role_assignments ura
    JOIN public.roles r ON r.id = ura.role_id
    WHERE ura.user_id = _user_id
      AND ura.is_active = true
      AND (
        (r.key = 'contador_marca' AND r.scope = 'brand')
        OR (r.key IN ('franquiciado', 'encargado', 'contador_local') AND ura.branch_id = _branch_id)
      )
  )
$$;

-- 10. is_franquiciado_or_contador_for_branch
CREATE OR REPLACE FUNCTION public.is_franquiciado_or_contador_for_branch(p_user_id uuid, p_branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_role_assignments ura
    JOIN public.roles r ON r.id = ura.role_id
    WHERE ura.user_id = p_user_id
      AND ura.branch_id = p_branch_id
      AND r.key IN ('franquiciado', 'contador_local')
      AND ura.is_active = true
  )
$$;
