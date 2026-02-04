-- Actualizar función is_hr_for_branch para usar user_branch_roles
-- Esta función es usada por las políticas RLS de employee_data

CREATE OR REPLACE FUNCTION public.is_hr_for_branch(_user_id uuid, _branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT is_superadmin(_user_id) OR EXISTS (
    SELECT 1 FROM public.user_branch_roles
    WHERE user_id = _user_id
    AND branch_id = _branch_id
    AND local_role IN ('franquiciado', 'encargado')
    AND is_active = true
  )
$$;

-- Limpiar políticas RLS duplicadas en employee_data
-- Eliminamos las que se solapan y dejamos las que usan la función corregida

DROP POLICY IF EXISTS "Franquiciado and Encargado can manage employee_data" ON public.employee_data;
DROP POLICY IF EXISTS "Superadmin can manage all employee_data" ON public.employee_data;
DROP POLICY IF EXISTS "Users can view own employee_data" ON public.employee_data;
DROP POLICY IF EXISTS "employee_data_hr" ON public.employee_data;
DROP POLICY IF EXISTS "employee_data_select_v2" ON public.employee_data;