
-- =============================================
-- RESTRINGIR ACCESO PÚBLICO A BRANCHES
-- =============================================

-- 1. Eliminar políticas anónimas de la tabla branches
DROP POLICY IF EXISTS "branches_anon_read" ON branches;
DROP POLICY IF EXISTS "branches_anon_select" ON branches;

-- 2. Recrear la vista pública con SOLO campos necesarios para la landing
-- (sin email, phone, GPS exacto, clock_code)
DROP VIEW IF EXISTS branches_public;

CREATE VIEW branches_public AS
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
  -- Excluidos: phone, email, latitude, longitude, clock_code, expense_pin_threshold, etc.
FROM branches
WHERE is_active = true 
  AND public_status IN ('active', 'coming_soon');

-- 3. Dar permiso de lectura a anon y authenticated en la vista
GRANT SELECT ON branches_public TO anon;
GRANT SELECT ON branches_public TO authenticated;

-- 4. Función segura para obtener datos de contacto (solo staff)
CREATE OR REPLACE FUNCTION public.get_branch_contact_info(_branch_id uuid)
RETURNS TABLE (
  phone text,
  email text,
  latitude numeric,
  longitude numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    b.phone,
    b.email,
    b.latitude,
    b.longitude
  FROM branches b
  WHERE b.id = _branch_id
    AND (
      is_superadmin(auth.uid())
      OR can_access_branch(auth.uid(), _branch_id)
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_branch_contact_info(uuid) TO authenticated;
