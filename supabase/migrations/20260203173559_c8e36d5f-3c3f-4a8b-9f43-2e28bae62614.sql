-- Eliminar columna authorization_pin_hash de user_roles_v2
ALTER TABLE public.user_roles_v2 
DROP COLUMN IF EXISTS authorization_pin_hash;

-- Eliminar columna authorization_pin_hash de user_branch_roles
ALTER TABLE public.user_branch_roles 
DROP COLUMN IF EXISTS authorization_pin_hash;

-- Eliminar función de verificación de PIN de autorización
DROP FUNCTION IF EXISTS verify_authorization_pin(uuid, uuid, text);
DROP FUNCTION IF EXISTS verify_authorization_pin(uuid, text);