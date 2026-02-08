
# Análisis Completo: Error RLS en Fichaje de Dalma Ledesma

## El Error
```
new row violates row-level security policy for table "clock_entries"
```

---

## CAUSA RAÍZ IDENTIFICADA

**El problema fundamental**: La página `/fichaje/:branchCode` es **PÚBLICA** (no requiere login), pero el INSERT a `clock_entries` se hace directamente con el cliente Supabase desde el frontend.

La política RLS vigente para INSERT es:
```sql
WITH CHECK ((user_id = auth.uid()) AND can_access_branch(auth.uid(), branch_id))
```

**Cuando Dalma ficha:**
1. No hay sesión de autenticación activa → `auth.uid()` = NULL
2. La validación del PIN usa una función `SECURITY DEFINER` que sí funciona
3. Pero el INSERT posterior usa el cliente anónimo
4. NULL ≠ '056919fb-abde-43bc-972c-a0610a52f694' → **RLS BLOQUEADO**

---

## 10 RAZONES POSIBLES DEL ERROR

| # | Razón | Aplica a Dalma |
|---|-------|----------------|
| 1 | **No hay sesión de auth activa** (usuario no logueado) | ✅ CAUSA PRINCIPAL |
| 2 | El `user_id` enviado en el insert no coincide con `auth.uid()` | ✅ Consecuencia de #1 |
| 3 | La función `can_access_branch()` retorna false | ❌ No llega a evaluarse |
| 4 | El usuario no existe en `user_branch_roles` | ❌ Dalma sí existe y está activa |
| 5 | El `branch_id` es incorrecto o no coincide | ❌ Viene del PIN validado |
| 6 | Política RLS mal configurada (falta `OR` para casos anónimos) | ✅ DISEÑO ACTUAL |
| 7 | Error de tipado en UUID (string vs uuid) | ❌ Tipos correctos |
| 8 | Conflicto entre múltiples políticas RLS | ❌ Solo hay 1 policy de INSERT |
| 9 | El empleado está desactivado (`is_active = false`) | ❌ Dalma está activa |
| 10 | Timeout o error de red que corrompe la sesión | ❌ Error es consistente |

**Conclusión**: Las razones #1, #2 y #6 son las causantes directas.

---

## 5 SOLUCIONES POSIBLES

### Solución 1: Crear Edge Function para Fichaje (RECOMENDADA)
Crear una función serverless `register-clock-entry` que:
- Reciba PIN + branch_code + entry_type
- Valide el PIN internamente
- Inserte con `SECURITY DEFINER` / service role
- No dependa de sesión de usuario

**Pros**: Seguro, el frontend no toca datos directamente
**Contras**: Requiere nueva edge function

### Solución 2: Agregar Política RLS Permisiva para Fichaje
```sql
CREATE POLICY "clock_entries_insert_validated_pin"
ON clock_entries FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_branch_roles 
    WHERE user_id = clock_entries.user_id 
    AND branch_id = clock_entries.branch_id
    AND is_active = true
  )
);
```

**Pros**: Rápido de implementar
**Contras**: Menos seguro, cualquiera podría falsificar un user_id si conoce los UUIDs

### Solución 3: Crear Función RPC para Insertar Fichaje
```sql
CREATE FUNCTION register_clock_entry(_branch_code text, _pin text, _entry_type text)
RETURNS json
SECURITY DEFINER
AS $$
  -- Valida PIN y crea el registro todo junto
$$;
```

**Pros**: Todo en una transacción atómica
**Contras**: Requiere migración de base de datos

### Solución 4: Usar Sign-In Anónimo Temporal
El flujo sería:
1. Usuario ingresa PIN
2. App hace `signInAnonymously()` 
3. Luego hace el insert con esa sesión temporal

**Pros**: Mantiene el modelo de RLS actual
**Contras**: Supabase Cloud puede no soportar anon sign-ups, y complica el flujo

### Solución 5: Login Temporal con Credenciales del Empleado
Forzar que Dalma se loguee antes de fichar (como en otras partes de la app).

**Pros**: Más seguro, reutiliza infraestructura existente
**Contras**: Rompe el flujo actual "escaneo QR → PIN → listo"

---

## 2 REFACTORIZACIONES COMPLETAS

### Refactorización A: Arquitectura de Fichaje Segura con Edge Function

**Concepto**: Todo el proceso de fichaje se maneja server-side

```text
┌─────────────────┐    ┌───────────────────────┐    ┌──────────────┐
│   Empleado      │───>│  Edge Function        │───>│  Base de     │
│   (sin login)   │    │  register-clock-entry │    │  Datos       │
│                 │<───│  (SECURITY DEFINER)   │<───│  (RLS bypass)│
└─────────────────┘    └───────────────────────┘    └──────────────┘

Payload: { branch_code, pin, entry_type, user_agent, gps_coords }
Response: { success, user_name, timestamp } o { error }
```

**Archivos a crear/modificar:**
- `supabase/functions/register-clock-entry/index.ts` (nueva)
- `src/pages/FichajeEmpleado.tsx` (usar fetch a la edge function)

**Beneficios:**
- Elimina dependencia de RLS para operaciones públicas
- Centraliza validación (PIN, GPS, reglamento) en un solo lugar
- Permite logging y rate-limiting server-side
- Más fácil de auditar

### Refactorización B: Sistema de RLS con Operaciones Privilegiadas

**Concepto**: Crear un modelo de "operaciones privilegiadas" donde ciertas acciones bypass RLS usando funciones dedicadas

```sql
-- Crear schema separado para funciones privilegiadas
CREATE SCHEMA IF NOT EXISTS privileged_ops;

-- Función privilegiada para fichaje
CREATE FUNCTION privileged_ops.register_clock_entry(
  _branch_code text,
  _pin text,
  _entry_type text,
  _user_agent text DEFAULT NULL,
  _gps_lat numeric DEFAULT NULL,
  _gps_lng numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user record;
  v_result jsonb;
BEGIN
  -- Validar PIN
  SELECT * INTO v_user FROM validate_clock_pin_v2(_branch_code, _pin);
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('error', 'PIN inválido');
  END IF;
  
  -- Verificar reglamento (opcional)
  -- ...
  
  -- Insertar fichaje
  INSERT INTO clock_entries (branch_id, user_id, entry_type, user_agent, latitude, longitude)
  VALUES (v_user.branch_id, v_user.user_id, _entry_type, _user_agent, _gps_lat, _gps_lng);
  
  RETURN jsonb_build_object(
    'success', true,
    'user_name', v_user.full_name,
    'timestamp', now()
  );
END;
$$;

-- Permitir llamada desde frontend anónimo
GRANT EXECUTE ON FUNCTION privileged_ops.register_clock_entry TO anon;
```

**Frontend simplificado:**
```typescript
const { data, error } = await supabase.rpc('register_clock_entry', {
  _branch_code: branchCode,
  _pin: pin,
  _entry_type: 'clock_in',
  _user_agent: navigator.userAgent,
  _gps_lat: coords?.latitude,
  _gps_lng: coords?.longitude
});
```

**Beneficios:**
- Una sola llamada hace todo (PIN + insert)
- Transaccional (si algo falla, nada se guarda)
- No requiere edge function (todo en PostgreSQL)
- Más fácil de mantener

---

## ANÁLISIS COMPLETO DEL SISTEMA DE SEGURIDAD

### Estado Actual de RLS

| Tabla | Políticas | Problema Detectado |
|-------|-----------|-------------------|
| `clock_entries` | 2 (SELECT, INSERT) | INSERT requiere auth.uid() que no existe en fichaje público |
| `employee_schedules` | 3 | OK, solo usuarios logueados acceden |
| `salary_advances` | 4 | Duplicación de políticas (legacy + consolidated) |
| `warnings` | 3 | OK |
| `schedule_requests` | 2 | OK |
| `regulation_signatures` | 2 | OK |
| `user_branch_roles` | 7 | Complejidad excesiva, riesgo de conflictos |

### Funciones Helper de Seguridad

Todas usan `SECURITY DEFINER` correctamente:
- `is_superadmin()` ✅
- `can_access_branch()` ✅
- `is_hr_role()` ✅
- `is_staff()` ✅
- `has_branch_role()` ✅

### Problemas Sistémicos Identificados

1. **Mezcla de flujos autenticados y anónimos**: El fichaje es público pero intenta usar el mismo modelo que acciones autenticadas

2. **Duplicación de políticas**: Existen políticas "legacy" y "consolidated" que pueden generar conflictos

3. **Dependencia excesiva de `auth.uid()`**: Muchas políticas asumen que siempre hay un usuario logueado

4. **Falta de operaciones privilegiadas**: No hay un patrón claro para acciones que necesitan bypass de RLS

5. **Inconsistencia entre tablas**: Algunas usan `user_id`, otras `employee_id`, otras ambas

---

## SOLUCIÓN ELEGIDA: Refactorización A (Edge Function)

**Razón de la elección:**

1. **Separación clara de responsabilidades**: El fichaje es una operación pública especial, merece su propia API
2. **Más seguro**: El frontend no manipula datos directamente
3. **Más flexible**: Permite agregar validaciones futuras (rate limiting, anti-fraude)
4. **Ya existe el patrón**: Las otras edge functions del proyecto funcionan así
5. **No toca el modelo de RLS existente**: No arriesga romper otras funcionalidades

### Plan de Implementación

1. **Crear Edge Function** `supabase/functions/register-clock-entry/index.ts`:
   - Recibe: `{ branch_code, pin, entry_type, user_agent, gps }`
   - Valida PIN usando la función existente
   - Verifica reglamento pendiente
   - Inserta en `clock_entries` usando service role
   - Retorna resultado

2. **Modificar Frontend** `src/pages/FichajeEmpleado.tsx`:
   - Reemplazar el `supabase.from('clock_entries').insert()` por un `fetch` a la edge function
   - Mantener el flujo de cámara y GPS igual

3. **Mantener política RLS actual** para `clock_entries`:
   - La política existente sigue siendo válida para otros contextos (admin viendo fichajes, etc.)
   - Solo el fichaje público usa la edge function

### Verificación Post-Implementación

1. Dalma escanea QR de Manantiales
2. Ingresa PIN 0102
3. Toma selfie
4. Click en "Entrada" o "Salida"
5. El fichaje se registra correctamente sin error RLS
