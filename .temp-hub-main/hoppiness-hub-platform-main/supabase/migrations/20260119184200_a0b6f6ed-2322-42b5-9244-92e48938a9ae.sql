-- =============================================
-- FIX SECURITY WARNINGS
-- =============================================

-- Fix customer_preferences overly permissive policy
DROP POLICY IF EXISTS "System can manage customer preferences" ON public.customer_preferences;

CREATE POLICY "Staff can manage customer preferences"
    ON public.customer_preferences FOR INSERT
    TO authenticated
    WITH CHECK (
        branch_id IS NULL AND is_admin(auth.uid()) OR
        branch_id IS NOT NULL AND has_branch_permission(auth.uid(), branch_id, 'can_manage_orders')
    );

CREATE POLICY "Staff can update customer preferences"
    ON public.customer_preferences FOR UPDATE
    TO authenticated
    USING (
        branch_id IS NULL AND is_admin(auth.uid()) OR
        branch_id IS NOT NULL AND has_branch_permission(auth.uid(), branch_id, 'can_manage_orders')
    )
    WITH CHECK (
        branch_id IS NULL AND is_admin(auth.uid()) OR
        branch_id IS NOT NULL AND has_branch_permission(auth.uid(), branch_id, 'can_manage_orders')
    );

CREATE POLICY "Staff can delete customer preferences"
    ON public.customer_preferences FOR DELETE
    TO authenticated
    USING (
        branch_id IS NULL AND is_admin(auth.uid()) OR
        branch_id IS NOT NULL AND has_branch_permission(auth.uid(), branch_id, 'can_manage_orders')
    );