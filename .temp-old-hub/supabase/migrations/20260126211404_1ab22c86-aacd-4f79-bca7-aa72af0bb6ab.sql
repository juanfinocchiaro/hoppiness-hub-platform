-- ===========================================
-- FIX RAÍZ: Actualizar funciones de acceso para usar user_roles_v2
-- Sin dropear (las policies dependen de estas funciones)
-- ===========================================

-- 1. Actualizar has_branch_access manteniendo firma existente (_user_id, _branch_id)
CREATE OR REPLACE FUNCTION public.has_branch_access(_user_id uuid, _branch_id uuid)
RETURNS boolean
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

-- 2. Actualizar is_admin para usar user_roles_v2
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
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