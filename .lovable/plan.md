
# Plan: Eliminar Redundancia de Coaching en Dashboard

## Problema Identificado

En el dashboard de Mi Local (`ManagerDashboard.tsx`) hay **dos componentes mostrando la misma información de coaching**:

| Componente | Línea | Ubicación | Datos |
|------------|-------|-----------|-------|
| `DashboardCoachingAlert` | 194-196 | Arriba del header | "3 empleados sin evaluar" + botón "Ir a Coaching" |
| `CoachingPendingCard` | 403-408 | Abajo de Pendientes | "Completados 0/3" + "3 pendientes" + "Hacer Coaching" |

Ambos usan `useCoachingStats(branchId)` y muestran exactamente la misma información de formas diferentes.

---

## Solución Propuesta

**Mantener solo `CoachingPendingCard`** (la card inferior) porque:
1. Tiene más información detallada (progreso, promedio, confirmaciones)
2. Mantiene consistencia visual con las otras cards del dashboard
3. El alert superior interrumpe el flujo visual del header

**Eliminar `DashboardCoachingAlert`** del dashboard:
- Remover la línea 194-196 de `ManagerDashboard.tsx`
- Opcionalmente mantener el archivo por si se quiere usar en otro contexto (ej: sidebar)

---

## Archivo a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/local/ManagerDashboard.tsx` | Eliminar líneas 194-196 (DashboardCoachingAlert) |

---

## Código a Eliminar

```tsx
// Líneas 194-196 - ELIMINAR
{local.canDoCoaching && (
  <DashboardCoachingAlert branchId={branch.id} />
)}
```

También eliminar el import (línea 35):
```tsx
import { CoachingPendingCard, DashboardCoachingAlert } from '@/components/coaching';
// Cambiar a:
import { CoachingPendingCard } from '@/components/coaching';
```

---

## Resultado

El dashboard mostrará **una sola sección de coaching** (la card "Coaching del Mes" al final) que es más completa y mantiene la consistencia visual con el resto de las cards.

```text
┌─────────────────────────────────────────┐
│ General Paz                   [+ Cargar]│
│ viernes 6 feb                           │
├─────────────────────────────────────────┤
│ $ Ventas Hoy                            │
│   Mediodía: -    Noche: -               │
├─────────────────────────────────────────┤
│ 👥 Equipo Ahora              0 fichados │
├─────────────────────────────────────────┤
│ ⏰ Pendientes                         1 │
├─────────────────────────────────────────┤
│ 📋 Coaching del Mes                     │
│    Febrero - Completados 0/3            │
│    ████░░░░░░░░░░░░░░░                  │
│    [Hacer Coaching]                     │
└─────────────────────────────────────────┘
```
