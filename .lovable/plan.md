
# Plan: Sincronizar Usuarios Huérfanos y Prevenir Futuros Problemas

## Problema Identificado

El usuario `isanfundaro@gmail.com` existe en `auth.users` (confirmado por el error "ya está registrado") pero **no existe en `profiles`**, por lo que no aparece en la lista de usuarios del panel de administración.

El sistema actual:
1. Tiene un trigger `on_auth_user_created` que DEBERÍA crear el perfil automáticamente
2. El trigger está correctamente configurado (SECURITY DEFINER, owner postgres)
3. Los 30 usuarios existentes fueron creados correctamente con este sistema

Sin embargo, hay al menos un usuario "huérfano" que no tiene su perfil correspondiente.

---

## Solución Propuesta

### Parte 1: Sincronización Inmediata (One-time fix)

Crear una función administrativa que sincronice todos los usuarios huérfanos:

```sql
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
```

### Parte 2: Ejecutar la Sincronización

Una vez creada la función, ejecutar:

```sql
SELECT * FROM sync_orphan_users();
```

Esto creará perfiles para todos los usuarios huérfanos, incluyendo `isanfundaro@gmail.com`.

### Parte 3: Hacer el Trigger Más Robusto

Modificar el trigger para que maneje errores de forma más elegante y tenga logging:

```sql
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
  ON CONFLICT (id) DO NOTHING;  -- Prevenir errores si ya existe
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log el error pero no fallar el signup
  RAISE WARNING 'handle_new_user failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;
```

---

## Archivos a Modificar

Ninguno - todo es cambio en base de datos via migración SQL.

---

## Pasos de Implementación

1. **Crear migración SQL** con:
   - Función `sync_orphan_users()`
   - Actualización del trigger `handle_new_user` con manejo de errores
   
2. **Ejecutar sincronización** llamando a `sync_orphan_users()` una vez

3. **Verificar** que `isanfundaro@gmail.com` aparece en la lista de usuarios

---

## Beneficios

- Soluciona el problema inmediato de usuarios huérfanos
- Previene problemas futuros con manejo de errores robusto
- No requiere cambios en el código frontend
- Es idempotente (se puede ejecutar múltiples veces sin efectos secundarios)

---

## Riesgo

Bajo - La función usa `ON CONFLICT DO NOTHING` para evitar duplicados y el trigger mejorado tiene manejo de excepciones.
