
# Plan: Arreglar Impersonación en Perfil + Rediseñar Sección de PIN

## Problemas Identificados

### 1. Impersonación Rota en CuentaPerfil.tsx
La página `/cuenta/perfil` sigue mostrando datos de Juan cuando estás impersonando a Dalma porque:
- Línea 1: `import { useAuth } from '@/hooks/useAuth'`
- Línea 2: `import { usePermissionsV2 } from '@/hooks/usePermissionsV2'`
- Todas las queries usan `user.id` del usuario real

### 2. PIN Confuso
El texto "Cada sucursal tiene su propio PIN de 4 dígitos" no es claro. El problema:
- Si un empleado trabaja en UNA sola sucursal, ese texto lo confunde
- Solo tiene sentido mostrar múltiples PINs si trabaja en múltiples locales

### 3. Falta Separación Personal vs Laboral
Todo está mezclado. Propongo reorganizar:

```
┌────────────────────────────────────────┐
│ DATOS PERSONALES (todos los usuarios) │
│ • Avatar, Nombre, Email, Teléfono      │
│ • Fecha de nacimiento                  │
│ • Cambiar contraseña                   │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ DATOS LABORALES (solo empleados)       │
│ • PIN de Fichaje por sucursal          │
│   - Simple si tiene 1 sucursal         │
│   - Lista si tiene múltiples           │
└────────────────────────────────────────┘
```

---

## Cambios Propuestos

### Archivo: `src/pages/cuenta/CuentaPerfil.tsx`

#### 1. Cambiar Imports

```typescript
// ANTES
import { useAuth } from '@/hooks/useAuth';
import { usePermissionsV2 } from '@/hooks/usePermissionsV2';

// DESPUÉS
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { usePermissionsWithImpersonation } from '@/hooks/usePermissionsWithImpersonation';
```

#### 2. Cambiar Hooks

```typescript
// ANTES
const { user } = useAuth();
const { canAccessLocalPanel } = usePermissionsV2();

// DESPUÉS
const { id: effectiveUserId, email: effectiveEmail } = useEffectiveUser();
const { canAccessLocalPanel } = usePermissionsWithImpersonation();
```

#### 3. Actualizar Todas las Queries

| Elemento | Antes | Después |
|----------|-------|---------|
| Profile query key | `['profile', user?.id]` | `['profile', effectiveUserId]` |
| Profile .eq() | `.eq('id', user.id)` | `.eq('id', effectiveUserId)` |
| Branch roles key | `['user-branch-roles', user?.id]` | `['user-branch-roles', effectiveUserId]` |
| Branch roles .eq() | `.eq('user_id', user.id)` | `.eq('user_id', effectiveUserId)` |
| enabled | `!!user` | `!!effectiveUserId` |

#### 4. Actualizar Mutations

```typescript
// Avatar upload - usar effectiveUserId
const fileName = `${effectiveUserId}-${Date.now()}.${fileExt}`;
.eq('id', effectiveUserId)

// Profile update
.eq('id', effectiveUserId)
queryClient.invalidateQueries({ queryKey: ['profile', effectiveUserId] });
```

#### 5. Actualizar UI

```typescript
// Email display
value={effectiveEmail || ''}

// BranchPinCard prop
userId={effectiveUserId}
```

#### 6. Reorganizar Estructura de Cards

**Card 1: Datos Personales**
- Avatar
- Email (readonly)
- Nombre completo
- Teléfono
- Fecha de nacimiento
- Botón Guardar

**Card 2: Mi Fichaje (solo si es empleado, renombrado)**
- Título: "Mi PIN de Fichaje" (más simple)
- Subtítulo dinámico:
  - 1 sucursal: "Tu PIN de 4 dígitos para fichar entrada y salida"
  - N sucursales: "Configurá un PIN para cada sucursal donde trabajás"
- Componente BranchPinCard por cada sucursal

**Card 3: Seguridad**
- Cambiar contraseña

---

## Resumen de Archivos

| Archivo | Cambio |
|---------|--------|
| `src/pages/cuenta/CuentaPerfil.tsx` | Cambiar hooks de impersonación + mejorar textos de PIN |

---

## Resultado Esperado

### Impersonando a Dalma - Perfil

**Antes (actual):**
- Email: juan.finocchiaro@gmail.com
- Nombre: Juan Finocchiaro
- Avatar: JF
- Texto confuso: "Cada sucursal tiene su propio PIN"

**Después:**
- Email: dalmalericci@gmail.com
- Nombre: Dalma Ledesma
- Avatar: DL
- Texto claro según cantidad de sucursales:
  - Si tiene 1: "Tu PIN de fichaje"
  - Si tiene N: "PIN por cada sucursal"

---

## Complejidad

**Baja-Media** - Un solo archivo con cambios de hooks + mejora de UX en textos.
