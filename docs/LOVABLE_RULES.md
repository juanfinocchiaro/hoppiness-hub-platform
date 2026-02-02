# REGLAS OBLIGATORIAS - HOPPINESS HUB

**LEER ANTES DE MODIFICAR CUALQUIER COSA EN LA BASE DE DATOS**

---

## SISTEMA DE ROLES

```
brand_roles (user_roles_v2)     → Rol de MARCA (1 por usuario)
branch_roles (user_branch_roles) → Rol de SUCURSAL (1 por usuario/sucursal)
```

El hook `usePermissionsV2` ya maneja ambas tablas correctamente. NO crear nuevas tablas de roles.

---

## REGLA CRÍTICA DE RLS

### ❌ PROHIBIDO (causa loop infinito):
```sql
CREATE POLICY "x" ON tabla_a
  USING (EXISTS (SELECT FROM tabla_a ...)) -- RECURSIÓN!
```

### ✅ OBLIGATORIO:
```sql
-- 1. Crear función SECURITY DEFINER
CREATE FUNCTION can_do_x(user_id, branch_id)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (SELECT FROM tabla_a WHERE ...)
$$;

-- 2. Política que usa la función
CREATE POLICY "x" ON tabla_a USING (can_do_x(auth.uid(), branch_id));
```

---

## FUNCIONES HELPER EXISTENTES (USAR ESTAS)

| Función | Propósito |
|---------|-----------|
| `is_superadmin(user_id)` | ¿Es superadmin? |
| `get_brand_role(user_id)` | Obtener rol de marca |
| `get_branch_role(user_id, branch_id)` | Obtener rol en sucursal |
| `can_access_branch(user_id, branch_id)` | ¿Puede acceder? |
| `is_branch_manager_v2(user_id, branch_id)` | ¿Es encargado/franquiciado? |

---

## ANTES DE CREAR ALGO NUEVO

1. **Nueva tabla:** ¿Ya existe algo similar? Buscar primero.
2. **Nueva función:** ¿Ya existe una que haga lo mismo?
3. **Nueva política RLS:** ¿Consulta la misma tabla? → PROHIBIDO

---

## NOMENCLATURA

- Tablas: `entidad_especificador` (plural): `branch_shifts`, `clock_logs`
- Funciones: `verbo_sustantivo`: `is_superadmin`, `can_manage_branch`, `get_role`
- Políticas: `tabla_operacion_quien`: `branch_roles_select_managers`

---

## SI TENÉS DUDAS

Preguntá antes de crear. Es mejor validar que romper la app.
