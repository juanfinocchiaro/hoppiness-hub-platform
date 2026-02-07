
# Plan de Corrección Integral - Hoppiness Hub

## Resumen Ejecutivo

Este plan aborda **10 tipos de errores recurrentes** identificados en la auditoría técnica. La migración RLS anterior (v3) se ejecutó correctamente, pero quedan tareas pendientes de integración y limpieza.

---

## Estado Actual Post-Migración

### Verificado como Resuelto
- `can_close_shift()` - Función creada, cajeros pueden cerrar turnos
- `can_access_branch()` - Migrada a usar `user_branch_roles`
- Políticas RLS v3 aplicadas en 6 tablas críticas

### Pendiente de Resolver

| Categoría | Problema | Impacto |
|-----------|----------|---------|
| **Permisos** | `useDynamicPermissions` solo usado en guards (1 archivo) | Medio |
| **Permisos** | 15 páginas usan `usePermissionsV2` hardcodeado | Medio |
| **DB Config** | Faltan permisos en `permission_config` (Meetings, Coaching, Closures) | Alto |
| **Notificaciones** | 0 Edge Functions para notificar (Meetings, Warnings, Coachings) | Alto |
| **RLS** | Linter detecta 1 Security Definer View | Bajo |
| **Errores** | 642 usos de `toast.error` vs 2 usos de `handleError()` | Medio |
| **Queries** | 235 usos de `.single()` sin fallback | Bajo |

---

## Fases de Implementación

### Fase 1: Sincronizar Sistema de Permisos (Prioridad Alta)
**Objetivo**: Que los cambios en `/mimarca/configuracion/permisos` tengan efecto real.

**1.1 Agregar permisos faltantes a `permission_config`**

Migración SQL para insertar:
```text
BRAND (4 nuevos):
- brand.viewMeetings      → Ver Reuniones
- brand.createMeetings    → Convocar Reuniones  
- brand.viewCoaching      → Ver Coaching Red
- brand.viewClosureConfig → Ver Config Cierres

LOCAL (6 nuevos):
- local.viewMeetings      → Ver Reuniones
- local.createMeetings    → Convocar Reuniones
- local.closeMeetings     → Cerrar Reuniones
- local.viewClosures      → Ver Cierres
- local.closeShifts       → Cerrar Turnos
- local.viewPayroll       → Ver Liquidación
```

**1.2 Migrar páginas a `useDynamicPermissions`**

Archivos a actualizar (15):
```text
src/pages/local/
├── WarningsPage.tsx
├── TeamPage.tsx
├── SchedulesPage.tsx
├── AdvancesPage.tsx
├── CoachingPage.tsx
├── ClockInsPage.tsx
├── LocalCommunicationsPage.tsx
└── RequestsPage.tsx

src/pages/admin/
├── UsersPage.tsx
├── LaborCalendarPage.tsx
└── PermissionsConfigPage.tsx

src/components/
├── local/RegulationSignaturesPanel.tsx
├── hr/InlineScheduleEditor.tsx
├── hr/HolidaysManager.tsx
└── coaching/MyManagerCoachingTab.tsx
```

**Cambio en cada archivo**:
```tsx
// ANTES
import { usePermissionsV2 } from '@/hooks/usePermissionsV2';
const { local } = usePermissionsV2(branchId);

// DESPUÉS  
import { useDynamicPermissions } from '@/hooks/useDynamicPermissions';
const { local } = useDynamicPermissions(branchId);
```

---

### Fase 2: Edge Functions de Notificación (Prioridad Alta)
**Objetivo**: Completar flujos rotos donde se guarda data pero no se notifica.

**2.1 Crear `send-meeting-notification`**

Funcionalidad:
- Se dispara al convocar reunión (`status = 'convocada'`)
- Envía email a todos los participantes con fecha/hora/lugar
- Actualiza `meetings.notified_at`

Flujo:
```text
1. Usuario crea reunión → meetings INSERT
2. Edge function detecta → Envía emails
3. Actualiza meetings.notified_at
```

**2.2 Crear `send-warning-notification`**

Funcionalidad:
- Se dispara al crear apercibimiento
- Notifica al empleado por email
- Incluye link para firmar acuse de recibo

**2.3 Crear `send-meeting-minutes-notification`**

Funcionalidad:
- Se dispara al cerrar reunión (`status = 'cerrada'`)
- Envía minuta y acuerdos a participantes
- Requiere confirmación de lectura

---

### Fase 3: Limpieza de Código (Prioridad Media)
**Objetivo**: Estandarizar manejo de errores y mejorar resiliencia.

**3.1 Reemplazar `toast.error` manual por `handleError()`**

Patrón actual en 54 archivos:
```tsx
// PROBLEMA: Inconsistente, sin contexto
} catch (error) {
  console.error('Error:', error);
  toast.error('Ocurrió un error');
}
```

Patrón objetivo:
```tsx
// SOLUCIÓN: Centralizado con contexto
import { handleError } from '@/lib/errorHandler';

} catch (error) {
  handleError(error, { 
    userMessage: 'Error al guardar',
    context: 'ComponentName.action'
  });
}
```

**Archivos prioritarios** (más errores):
1. `InviteStaffDialog.tsx` - 6 instancias
2. `BranchTeamTab.tsx` - 4 instancias
3. `CuentaPerfil.tsx` - 4 instancias

**3.2 Agregar fallback a queries con `.single()`**

Patrón actual:
```tsx
const { data, error } = await supabase
  .from('branches')
  .select('*')
  .eq('id', branchId)
  .single(); // CRASH si no existe
```

Patrón objetivo:
```tsx
const { data, error } = await supabase
  .from('branches')
  .select('*')
  .eq('id', branchId)
  .maybeSingle(); // NULL si no existe

if (!data) {
  // Manejar caso gracefully
}
```

---

### Fase 4: Optimización de Queries (Prioridad Baja)
**Objetivo**: Prevenir problemas de performance a escala.

**4.1 Agregar límites a queries sin bound**

Hooks afectados:
```tsx
// useBranchMeetings - Sin límite
.from('meetings').select('*').eq('branch_id', branchId)

// useCommunications - Sin límite  
.from('communications').select('*').order('published_at')
```

Cambio:
```tsx
.from('meetings')
.select('*')
.eq('branch_id', branchId)
.limit(100) // Agregar límite
.order('scheduled_at', { ascending: false });
```

**4.2 Implementar paginación en tablas grandes**

Candidatos:
- Lista de reuniones (`/milocal/:id/equipo/reuniones`)
- Lista de comunicados (`/cuenta/comunicados`)
- Lista de fichajes (`/milocal/:id/equipo/fichajes`)

---

### Fase 5: Seguridad RLS (Prioridad Baja)
**Objetivo**: Resolver warning del linter de Supabase.

**5.1 Convertir Security Definer View**

El linter detectó una vista con `SECURITY DEFINER`. Esto significa que ejecuta con privilegios del creador, bypasseando RLS.

Acción: Identificar la vista y evaluar si es necesario, o convertirla a `SECURITY INVOKER`.

---

## Secuencia de Implementación

```text
┌─────────────────────────────────────────────────────────┐
│ SEMANA 1: Permisos                                      │
├─────────────────────────────────────────────────────────┤
│ Día 1-2: Migración SQL con permisos faltantes           │
│ Día 3-5: Migrar 15 archivos a useDynamicPermissions     │
└─────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────┐
│ SEMANA 2: Edge Functions                                │
├─────────────────────────────────────────────────────────┤
│ Día 1-2: send-meeting-notification                      │
│ Día 3-4: send-warning-notification                      │
│ Día 5: send-meeting-minutes-notification                │
└─────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────┐
│ SEMANA 3: Código                                        │
├─────────────────────────────────────────────────────────┤
│ Día 1-3: Migrar toast.error → handleError (54 archivos) │
│ Día 4-5: Agregar fallbacks a .single() (28 archivos)    │
└─────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────┐
│ SEMANA 4: Performance + Seguridad                       │
├─────────────────────────────────────────────────────────┤
│ Día 1-2: Agregar límites a queries                      │
│ Día 3-4: Implementar paginación básica                  │
│ Día 5: Resolver Security Definer View                   │
└─────────────────────────────────────────────────────────┘
```

---

## Métricas de Éxito

| Métrica | Antes | Después |
|---------|-------|---------|
| Archivos usando `useDynamicPermissions` | 1 | 16 |
| Permisos en `permission_config` | 23 | 33 |
| Edge Functions de notificación | 0 | 3 |
| `handleError()` vs `toast.error` | 2 vs 642 | ~200 vs ~444 |
| Queries con `.limit()` | Parcial | Completo |
| Warnings del linter | 1 | 0 |

---

## Archivos a Crear

```text
supabase/functions/
├── send-meeting-notification/index.ts
├── send-warning-notification/index.ts
└── send-meeting-minutes-notification/index.ts
```

## Archivos a Modificar

```text
15 archivos: Migrar usePermissionsV2 → useDynamicPermissions
54 archivos: Estandarizar error handling
28 archivos: Agregar fallbacks a .single()
~10 hooks: Agregar .limit() a queries
```

## Migraciones SQL

```text
1. INSERT permisos faltantes en permission_config
2. (Opcional) DROP security definer view
```

---

## Próximo Paso Recomendado

Comenzar con **Fase 1.1**: Ejecutar la migración SQL para agregar los 10 permisos faltantes a `permission_config`. Esto es un cambio aditivo sin riesgo que habilita la configuración desde el tablero de permisos.
