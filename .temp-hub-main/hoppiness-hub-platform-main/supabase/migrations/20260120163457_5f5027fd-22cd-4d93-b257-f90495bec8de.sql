
-- Fix infinite recursion in RLS policies for user_roles
-- The problem: is_admin() -> has_role() -> queries user_roles -> triggers RLS -> is_admin()...

-- Drop problematic policies that cause recursion
DROP POLICY IF EXISTS "Admin can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admin can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Branch managers can view branch roles" ON public.user_roles;
DROP POLICY IF EXISTS "Franchisee can manage branch roles" ON public.user_roles;

-- Create simple non-recursive policies
-- Policy 1: Users can always view their own roles (no function call needed)
-- Already exists: "Users can view own role" and "Users can view own roles"

-- Policy 2: Admin check using direct subquery (no function calls)
CREATE POLICY "Admins full access to user_roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() 
        AND ur.role = 'admin'
        AND ur.is_active = true
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() 
        AND ur.role = 'admin'
        AND ur.is_active = true
    )
);

-- Policy 3: Franquiciados can manage their branch staff (direct subquery)
CREATE POLICY "Franchisees can manage branch staff"
ON public.user_roles
FOR ALL
TO authenticated
USING (
    role::text IN ('kds', 'cajero', 'encargado', 'empleado')
    AND branch_id IN (
        SELECT ur.branch_id FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() 
        AND ur.role = 'franquiciado'
        AND ur.is_active = true
    )
)
WITH CHECK (
    role::text IN ('kds', 'cajero', 'encargado', 'empleado')
    AND branch_id IN (
        SELECT ur.branch_id FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() 
        AND ur.role = 'franquiciado'
        AND ur.is_active = true
    )
);
