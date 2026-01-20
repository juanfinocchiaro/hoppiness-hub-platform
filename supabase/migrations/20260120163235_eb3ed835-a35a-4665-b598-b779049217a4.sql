
-- FIX 1: Remove default role creation from handle_new_user trigger
-- Users should only get roles via invitations or explicit assignment
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create profile, NO default role
    INSERT INTO public.profiles (user_id, full_name, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.email
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- FIX 2: Add RLS policy for users to accept invitations (insert their own role)
-- This allows the invitation acceptance flow to work
CREATE POLICY "Users can accept invitation and create own role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.user_invitations ui
        WHERE ui.email = (SELECT email FROM auth.users WHERE id = auth.uid())
        AND ui.role::text = role::text
        AND ui.branch_id = user_roles.branch_id
        AND ui.accepted_at IS NULL
        AND ui.expires_at > now()
    )
);
