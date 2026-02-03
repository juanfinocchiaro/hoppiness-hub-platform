
# Plan: Mejorar Filtros de Usuarios para Incluir Todos los Roles

## Problema Identificado

El filtro actual de roles usa `getHighestRole()` que solo retorna el rol de **mayor prioridad**. Esto causa que usuarios con múltiples roles (ej: superadmin + franquiciado) no aparezcan al filtrar por su rol secundario.

**Ejemplo concreto**:
- Juan Finocchiaro es `superadmin` (brand_role) + `franquiciado` en 3 locales
- Al filtrar por "Franquiciado", no aparece porque `getHighestRole()` retorna `superadmin`

---

## Solución Propuesta

Cambiar la lógica del filtro de roles para buscar si el usuario **tiene** ese rol en cualquiera de sus asignaciones, no solo en su rol más alto.

### Nueva Lógica de Filtrado

```typescript
// ANTES (incorrecto):
const highestRole = getHighestRole(user.brand_role, user.branch_roles);
if (highestRole !== roleFilter) return false;

// DESPUÉS (correcto):
function userHasRole(user, role) {
  // Verificar en rol de marca
  if (user.brand_role === role) return true;
  
  // Verificar en todos los roles locales
  return user.branch_roles.some(br => br.local_role === role);
}

if (!userHasRole(user, roleFilter)) return false;
```

---

## Cambios en el Filtro de UI

### Reorganización de Opciones

Para mayor claridad, separar roles de marca y locales:

```text
Filtro de Roles Actual:
├── Todos los roles
├── superadmin
├── coordinador
├── franquiciado    ← Mezclados sin contexto
├── encargado
├── cajero
├── empleado
└── sin_rol

Propuesta:
┌─────────────────────────────────────────┐
│  Rol                                    │
├─────────────────────────────────────────┤
│  Todos los roles                        │
├─────────────────────────────────────────┤
│  ── ROLES DE MARCA ──                   │
│  Superadmin                             │
│  Coordinador                            │
│  Informes                               │
│  Contador Marca                         │
├─────────────────────────────────────────┤
│  ── ROLES LOCALES ──                    │
│  Franquiciado                           │
│  Encargado                              │
│  Contador Local                         │
│  Cajero                                 │
│  Empleado                               │
├─────────────────────────────────────────┤
│  Sin rol asignado                       │
└─────────────────────────────────────────┘
```

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/pages/admin/UsersPage.tsx` | Nueva lógica de filtrado con `userHasRole()` |
| `src/components/admin/users/UsersFilters.tsx` | Agregar separadores visuales + roles faltantes |
| `src/components/admin/users/types.ts` | Nueva función helper `userHasRole()` |

---

## Detalle Técnico

### Nueva función en `types.ts`

```typescript
export function userHasRole(
  brandRole: BrandRole, 
  branchRoles: BranchRoleInfo[], 
  targetRole: string
): boolean {
  // Chequear rol de marca
  if (brandRole === targetRole) return true;
  
  // Chequear cualquier rol local
  return branchRoles.some(br => br.local_role === targetRole);
}
```

### Actualización en `UsersPage.tsx`

```typescript
// Role filter - buscar si TIENE el rol
if (roleFilter !== 'all') {
  if (roleFilter === 'sin_rol') {
    if (user.brand_role || user.hasLocalAccess) return false;
  } else if (!userHasRole(user.brand_role, user.branch_roles, roleFilter)) {
    return false;
  }
}
```

### Actualización en `UsersFilters.tsx`

```tsx
<SelectContent>
  <SelectItem value="all">Todos los roles</SelectItem>
  
  {/* Roles de Marca */}
  <SelectItem disabled value="__brand_header" className="text-xs font-semibold text-muted-foreground">
    ── Marca ──
  </SelectItem>
  <SelectItem value="superadmin">Superadmin</SelectItem>
  <SelectItem value="coordinador">Coordinador</SelectItem>
  <SelectItem value="informes">Informes</SelectItem>
  <SelectItem value="contador_marca">Contador Marca</SelectItem>
  
  {/* Roles Locales */}
  <SelectItem disabled value="__local_header" className="text-xs font-semibold text-muted-foreground">
    ── Locales ──
  </SelectItem>
  <SelectItem value="franquiciado">Franquiciado</SelectItem>
  <SelectItem value="encargado">Encargado</SelectItem>
  <SelectItem value="contador_local">Contador Local</SelectItem>
  <SelectItem value="cajero">Cajero</SelectItem>
  <SelectItem value="empleado">Empleado</SelectItem>
  
  <SelectItem value="sin_rol">Sin rol asignado</SelectItem>
</SelectContent>
```

---

## Resultado Esperado

### Al filtrar por "Franquiciado":
- ✅ Tomas Lambert (solo franquiciado)
- ✅ Noelia Reginelli (solo franquiciada)
- ✅ Juan Finocchiaro (superadmin + franquiciado en 3 locales)
- ✅ Ismael (si tiene rol franquiciado en algún local)

### Beneficios:
1. **Búsqueda inclusiva**: Encuentra usuarios por cualquier rol que tengan
2. **Claridad visual**: Separadores muestran qué roles son de marca vs locales
3. **Completo**: Incluye todos los roles (informes, contador_marca) que faltaban
