-- =====================================================
-- FASE 1: Unificar profiles.id con auth.users.id
-- Orden correcto: eliminar dependencias ANTES del DROP COLUMN
-- =====================================================

-- 1. Primero actualizar id = user_id para todos los registros
UPDATE profiles SET id = user_id;

-- 2. Eliminar la vista que depende de user_id
DROP VIEW IF EXISTS profiles_public;

-- 3. Eliminar TODAS las políticas RLS que dependen de user_id
DROP POLICY IF EXISTS "Profiles can be created on signup" ON profiles;
DROP POLICY IF EXISTS "Users view own profile or HR managers view staff" ON profiles;
DROP POLICY IF EXISTS "profiles_own_select" ON profiles;
DROP POLICY IF EXISTS "profiles_hr_select" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_v2" ON profiles;
DROP POLICY IF EXISTS "profiles_update_v2" ON profiles;

-- 4. Ahora sí eliminar el campo user_id
ALTER TABLE profiles DROP COLUMN user_id;

-- 5. Recrear la vista profiles_public usando solo id
CREATE VIEW profiles_public AS
SELECT 
    id,
    id as user_id,  -- Alias para compatibilidad temporal
    full_name,
    avatar_url,
    is_active
FROM profiles;

-- 6. Actualizar el trigger para nuevos usuarios
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.email
    );
    RETURN NEW;
END;
$$;

-- 7. Crear políticas RLS limpias usando solo id
CREATE POLICY "profiles_insert" ON profiles 
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_select_own" ON profiles 
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "profiles_select_admin" ON profiles 
  FOR SELECT USING (is_superadmin(auth.uid()));

CREATE POLICY "profiles_select_hr" ON profiles 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_branch_roles ubr_viewer
      JOIN user_branch_roles ubr_target ON ubr_target.user_id = profiles.id
      WHERE ubr_viewer.user_id = auth.uid()
      AND ubr_viewer.is_active = true
      AND ubr_viewer.local_role IN ('encargado', 'franquiciado')
      AND ubr_viewer.branch_id = ubr_target.branch_id
    )
  );

CREATE POLICY "profiles_update_own" ON profiles 
  FOR UPDATE USING (id = auth.uid()) 
  WITH CHECK (id = auth.uid());