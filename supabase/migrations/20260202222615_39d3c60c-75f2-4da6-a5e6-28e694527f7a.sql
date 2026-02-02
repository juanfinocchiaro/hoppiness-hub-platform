-- 1. Agregar columna clock_pin a user_branch_roles
ALTER TABLE user_branch_roles
ADD COLUMN clock_pin VARCHAR(4) DEFAULT NULL;

-- 2. Índice único para validación rápida (único por sucursal, solo activos con PIN)
CREATE UNIQUE INDEX idx_ubr_branch_clock_pin 
ON user_branch_roles(branch_id, clock_pin) 
WHERE clock_pin IS NOT NULL AND is_active = true;

-- 3. Migrar PINs existentes de profiles a user_branch_roles
UPDATE user_branch_roles ubr
SET clock_pin = p.clock_pin
FROM profiles p
WHERE ubr.user_id = p.id
  AND p.clock_pin IS NOT NULL
  AND ubr.is_active = true;

-- 4. Nueva función de validación por sucursal
CREATE OR REPLACE FUNCTION public.validate_clock_pin_v2(_branch_code text, _pin text)
RETURNS TABLE(user_id uuid, full_name text, branch_id uuid, branch_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ubr.user_id,
    p.full_name,
    b.id as branch_id,
    b.name as branch_name
  FROM user_branch_roles ubr
  JOIN profiles p ON p.id = ubr.user_id
  JOIN branches b ON b.clock_code = _branch_code AND b.id = ubr.branch_id
  WHERE ubr.clock_pin = _pin
    AND ubr.is_active = true
    AND b.is_active = true
  LIMIT 1;
END;
$$;

-- 5. Función para validar disponibilidad de PIN en una sucursal
CREATE OR REPLACE FUNCTION public.is_clock_pin_available(_branch_id uuid, _pin text, _exclude_user_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM user_branch_roles
    WHERE branch_id = _branch_id
      AND clock_pin = _pin
      AND is_active = true
      AND (_exclude_user_id IS NULL OR user_id != _exclude_user_id)
  )
$$;

-- 6. Permitir a usuarios actualizar su propio clock_pin
CREATE POLICY "ubr_own_update_clock_pin"
ON user_branch_roles FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());