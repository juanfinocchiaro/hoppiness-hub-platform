-- =====================================================
-- CREAR SOLO FUNCIONES NUEVAS (sin tocar has_branch_access_v2)
-- =====================================================

-- Función para verificar si es superadmin
CREATE OR REPLACE FUNCTION public.is_admin_v2(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles_v2
    WHERE user_id = user_uuid
    AND is_active = true
    AND brand_role = 'superadmin'
  );
$$;

-- Función combinada: rol de marca O rol local con acceso a sucursal
CREATE OR REPLACE FUNCTION public.is_hr_manager(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles_v2
    WHERE user_id = user_uuid
    AND is_active = true
    AND (
      brand_role IN ('superadmin', 'coordinador')
      OR local_role IN ('franquiciado', 'encargado')
    )
  );
$$;

-- Función para verificar si es manager financiero
CREATE OR REPLACE FUNCTION public.is_financial_manager(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles_v2
    WHERE user_id = user_uuid
    AND is_active = true
    AND (
      brand_role IN ('superadmin', 'contador_marca')
      OR local_role IN ('franquiciado', 'encargado', 'contador_local')
    )
  );
$$;