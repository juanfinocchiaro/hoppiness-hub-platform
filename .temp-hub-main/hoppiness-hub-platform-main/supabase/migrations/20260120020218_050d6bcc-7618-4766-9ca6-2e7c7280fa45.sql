-- =============================================
-- SIMPLIFICAR MODELO: Panel Access + Scope
-- =============================================

-- 1) Crear tabla user_panel_access para flags de modo y scope
CREATE TABLE public.user_panel_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Modos de panel habilitados
  can_use_local_panel BOOLEAN NOT NULL DEFAULT false,
  can_use_brand_panel BOOLEAN NOT NULL DEFAULT false,
  
  -- Scope de marca (acceso global a datos de marca)
  brand_access BOOLEAN NOT NULL DEFAULT false,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) Tabla para branch_access (lista de sucursales permitidas)
CREATE TABLE public.user_branch_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, branch_id)
);

-- 3) Enable RLS
ALTER TABLE public.user_panel_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_branch_access ENABLE ROW LEVEL SECURITY;

-- 4) Security definer functions para evitar recursión
CREATE OR REPLACE FUNCTION public.can_use_local_panel(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT can_use_local_panel FROM public.user_panel_access WHERE user_id = _user_id),
    false
  )
$$;

CREATE OR REPLACE FUNCTION public.can_use_brand_panel(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT can_use_brand_panel FROM public.user_panel_access WHERE user_id = _user_id),
    false
  )
$$;

CREATE OR REPLACE FUNCTION public.has_brand_access(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT brand_access FROM public.user_panel_access WHERE user_id = _user_id),
    false
  )
$$;

CREATE OR REPLACE FUNCTION public.has_branch_access(_user_id UUID, _branch_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_branch_access 
    WHERE user_id = _user_id AND branch_id = _branch_id
  )
$$;

-- 5) RLS Policies para user_panel_access
CREATE POLICY "Users can view own panel access"
ON public.user_panel_access FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all panel access"
ON public.user_panel_access FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage panel access"
ON public.user_panel_access FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 6) RLS Policies para user_branch_access
CREATE POLICY "Users can view own branch access"
ON public.user_branch_access FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all branch access"
ON public.user_branch_access FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage branch access"
ON public.user_branch_access FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 7) Trigger para updated_at
CREATE TRIGGER update_user_panel_access_updated_at
BEFORE UPDATE ON public.user_panel_access
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 8) Migrar datos existentes: usuarios con roles admin/coordinador/socio -> brand_panel
-- Usuarios con permisos de sucursal -> local_panel + branch_access
INSERT INTO public.user_panel_access (user_id, can_use_local_panel, can_use_brand_panel, brand_access)
SELECT DISTINCT 
  ur.user_id,
  -- can_use_local_panel: si tiene permisos de sucursal o es encargado/cajero/kds
  COALESCE(
    EXISTS(SELECT 1 FROM public.branch_permissions bp WHERE bp.user_id = ur.user_id) OR
    EXISTS(SELECT 1 FROM public.user_branch_permissions ubp WHERE ubp.user_id = ur.user_id) OR
    ur.role IN ('encargado', 'gerente', 'cajero', 'empleado', 'kds'),
    false
  ),
  -- can_use_brand_panel: admin, coordinador, socio, franquiciado
  ur.role IN ('admin', 'coordinador', 'socio', 'franquiciado'),
  -- brand_access: admin, coordinador, socio tienen acceso global
  ur.role IN ('admin', 'coordinador', 'socio')
FROM public.user_roles ur
ON CONFLICT (user_id) DO NOTHING;

-- Migrar branch_access desde branch_permissions y user_branch_permissions
INSERT INTO public.user_branch_access (user_id, branch_id)
SELECT DISTINCT user_id, branch_id 
FROM public.branch_permissions
WHERE user_id IS NOT NULL AND branch_id IS NOT NULL
ON CONFLICT (user_id, branch_id) DO NOTHING;

INSERT INTO public.user_branch_access (user_id, branch_id)
SELECT DISTINCT user_id, branch_id 
FROM public.user_branch_permissions
WHERE user_id IS NOT NULL AND branch_id IS NOT NULL
ON CONFLICT (user_id, branch_id) DO NOTHING;