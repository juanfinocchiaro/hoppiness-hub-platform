-- Fix RLS recursion on user_roles_v2 by removing policies that query user_roles_v2 within themselves

-- Drop recursive policies
DROP POLICY IF EXISTS "Superadmin can manage all roles" ON public.user_roles_v2;
DROP POLICY IF EXISTS "Franquiciado can manage local subordinates" ON public.user_roles_v2;
DROP POLICY IF EXISTS "Encargado can manage cajero and empleado" ON public.user_roles_v2;

-- Keep (or recreate) the safe self-select policy
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles_v2;
CREATE POLICY "Users can view own role"
ON public.user_roles_v2
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Superadmin full access (uses SECURITY DEFINER function -> no recursion)
CREATE POLICY "Superadmin can manage all roles"
ON public.user_roles_v2
FOR ALL
TO authenticated
USING (public.is_superadmin(auth.uid()))
WITH CHECK (public.is_superadmin(auth.uid()));

-- Franquiciado can manage local roles in their branches (no table self-query)
CREATE POLICY "Franquiciado can manage local subordinates"
ON public.user_roles_v2
FOR ALL
TO authenticated
USING (
  public.get_local_role(auth.uid()) = 'franquiciado'::public.local_role_type
  AND brand_role IS NULL
  AND local_role IN ('encargado'::public.local_role_type, 'contador_local'::public.local_role_type, 'cajero'::public.local_role_type, 'empleado'::public.local_role_type)
  AND EXISTS (
    SELECT 1
    FROM unnest(branch_ids) AS b(branch_id)
    WHERE public.has_branch_access_v2(auth.uid(), b.branch_id)
  )
)
WITH CHECK (
  public.get_local_role(auth.uid()) = 'franquiciado'::public.local_role_type
  AND brand_role IS NULL
  AND local_role IN ('encargado'::public.local_role_type, 'contador_local'::public.local_role_type, 'cajero'::public.local_role_type, 'empleado'::public.local_role_type)
  AND EXISTS (
    SELECT 1
    FROM unnest(branch_ids) AS b(branch_id)
    WHERE public.has_branch_access_v2(auth.uid(), b.branch_id)
  )
);

-- Encargado can manage cajero/empleado in their branches (no table self-query)
CREATE POLICY "Encargado can manage cajero and empleado"
ON public.user_roles_v2
FOR ALL
TO authenticated
USING (
  public.get_local_role(auth.uid()) = 'encargado'::public.local_role_type
  AND brand_role IS NULL
  AND local_role IN ('cajero'::public.local_role_type, 'empleado'::public.local_role_type)
  AND EXISTS (
    SELECT 1
    FROM unnest(branch_ids) AS b(branch_id)
    WHERE public.has_branch_access_v2(auth.uid(), b.branch_id)
  )
)
WITH CHECK (
  public.get_local_role(auth.uid()) = 'encargado'::public.local_role_type
  AND brand_role IS NULL
  AND local_role IN ('cajero'::public.local_role_type, 'empleado'::public.local_role_type)
  AND EXISTS (
    SELECT 1
    FROM unnest(branch_ids) AS b(branch_id)
    WHERE public.has_branch_access_v2(auth.uid(), b.branch_id)
  )
);
