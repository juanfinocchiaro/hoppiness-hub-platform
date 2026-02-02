
# Respuesta: ¿El plan de Claude soluciona el problema?

## Resumen Ejecutivo

**SÍ, el plan de Claude identifica correctamente el problema**, pero **NO soluciona el bloqueo actual** de forma inmediata. El plan propone la Fase 0 como prerequisito para limpiar la coexistencia de sistemas, pero NO menciona el bug de recursión infinita en las políticas RLS que está bloqueando tu app AHORA MISMO.

---

## Diagnóstico: Dos Problemas Distintos

| Problema | Descripción | Urgencia | Plan de Claude lo cubre? |
|----------|-------------|----------|--------------------------|
| **Bug RLS Recursivo** | La política `ubr_branch_managers` consulta `user_branch_roles` dentro de sí misma, causando loop infinito | **CRÍTICO - App bloqueada** | NO lo menciona |
| **Coexistencia de Sistemas** | `user_roles_v2` (antiguo) y `user_branch_roles` (nuevo) funcionan en paralelo | Alta | SÍ - Es la Fase 0 |

---

## Problema 1: Bug RLS (El que te bloquea ahora)

Cuando el hook `usePermissionsV2` intenta consultar `user_branch_roles`, Postgres evalúa esta política:

```sql
-- POLÍTICA PROBLEMÁTICA (RECURSIÓN INFINITA)
CREATE POLICY "ubr_branch_managers" ON user_branch_roles
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_branch_roles ubr2  -- ← Consulta la misma tabla!
      WHERE ubr2.user_id = auth.uid()
      AND ubr2.branch_id = user_branch_roles.branch_id
      AND ubr2.local_role IN ('encargado', 'franquiciado')
      ...
    )
  );
```

**Por qué causa recursión:**
1. Usuario consulta `user_branch_roles`
2. Postgres evalúa política `ubr_branch_managers`
3. La política intenta hacer `SELECT FROM user_branch_roles`
4. Para ese SELECT, Postgres necesita evaluar las políticas de `user_branch_roles`
5. Vuelve al paso 2 → Loop infinito

**Solución inmediata:** Usar una función `SECURITY DEFINER` que bypasee RLS:

```sql
-- 1. Eliminar política recursiva
DROP POLICY IF EXISTS "ubr_branch_managers" ON user_branch_roles;

-- 2. Función que bypasea RLS
CREATE OR REPLACE FUNCTION public.is_branch_manager_v2(_user_id uuid, _branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_branch_roles
    WHERE user_id = _user_id 
    AND branch_id = _branch_id
    AND local_role IN ('encargado', 'franquiciado')
    AND is_active = true
  )
$$;

-- 3. Nueva política sin recursión
CREATE POLICY "ubr_branch_managers_v2" ON user_branch_roles
  FOR ALL TO authenticated
  USING (is_branch_manager_v2(auth.uid(), branch_id));
```

---

## Problema 2: Coexistencia de Sistemas (Lo que el plan de Claude cubre)

El plan identifica correctamente que existen dos sistemas:

| Tabla | Propósito | Usado en |
|-------|-----------|----------|
| `user_roles_v2` | brand_role + local_role (array branch_ids) | 20+ archivos antiguos |
| `user_branch_roles` | 1 fila por usuario/sucursal | Hook nuevo + algunos componentes |

El hook `usePermissionsV2` ya usa AMBAS tablas correctamente:
- Lee `brand_role` de `user_roles_v2` (línea 193)
- Lee roles por sucursal de `user_branch_roles` (línea 219)

**Esto está BIEN diseñado** - no necesariamente hay que eliminar una tabla.

---

## Recomendación: Plan de Acción en Orden

### Paso 0: Arreglar RLS (15 minutos) - **BLOQUEANTE**
Ejecutar la migración SQL para corregir la política recursiva.

### Paso 1: Verificar funcionamiento (5 minutos)
Confirmar que puedes acceder a Mi Marca y Mi Local.

### Paso 2: Decidir sobre la coexistencia
Dos opciones:

**Opción A: Mantener ambas tablas (Recomendado)**
- `user_roles_v2` → Solo para `brand_role`
- `user_branch_roles` → Solo para roles locales por sucursal
- El hook ya funciona así, es la arquitectura más limpia

**Opción B: Migrar todo a `user_branch_roles`**
- Más trabajo
- Hay que modificar 20+ archivos
- Riesgo de introducir más bugs

### Paso 3: Continuar con Etapa 2
Una vez estabilizado el sistema de roles, implementar:
1. Fase 1: Productividad por Local
2. Fase 2: Productividad por Turno
3. Fase 3: Ranking de Empleados
4. Fase 4: Permisos Personalizables

---

## Conclusión

| Aspecto | Estado |
|---------|--------|
| El plan de Claude identifica la coexistencia | Correcto |
| El plan soluciona el bloqueo actual | **NO** - Falta corregir RLS |
| La arquitectura de `usePermissionsV2` | Bien diseñada |
| Prioridad ahora | Arreglar la política RLS recursiva |

**Recomiendo:**
1. Primero: Ejecutar la migración SQL para corregir el bug RLS
2. Después: Evaluar si realmente necesitamos la Fase 0 del plan de Claude (migrar archivos) o si podemos mantener la coexistencia controlada actual
