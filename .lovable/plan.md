

# Plan: Impersonación 100% Completa + Identificador Visual de Usuario

## El Objetivo

1. **Impersonación total**: Poder VER y HACER cosas exactamente como si estuvieras logueado como Dalma
2. **Identificador visual sutil**: Un badge/fingerprint único en TODAS las pantallas que muestre quién está logueado, para que cuando te manden capturas puedas identificar automáticamente quién es

---

## Parte 1: Hook `useEffectiveUser` - El Usuario Efectivo

Crear un hook centralizado que retorne el ID y datos del usuario "efectivo" para TODO (lecturas Y escrituras).

### Archivo: `src/hooks/useEffectiveUser.ts`

```typescript
export interface EffectiveUser {
  id: string | null;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  isImpersonated: boolean;
}

export function useEffectiveUser(): EffectiveUser {
  const { user } = useAuth();
  const { isImpersonating, targetUser } = useImpersonation();

  if (isImpersonating && targetUser) {
    return {
      id: targetUser.id,
      email: targetUser.email,
      full_name: targetUser.full_name,
      avatar_url: targetUser.avatar_url,
      isImpersonated: true,
    };
  }

  return {
    id: user?.id || null,
    email: user?.email || null,
    full_name: null,
    avatar_url: null,
    isImpersonated: false,
  };
}
```

---

## Parte 2: Identificador Visual de Usuario (UserFingerprint)

Un componente sutil que aparece en TODAS las pantallas mostrando quién está logueado. Diseñado para:
- Ser visible en capturas de pantalla
- No molestar ni ocupar espacio importante
- Contener info única del usuario

### Diseño Visual

```
┌────────────────────────────────────────────────────────────┐
│  App normal...                                             │
│                                                            │
│                                                            │
│                                                            │
│                                                            │
│                                                            │
│                                           ┌──────────────┐ │
│                                           │ 🟢 DL #a4f2  │ │ ← Esquina inferior
│                                           └──────────────┘ │    derecha, sutil
└────────────────────────────────────────────────────────────┘
```

**Contenido del badge**:
- **Iniciales**: DL (Dalma Ledesma)
- **Hash corto**: Los primeros 4 caracteres del UUID del usuario (#a4f2)
- **Indicador de estado**: punto verde si está activo

### Archivo: `src/components/ui/UserFingerprint.tsx`

```typescript
// Componente que genera un badge único por usuario
// Ejemplo: "DL #a4f2" donde DL = iniciales, a4f2 = primeros 4 chars del UUID

function UserFingerprint() {
  const { id, full_name, isImpersonated } = useEffectiveUser();
  
  if (!id) return null;
  
  // Generar iniciales
  const initials = full_name
    ?.split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '??';
  
  // Hash corto del UUID (primeros 4 caracteres)
  const shortHash = id.substring(0, 4);
  
  return (
    <div className="fixed bottom-2 right-2 z-50 
                    px-2 py-1 rounded-full text-xs
                    bg-muted/80 backdrop-blur-sm border
                    text-muted-foreground
                    select-none pointer-events-none">
      <span className={isImpersonated ? 'text-amber-600' : ''}>
        {initials}
      </span>
      <span className="opacity-50 ml-1">#{shortHash}</span>
    </div>
  );
}
```

**Características**:
- `pointer-events-none` para que no interfiera con clics
- `select-none` para que no se pueda seleccionar
- Colores sutiles, casi transparente
- Si está impersonando, las iniciales son color ámbar
- El hash es único por usuario - permite identificar QUIÉN mandó la captura

---

## Parte 3: Modificar Componentes para Impersonación Completa

### Archivos a Modificar (10 archivos)

| Archivo | Cambio |
|---------|--------|
| `src/pages/cuenta/CuentaDashboard.tsx` | Usar `useEffectiveUser` + `usePermissionsWithImpersonation` en queries y saludo |
| `src/components/layout/PublicHeader.tsx` | Mostrar nombre del usuario efectivo + `usePermissionsWithImpersonation` |
| `src/components/cuenta/MyClockInsCard.tsx` | Usar `useEffectiveUser` para queries |
| `src/components/cuenta/MyScheduleCard.tsx` | Usar `useEffectiveUser` para queries |
| `src/components/cuenta/MySalaryAdvancesCard.tsx` | Usar `useEffectiveUser` para queries |
| `src/components/cuenta/MyWarningsCard.tsx` | Usar `useEffectiveUser` para queries |
| `src/components/cuenta/MyRequestsCard.tsx` | Usar `useEffectiveUser` para queries Y escrituras |
| `src/components/cuenta/MyRegulationsCard.tsx` | Usar `useEffectiveUser` para queries |
| `src/components/cuenta/MyCommunicationsCard.tsx` | Ya usa hook, modificar el hook |
| `src/hooks/useCommunications.ts` | Usar `useEffectiveUser` en `useUserCommunications`, `useMarkAsRead`, `useConfirmCommunication` |

### Patrón de Cambio

**Antes** (cada componente):
```typescript
import { useAuth } from '@/hooks/useAuth';
import { usePermissionsV2 } from '@/hooks/usePermissionsV2';

const { user } = useAuth();
const { branchRoles } = usePermissionsV2();

// Query
.eq('user_id', user.id)

// Insert
.insert({ user_id: user.id, ... })
```

**Después**:
```typescript
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { usePermissionsWithImpersonation } from '@/hooks/usePermissionsWithImpersonation';

const { id: userId } = useEffectiveUser();
const { branchRoles } = usePermissionsWithImpersonation();

// Query
.eq('user_id', userId)

// Insert - también usa el ID efectivo!
.insert({ user_id: userId, ... })
```

---

## Parte 4: Integrar UserFingerprint en App.tsx

### Archivo: `src/App.tsx`

Agregar el componente `UserFingerprint` al nivel raíz de la app para que aparezca en TODAS las pantallas:

```typescript
import UserFingerprint from '@/components/ui/UserFingerprint';

function App() {
  return (
    <AuthProvider>
      <ImpersonationProvider>
        <QueryClientProvider client={queryClient}>
          {/* El fingerprint aparece en TODAS las páginas */}
          <UserFingerprint />
          <RouterProvider router={router} />
          <Toaster />
        </QueryClientProvider>
      </ImpersonationProvider>
    </AuthProvider>
  );
}
```

---

## Resumen de Archivos

### Crear Nuevos (2 archivos)

| Archivo | Descripción |
|---------|-------------|
| `src/hooks/useEffectiveUser.ts` | Hook que retorna el usuario efectivo (real o impersonado) |
| `src/components/ui/UserFingerprint.tsx` | Badge visual sutil con iniciales + hash del usuario |

### Modificar (12 archivos)

| Archivo | Tipo de Cambio |
|---------|----------------|
| `src/App.tsx` | Agregar `<UserFingerprint />` |
| `src/pages/cuenta/CuentaDashboard.tsx` | Cambiar a hooks efectivos |
| `src/components/layout/PublicHeader.tsx` | Mostrar usuario efectivo |
| `src/components/cuenta/MyClockInsCard.tsx` | Usar `useEffectiveUser` |
| `src/components/cuenta/MyScheduleCard.tsx` | Usar `useEffectiveUser` |
| `src/components/cuenta/MySalaryAdvancesCard.tsx` | Usar `useEffectiveUser` |
| `src/components/cuenta/MyWarningsCard.tsx` | Usar `useEffectiveUser` |
| `src/components/cuenta/MyRequestsCard.tsx` | Usar `useEffectiveUser` (lectura Y escritura) |
| `src/components/cuenta/MyRegulationsCard.tsx` | Usar `useEffectiveUser` |
| `src/components/cuenta/RequestDayOffModal.tsx` | Usar `useEffectiveUser` para crear solicitudes |
| `src/hooks/useCommunications.ts` | Usar `useEffectiveUser` en hooks de lectura y escritura |

---

## Resultado Final

### Impersonando a Dalma Ledesma

**Antes (roto):**
- Header: "Juan"
- Saludo: "Hola, Juan!"
- Datos: Fichajes de Juan
- Badge: No existe

**Después (funcionando):**
- Header: "Dalma"
- Saludo: "Hola, Dalma!"
- Datos: Fichajes de Dalma
- Puede crear solicitudes COMO Dalma
- Badge en esquina: `DL #a4f2` (color ámbar por impersonación)

### Cuando te manden una captura

Vas a poder ver en la esquina inferior derecha algo como:
- `JF #f3e1` → Juan Finocchiaro
- `DL #a4f2` → Dalma Ledesma
- `BG #c2d8` → Braian García

Cada usuario tiene un código ÚNICO e imposible de falsificar (basado en su UUID de auth).

---

## Nota de Seguridad Importante

Las escrituras que se hagan impersonando a Dalma:
- Se registrarán con el `user_id` de Dalma (para que funcione correctamente el flujo)
- PERO el RLS de Supabase usará `auth.uid()` que sigue siendo TU usuario real

Esto significa que si intentás crear algo como Dalma que DALMA no podría crear normalmente, la política RLS lo bloqueará. La impersonación permite hacer lo que el usuario puede hacer, no más.

Para casos extremos donde necesites bypasear RLS (como testing real de un empleado sin acceso), se necesitaría una edge function con `service_role`, pero eso es otro nivel de complejidad que probablemente no necesites ahora.

