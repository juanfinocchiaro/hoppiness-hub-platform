-- Política para que usuarios anónimos (landing pública) puedan ver sucursales activas
-- Solo permite SELECT de campos públicos, no modifica datos sensibles

CREATE POLICY "branches_public_read" ON public.branches
  FOR SELECT
  TO anon
  USING (is_active = true);