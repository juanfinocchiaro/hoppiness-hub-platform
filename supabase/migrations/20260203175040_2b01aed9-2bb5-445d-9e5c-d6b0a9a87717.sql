-- =============================================
-- CORREGIR: special_days solo para staff autenticado
-- =============================================

-- Eliminar políticas permisivas
DROP POLICY IF EXISTS "Anyone can view special days" ON special_days;
DROP POLICY IF EXISTS "special_days_select_v2" ON special_days;

-- Crear política restrictiva para staff autenticado
CREATE POLICY "special_days_staff_select" ON special_days
FOR SELECT TO authenticated
USING (is_staff(auth.uid()));