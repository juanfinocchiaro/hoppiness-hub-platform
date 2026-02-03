-- =============================================
-- LIMPIEZA DE POLÍTICAS RLS REDUNDANTES/PERMISIVAS
-- =============================================

-- ========== 1. COMMUNICATIONS ==========
-- Eliminar políticas permisivas/redundantes
DROP POLICY IF EXISTS "Staff can view published communications" ON communications;
DROP POLICY IF EXISTS "communications_select_v2" ON communications;
DROP POLICY IF EXISTS "communications_admin_v2" ON communications;

-- Mantener solo las políticas específicas que ya existen:
-- - "Brand admins can manage brand communications" 
-- - "Local managers can manage local communications"
-- - "Superadmin can manage communications"
-- - "Users can view relevant communications" (esta ya filtra por rol y sucursal)

-- ========== 2. CONTACT_MESSAGES ==========
-- Consolidar 4 políticas INSERT redundantes en 1 sola
DROP POLICY IF EXISTS "contact_messages_public_insert" ON contact_messages;
DROP POLICY IF EXISTS "contact_messages_insert_public" ON contact_messages;
DROP POLICY IF EXISTS "contact_messages_anon_insert" ON contact_messages;
DROP POLICY IF EXISTS "contact_messages_auth_insert" ON contact_messages;

-- Crear una sola política con validación (no WITH CHECK true)
CREATE POLICY "contact_messages_public_submit" ON contact_messages
FOR INSERT TO anon, authenticated
WITH CHECK (
  email IS NOT NULL 
  AND phone IS NOT NULL 
  AND name IS NOT NULL 
  AND subject IS NOT NULL
);

-- ========== 3. REGULATION_SIGNATURES ==========
-- Reemplazar política permisiva por una con validación adecuada
DROP POLICY IF EXISTS "regulation_signatures_insert_v2" ON regulation_signatures;

-- Solo usuarios autenticados pueden insertar firmas (de sí mismos o HR de su sucursal)
CREATE POLICY "regulation_signatures_insert_validated" ON regulation_signatures
FOR INSERT TO authenticated
WITH CHECK (
  user_id IS NOT NULL 
  AND regulation_id IS NOT NULL
  AND branch_id IS NOT NULL
  AND (
    uploaded_by = auth.uid()  -- El que sube es el autenticado
    OR is_superadmin(auth.uid())
    OR is_hr_for_branch_v2(auth.uid(), branch_id)
  )
);