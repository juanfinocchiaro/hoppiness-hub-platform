

# Plan Óptimo Definitivo: Unificar a Patrón Supabase Estándar

## Diagnóstico Final

### Estructura Actual (Incorrecta)
```
profiles
├── id         → gen_random_uuid() [DIFERENTE de auth.users.id]
├── user_id    → auth.users.id [REFERENCIA REAL]
```

### Patrón Oficial de Supabase
```
profiles
├── id         → auth.users.id [ES LO MISMO, NO EXISTE user_id]
```

### El Problema
- **30 profiles** todos tienen `id ≠ user_id`
- El código mezcla `.eq('id', ...)` y `.eq('user_id', ...)`
- Las políticas RLS también mezclan ambos campos
- Esto causa bugs recurrentes e inevitables

---

## Solución Óptima: Eliminar `user_id`, Usar Solo `id`

La solución más limpia es adoptar el patrón estándar de Supabase:
1. Hacer que `profiles.id = auth.users.id`
2. Eliminar el campo `user_id` (redundante)
3. Actualizar todo el código para usar `id`

### Por Qué Esta es la Mejor Opción

| Aspecto | Mantener Ambos | Eliminar user_id |
|---------|----------------|------------------|
| Confusión futura | Sigue existiendo | Eliminada |
| Estándar Supabase | No cumple | Cumple |
| Código duplicado | Sí (mezcla) | No |
| RLS policies | Confusas | Claras |
| Docs/Tutoriales | No aplican | Aplican directo |

---

## Plan de Implementación en 3 Fases

### Fase 1: Migración de Base de Datos

```sql
-- 1. Actualizar id = user_id para todos los registros existentes
UPDATE profiles SET id = user_id;

-- 2. Eliminar el campo user_id (ya no es necesario)
ALTER TABLE profiles DROP COLUMN user_id;

-- 3. Actualizar el trigger para nuevos usuarios
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email)
    VALUES (
        NEW.id,  -- id = auth.users.id directamente
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.email
    );
    RETURN NEW;
END;
$$;

-- 4. Recrear políticas RLS usando solo id
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_v2" ON profiles;
DROP POLICY IF EXISTS "profiles_own_select" ON profiles;
DROP POLICY IF EXISTS "profiles_select_v2" ON profiles;
DROP POLICY IF EXISTS "Profiles can be created on signup" ON profiles;
DROP POLICY IF EXISTS "Users view own profile or HR managers view staff" ON profiles;
DROP POLICY IF EXISTS "profiles_hr_select" ON profiles;

-- Crear políticas limpias
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
```

### Fase 2: Actualizar Código (13+ archivos)

Todos los archivos que usan `.eq('user_id', ...)` o `p.user_id` deben cambiar a usar `id`:

| Archivo | Cambio |
|---------|--------|
| `src/pages/cuenta/CuentaDashboard.tsx` | `.eq('user_id', user.id)` → `.eq('id', user.id)` |
| `src/pages/cuenta/CuentaPerfil.tsx` | Ídem |
| `src/hooks/useContextualHelp.ts` | Ídem |
| `src/hooks/usePermissionsV2.ts` | Sin cambio (usa otras tablas) |
| `src/components/cuenta/*.tsx` | Ídem |
| `src/components/local/team/useTeamData.ts` | Ya corregido: usa `id` |
| `src/components/hr/PendingScheduleRequests.tsx` | `p.user_id` → `p.id` |
| `src/components/local/RegulationSignaturesPanel.tsx` | Ídem |
| `src/components/local/ManagerDashboard.tsx` | Ídem |
| `src/components/admin/users/useUsersData.ts` | Ídem |
| `src/hooks/useMonthlyHours.ts` | Ídem |
| `src/hooks/useSalaryAdvances.ts` | Ídem |
| Todas las Edge Functions que usen profiles | Ídem |

### Fase 3: Actualizar Documentación

**Archivo: `docs/LOVABLE_RULES.md`**

Agregar sección:

```markdown
## ESTRUCTURA DE PROFILES (Patrón Supabase Estándar)

La tabla `profiles` sigue el patrón oficial de Supabase:

- `profiles.id` = `auth.users.id` (son el mismo UUID)
- NO existe campo `user_id` separado
- Todas las queries usan `.eq('id', userId)`

Ejemplo correcto:
const { data } = await supabase
  .from('profiles')
  .select('id, full_name, email')
  .eq('id', user.id);  // ← Siempre 'id'

En Maps de profiles:
const profileMap = new Map(profiles.map(p => [p.id, p]));
```

---

## Fase Adicional: Vincular Usuarios Faltantes

Los 4 usuarios ya existen pero no están en `user_branch_roles` para General Paz:

```sql
INSERT INTO user_branch_roles (user_id, branch_id, local_role, is_active)
SELECT p.id, si.branch_id, si.role::local_role_type, true
FROM staff_invitations si
JOIN profiles p ON LOWER(p.email) = LOWER(si.email)
WHERE si.status = 'pending'
  AND NOT EXISTS (
    SELECT 1 FROM user_branch_roles ubr 
    WHERE ubr.user_id = p.id AND ubr.branch_id = si.branch_id
  );

UPDATE staff_invitations 
SET status = 'accepted', accepted_at = now()
WHERE status = 'pending'
  AND EXISTS (SELECT 1 FROM profiles p WHERE LOWER(p.email) = LOWER(staff_invitations.email));
```

---

## Archivos a Modificar

| Archivo | Tipo de Cambio |
|---------|----------------|
| Base de datos | Migración: eliminar `user_id`, actualizar `id` |
| `docs/LOVABLE_RULES.md` | Documentar patrón estándar |
| 13+ archivos TypeScript | Reemplazar `user_id` → `id` |
| 2+ Edge Functions | Reemplazar `user_id` → `id` |
| Políticas RLS | Recrear usando solo `id` |

---

## Resultado Final

Después de la implementación:

1. **Estructura limpia:** `profiles.id = auth.users.id` (sin campo extra)
2. **Cero confusión:** Solo existe `id`, imposible equivocarse
3. **Estándar Supabase:** Compatible con toda la documentación oficial
4. **Código consistente:** Todo usa `.eq('id', ...)` o `p.id`
5. **RLS claras:** Todas las políticas usan `id = auth.uid()`

---

## Sección Técnica

### Riesgo de la Migración

La migración es segura porque:
1. `profiles.user_id` tiene constraint UNIQUE
2. No hay FKs apuntando a `profiles.id` desde otras tablas
3. El UPDATE `SET id = user_id` mantiene integridad referencial con auth.users

### Rollback

Si algo falla:
```sql
-- Agregar user_id de vuelta
ALTER TABLE profiles ADD COLUMN user_id uuid REFERENCES auth.users(id);
UPDATE profiles SET user_id = id;
```

### Orden de Ejecución

1. Migración SQL (modifica estructura)
2. Deploy Edge Functions (usan nueva estructura)
3. Actualizar código frontend (13+ archivos)
4. Vincular usuarios faltantes
5. Actualizar documentación

