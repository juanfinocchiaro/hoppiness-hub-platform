
-- =============================================
-- RESTRINGIR ACCESO A STAFF_INVITATIONS
-- =============================================

-- Eliminar políticas permisivas
DROP POLICY IF EXISTS "Anyone can read invitation by token" ON staff_invitations;
DROP POLICY IF EXISTS "staff_invitations_anon_read" ON staff_invitations;
DROP POLICY IF EXISTS "staff_invitations_read" ON staff_invitations;

-- 1. Usuarios autenticados pueden ver sus propias invitaciones (por email)
CREATE POLICY "staff_invitations_own_email" ON staff_invitations
FOR SELECT TO authenticated
USING (
  LOWER(email) = LOWER(auth.email())
);

-- 2. Administradores y HR pueden ver invitaciones de sus sucursales
CREATE POLICY "staff_invitations_admin_hr" ON staff_invitations
FOR SELECT TO authenticated
USING (
  is_superadmin(auth.uid())
  OR is_hr_for_branch_v2(auth.uid(), branch_id)
);

-- 3. Función segura para validar token (usada en registro)
-- Esta función permite verificar un token sin exponer toda la tabla
CREATE OR REPLACE FUNCTION public.validate_invitation_token(_token text)
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  role text,
  branch_id uuid,
  branch_name text,
  status text,
  expires_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    si.id,
    si.email,
    si.full_name,
    si.role,
    si.branch_id,
    b.name as branch_name,
    si.status,
    si.expires_at
  FROM staff_invitations si
  JOIN branches b ON b.id = si.branch_id
  WHERE si.token = _token
    AND si.status = 'pending'
    AND si.expires_at > now()
  LIMIT 1;
$$;

-- Dar permisos a anon para usar la función (necesario para registro)
GRANT EXECUTE ON FUNCTION public.validate_invitation_token(text) TO anon;
GRANT EXECUTE ON FUNCTION public.validate_invitation_token(text) TO authenticated;
