-- Eliminar función existente y recrear con nombres correctos
DROP FUNCTION IF EXISTS sync_orphan_users();

CREATE OR REPLACE FUNCTION sync_orphan_users()
RETURNS TABLE(synced_user_id uuid, synced_email text, synced_action text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO profiles (id, email, full_name, created_at)
  SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', au.email),
    au.created_at
  FROM auth.users au
  WHERE NOT EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = au.id
  )
  ON CONFLICT (id) DO NOTHING
  RETURNING profiles.id, profiles.email, 'created'::text;
END;
$$;