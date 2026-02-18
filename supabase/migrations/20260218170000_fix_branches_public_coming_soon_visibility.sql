-- Ensure coming_soon branches are visible on public pages,
-- even when legacy rows still have is_active = false.

-- 1) Public read policy for anon users
DROP POLICY IF EXISTS "branches_anon_read" ON public.branches;

CREATE POLICY "branches_anon_read" ON public.branches
FOR SELECT
TO anon
USING (
  public_status = 'coming_soon'
  OR (public_status = 'active' AND is_active = true)
);

-- 2) Rebuild branches_public view with explicit public statuses
DROP VIEW IF EXISTS public.branches_public;

CREATE VIEW public.branches_public
WITH (security_invoker = true)
AS
SELECT
  id,
  name,
  address,
  city,
  slug,
  opening_time,
  closing_time,
  is_active,
  is_open,
  local_open_state,
  public_status,
  public_hours
FROM public.branches
WHERE public_status IN ('active', 'coming_soon');

GRANT SELECT ON public.branches_public TO anon, authenticated;
