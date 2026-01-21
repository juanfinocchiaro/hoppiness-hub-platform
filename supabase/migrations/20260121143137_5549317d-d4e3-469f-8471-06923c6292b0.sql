-- Make has_branch_access include admins (so admin users can operate without explicit branch mapping)
CREATE OR REPLACE FUNCTION public.has_branch_access(_user_id uuid, _branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT (
    public.is_admin(_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.user_branch_access
      WHERE user_id = _user_id
        AND branch_id = _branch_id
    )
  );
$$;