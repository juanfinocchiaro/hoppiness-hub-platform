
-- Función para obtener datos de branch para fichaje (incluye GPS)
-- Esta función es pública porque el fichaje se hace ANTES de autenticarse
-- pero solo devuelve datos si el clock_code es válido
CREATE OR REPLACE FUNCTION public.get_branch_for_clock(_clock_code text)
RETURNS TABLE (
  id uuid,
  name text,
  clock_code text,
  latitude numeric,
  longitude numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    b.id,
    b.name,
    b.clock_code::text,
    b.latitude,
    b.longitude
  FROM branches b
  WHERE b.clock_code = _clock_code
    AND b.is_active = true
  LIMIT 1;
$$;

-- Permitir acceso anónimo (el fichaje es antes de login)
GRANT EXECUTE ON FUNCTION public.get_branch_for_clock(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_branch_for_clock(text) TO authenticated;
