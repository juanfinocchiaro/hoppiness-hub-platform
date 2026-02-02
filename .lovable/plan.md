

# Plan: Impersonación Completa - Afectar TODA la Navegación

## Problema Detectado

Actualmente la impersonación solo afecta parcialmente porque hay **3 puntos de fuga**:

```text
                    usePermissionsV2 (REAL)
                    /        |          \
   useRoleLandingV2    BranchLayout    RequireAdmin/RequireLocal
        ↓                   ↓                    ↓
   Determina landing   Verifica acceso      Guards de ruta
   y roles            a sucursal
```

Cuando impersonás a Braian (empleado de Manantiales):
- Los guards siguen viendo que VOS sos Superadmin
- BranchLayout sigue mostrando todas las sucursales
- Podés navegar a General Paz aunque Braian no tiene acceso

---

## Solución: Cambiar a usePermissionsWithImpersonation

| Archivo | Hook Actual | Hook Nuevo |
|---------|-------------|------------|
| `useRoleLandingV2.ts` | `usePermissionsV2` | `usePermissionsWithImpersonation` |
| `BranchLayout.tsx` | `usePermissionsV2(branchId)` | `usePermissionsWithImpersonation(branchId)` |

---

## Cambios Específicos

### 1. `src/hooks/useRoleLandingV2.ts`

**Línea 4 - Cambiar import:**
```typescript
// ANTES
import { usePermissionsV2, type BrandRole, type LocalRole } from './usePermissionsV2';

// DESPUÉS
import { usePermissionsWithImpersonation } from './usePermissionsWithImpersonation';
import type { BrandRole, LocalRole } from './usePermissionsV2';
```

**Línea 43 - Cambiar hook:**
```typescript
// ANTES
} = usePermissionsV2();

// DESPUÉS  
} = usePermissionsWithImpersonation();
```

### 2. `src/pages/local/BranchLayout.tsx`

**Línea 13 - Cambiar import:**
```typescript
// ANTES
import { usePermissionsV2 } from '@/hooks/usePermissionsV2';

// DESPUÉS
import { usePermissionsWithImpersonation } from '@/hooks/usePermissionsWithImpersonation';
```

**Línea 81 - Cambiar llamada:**
```typescript
// ANTES
const permissions = usePermissionsV2(branchId);

// DESPUÉS
const permissions = usePermissionsWithImpersonation(branchId);
```

---

## Resultado Esperado

| Escenario | Antes | Después |
|-----------|-------|---------|
| Impersonando Braian en /mimarca | Ve todo Mi Marca | Redirige a /cuenta |
| Impersonando Braian intenta /milocal/general-paz | Ve General Paz | Redirige a /milocal/manantiales o /cuenta |
| Impersonando Braian en /cuenta | Ve Mi Cuenta | Ve Mi Cuenta (correcto) |
| Selector de sucursales | Muestra todas | Muestra SOLO Manantiales |

---

## Flujo Corregido

```text
1. Superadmin está en /mimarca
2. Click "Ver como..." → Selecciona Braian (empleado Manantiales)
3. useRoleLandingV2 detecta: "Braian es empleado, landing = /cuenta"
4. RequireAdmin ve: "Braian NO tiene brand_role"
5. REDIRECT automático a /cuenta
6. Si Braian intenta ir a /milocal/general-paz:
   - BranchLayout ve que Braian solo tiene acceso a Manantiales
   - REDIRECT a /milocal (selector) o /cuenta
```

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/hooks/useRoleLandingV2.ts` | Usar `usePermissionsWithImpersonation` |
| `src/pages/local/BranchLayout.tsx` | Usar `usePermissionsWithImpersonation` |

---

## Complejidad

**Baja** - Solo 2 archivos, ~4 líneas cada uno.

---

## Nota de Seguridad

Las operaciones de base de datos (crear, editar, eliminar) siguen usando tu `auth.uid()` real. La impersonación solo afecta la **visualización** y **navegación**, no los permisos reales de RLS.

