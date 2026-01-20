
-- Drop the problematic recursive policies
DROP POLICY IF EXISTS "Admins full access to user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Franchisees can manage branch staff" ON public.user_roles;

-- Create a SECURITY DEFINER function to check admin status without triggering RLS
CREATE OR REPLACE FUNCTION public.check_is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
    AND role = 'admin'
    AND is_active = true
  )
$$;

-- Create a SECURITY DEFINER function to check franquiciado role for a branch
CREATE OR REPLACE FUNCTION public.check_is_franquiciado_for_branch(_user_id uuid, _branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
    AND branch_id = _branch_id
    AND role = 'franquiciado'
    AND is_active = true
  )
$$;

-- Policy: Admins have full access (using SECURITY DEFINER function)
CREATE POLICY "Admins full access to user_roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.check_is_admin(auth.uid()))
WITH CHECK (public.check_is_admin(auth.uid()));

-- Policy: Franchisees can manage their branch staff
CREATE POLICY "Franchisees can manage branch staff"
ON public.user_roles
FOR ALL
TO authenticated
USING (
    role::text IN ('kds', 'cajero', 'encargado', 'empleado')
    AND public.check_is_franquiciado_for_branch(auth.uid(), branch_id)
)
WITH CHECK (
    role::text IN ('kds', 'cajero', 'encargado', 'empleado')
    AND public.check_is_franquiciado_for_branch(auth.uid(), branch_id)
);
