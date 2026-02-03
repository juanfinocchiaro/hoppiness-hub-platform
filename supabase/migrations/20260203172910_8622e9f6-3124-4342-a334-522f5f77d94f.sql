-- Función para sincronizar usuarios de auth.users que no tienen profile
CREATE OR REPLACE FUNCTION sync_orphan_users()
RETURNS TABLE(user_id uuid, email text, action text)
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
  RETURNING id, email, 'created'::text;
END;
$$;

-- Mejorar el trigger handle_new_user con manejo de errores robusto
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    NEW.created_at
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;