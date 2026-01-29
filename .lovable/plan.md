
# Plan: Sistema de Gestión de Horarios de Empleados

## Resumen Ejecutivo

Implementaremos un sistema completo de gestión de horarios que:
1. Configure feriados globales antes de crear horarios
2. Permita crear el horario mensual completo de un empleado en un solo flujo
3. Notifique automáticamente a empleados (comunicado + email)
4. Respete los permisos V2 existentes

---

## Análisis de Reutilización

### Lo que REUTILIZAMOS sin cambios
| Elemento | Descripción | Estado |
|----------|-------------|--------|
| `user_roles_v2` | Obtención de empleados por sucursal | ✅ Funciona |
| `useTeamData.ts` | Hook que ya obtiene empleados correctamente | ✅ Funciona |
| `usePermissionsV2` | Sistema de permisos | ✅ Funciona |
| `schedule_requests` | Tabla de solicitudes de días libres | ✅ Funciona |
| `PendingScheduleRequests.tsx` | Componente de solicitudes pendientes | ✅ Funciona |
| `MyScheduleCard.tsx` | Vista de horario del empleado | ✅ Funciona |
| `MyRequestsCard.tsx` + `RequestDayOffModal.tsx` | Solicitudes del empleado | ✅ Funciona |
| `communications` + `useCommunications` | Sistema de notificaciones | ✅ Funciona |
| `send-staff-invitation` | Patrón para enviar emails con Resend | ✅ Referencia |

### Lo que MODIFICAMOS
| Elemento | Cambio | Justificación |
|----------|--------|---------------|
| `special_days` | Hacer `branch_id = NULL` para feriados globales | Respeta tu respuesta #6 |
| `employee_schedules` | Agregar `published_at`, `modified_at`, columnas de notificación | Tracking de publicación |
| `SchedulesPage.tsx` | Reestructurar con 3 tabs: Feriados, Calendario, Solicitudes | Nuevo flujo |

### Lo que ELIMINAMOS (Código muerto)
| Elemento | Razón |
|----------|-------|
| `EmployeeScheduleEditor.tsx` (1155 líneas) | Código muerto que no se usa |
| `MonthlyScheduleCalendar.tsx` (468 líneas) | Usa tabla `employees` vacía, lógica rota |
| Tab "Horario Semanal Base" en SchedulesPage | No se usa |

### Lo que CREAMOS
| Elemento | Descripción |
|----------|-------------|
| `HolidaysManager.tsx` | CRUD de feriados globales |
| `CreateScheduleWizard.tsx` | Wizard para crear horario mensual completo |
| `MonthlyScheduleView.tsx` | Vista de calendario con todos los horarios |
| `useSchedules.ts` | Hook unificado para horarios |
| `useHolidays.ts` | Hook para feriados |
| `send-schedule-notification` | Edge function para emails |

---

## Flujo del Usuario

### Flujo 1: Configurar Feriados (Antes de crear horarios)

```text
┌────────────────────────────────────────────────────────────┐
│ HORARIOS > FERIADOS                                        │
├────────────────────────────────────────────────────────────┤
│ ℹ️ Los feriados son globales para todas las sucursales     │
│                                                            │
│ FEBRERO 2026                         [+ Agregar Feriado]   │
│ ───────────────────────────────────────────────────────────│
│                                                            │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐                        │
│ │ 16 Feb  │ │ 17 Feb  │ │ 24 Feb  │                        │
│ │ Carnaval│ │ Carnaval│ │ Puente  │                        │
│ │  [🗑️]   │ │  [🗑️]   │ │  [🗑️]   │                        │
│ └─────────┘ └─────────┘ └─────────┘                        │
│                                                            │
│ Sin feriados configurados para Marzo 2026                  │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Flujo 2: Crear Horario Mensual (Wizard paso a paso)

**Paso 1: Seleccionar empleado**
```text
┌────────────────────────────────────────────────────────────┐
│ CREAR HORARIO - Paso 1 de 3                                │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ Mes: Febrero 2026                                          │
│                                                            │
│ Seleccioná un empleado:                                    │
│                                                            │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ 🔘 Juan Pérez (Cajero)                                  ││
│ │    ⚠️ Tiene 2 solicitudes pendientes para este mes     ││
│ ├─────────────────────────────────────────────────────────┤│
│ │ ○ María García (Encargado)                              ││
│ │    ✅ Sin solicitudes pendientes                        ││
│ ├─────────────────────────────────────────────────────────┤│
│ │ ○ Carlos López (Empleado)                               ││
│ │    ✅ Sin solicitudes pendientes                        ││
│ └─────────────────────────────────────────────────────────┘│
│                                                            │
│                                          [Cancelar] [Siguiente →]│
└────────────────────────────────────────────────────────────┘
```

**Paso 2: Ver solicitudes y feriados**
```text
┌────────────────────────────────────────────────────────────┐
│ CREAR HORARIO - Paso 2 de 3                                │
│ Juan Pérez - Febrero 2026                                  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ 📋 SOLICITUDES DE JUAN PARA ESTE MES:                      │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ 📅 15 Feb - Día libre - "Turno médico"         [Aprobar]││
│ │ 📅 20 Feb - Día libre - "Compromiso familiar"  [Aprobar]││
│ └─────────────────────────────────────────────────────────┘│
│                                                            │
│ 🎉 FERIADOS DEL MES:                                       │
│ • 16 Feb - Carnaval                                        │
│ • 17 Feb - Carnaval                                        │
│                                                            │
│ Estos días ya están marcados como no laborables.           │
│                                                            │
│                                   [← Atrás] [Siguiente →]  │
└────────────────────────────────────────────────────────────┘
```

**Paso 3: Cargar horario día por día**
```text
┌────────────────────────────────────────────────────────────┐
│ CREAR HORARIO - Paso 3 de 3                                │
│ Juan Pérez - Febrero 2026                                  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ [Aplicar turno a selección] [Copiar semana anterior]       │
│                                                            │
│     Dom   Lun   Mar   Mié   Jue   Vie   Sáb               │
│ ┌─────┬─────┬─────┬─────┬─────┬─────┬─────┐               │
│ │     │  1  │  2  │  3  │  4  │  5  │  6  │               │
│ │     │09-17│09-17│LIBRE│09-17│09-17│     │               │
│ ├─────┼─────┼─────┼─────┼─────┼─────┼─────┤               │
│ │  7  │  8  │  9  │ 10  │ 11  │ 12  │ 13  │               │
│ │     │09-17│09-17│09-17│09-17│09-17│     │               │
│ ├─────┼─────┼─────┼─────┼─────┼─────┼─────┤               │
│ │ 14  │ 15  │ 16🎉│ 17🎉│ 18  │ 19  │ 20  │               │
│ │     │LIBRE│FERI │FERI │09-17│09-17│LIBRE│ <- Solicitudes│
│ └─────┴─────┴─────┴─────┴─────┴─────┴─────┘   aprobadas   │
│                                                            │
│ Click en un día para editar horario                        │
│                                                            │
│ ☑️ Notificar a Juan por email                              │
│ ☑️ Enviar comunicado interno                               │
│                                                            │
│                          [← Atrás] [💾 Guardar y Publicar] │
└────────────────────────────────────────────────────────────┘
```

### Flujo 3: Ver Calendario General

```text
┌────────────────────────────────────────────────────────────┐
│ HORARIOS > CALENDARIO                    Febrero 2026      │
├────────────────────────────────────────────────────────────┤
│ [◀ Ene] [Feb ▶]           [Filtrar empleado ▼]             │
│                                    [+ Crear Horario]       │
│                                                            │
│     Dom   Lun   Mar   Mié   Jue   Vie   Sáb               │
│ ┌─────┬─────┬─────┬─────┬─────┬─────┬─────┐               │
│ │     │  1  │  2  │  3  │  4  │  5  │  6  │               │
│ │     │JP 09│JP 09│JP L │JP 09│JP 09│     │               │
│ │     │MG 10│MG 10│MG 10│MG 10│MG 10│MG 18│               │
│ │     │CL 14│CL 14│CL 14│CL L │CL 14│CL 14│               │
│ ├─────┼─────┼─────┼─────┼─────┼─────┼─────┤               │
│ │  7  │  8  │  ...                                        │
│ └─────┴─────┴─────────────────────────────────────────────┘│
│                                                            │
│ JP = Juan Pérez | MG = María García | CL = Carlos López    │
│ L = Franco | 🎉 = Feriado                                  │
└────────────────────────────────────────────────────────────┘
```

### Flujo 4: Modificación con Notificación

```text
┌────────────────────────────────────────────────────────────┐
│ ⚠️ Modificación de Horario Publicado                       │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ Estás por modificar el horario de Juan Pérez para el       │
│ día 18 de Febrero.                                         │
│                                                            │
│ El horario ya fue publicado el 25 de Enero.                │
│                                                            │
│ ☑️ Notificar cambio por email                              │
│ ☑️ Enviar comunicado interno                               │
│                                                            │
│ Motivo del cambio (opcional):                              │
│ ┌─────────────────────────────────────────────────────────┐│
│ │                                                         ││
│ └─────────────────────────────────────────────────────────┘│
│                                                            │
│                              [Cancelar] [Guardar Cambio]   │
└────────────────────────────────────────────────────────────┘
```

---

## Cambios en Base de Datos

### 1. Modificar `employee_schedules`

```sql
-- Agregar columnas para tracking de publicación
ALTER TABLE employee_schedules
ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS published_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS modified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS modified_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS modification_reason TEXT,
ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMPTZ;

-- Crear índice para consultas por mes/año/usuario
CREATE INDEX IF NOT EXISTS idx_schedules_user_month 
ON employee_schedules(user_id, schedule_year, schedule_month);
```

### 2. Usar `special_days` existente (sin cambios de estructura)

La tabla ya tiene `branch_id` nullable para feriados globales:
```sql
-- Estructura existente (no requiere cambios):
-- id, branch_id (NULL = global), day_date, day_type, description, user_id, created_by, created_at
```

---

## Archivos a Crear

### 1. `src/hooks/useHolidays.ts`
```typescript
// Hook para CRUD de feriados globales
// - useHolidays(month, year): Obtener feriados del mes
// - useCreateHoliday(): Crear feriado
// - useDeleteHoliday(): Eliminar feriado
```

### 2. `src/hooks/useSchedules.ts`
```typescript
// Hook unificado para horarios
// - useMonthlySchedules(branchId, month, year, employeeId?)
// - useEmployeeSchedule(userId, month, year)
// - useSaveMonthlySchedule(): Guardar horario completo del mes
// - useModifySchedule(): Modificar día específico con notificación
```

### 3. `src/components/hr/HolidaysManager.tsx`
```typescript
// Componente para gestionar feriados
// - Lista de feriados del mes actual y próximo
// - Agregar/eliminar feriados
// - Solo visible para encargados+
```

### 4. `src/components/hr/CreateScheduleWizard.tsx`
```typescript
// Wizard de 3 pasos
// Paso 1: Seleccionar empleado (mostrando solicitudes pendientes)
// Paso 2: Ver/aprobar solicitudes + ver feriados
// Paso 3: Grilla interactiva para cargar horarios
// Opciones: copiar semana, aplicar turno masivo
// Checkboxes: notificar por email, crear comunicado
```

### 5. `src/components/hr/MonthlyScheduleView.tsx`
```typescript
// Vista de calendario mensual
// - Muestra todos los empleados o filtrado
// - Click para editar día específico
// - Indicadores de feriados
// - Botón para crear nuevo horario
```

### 6. `supabase/functions/send-schedule-notification/index.ts`
```typescript
// Edge function para notificar horarios
// - Envía email cuando se publica/modifica horario
// - Usa Resend (igual que send-staff-invitation)
// - Incluye resumen del horario en el email
```

---

## Archivos a Modificar

### 1. `src/pages/local/SchedulesPage.tsx`
**Cambios:**
- Eliminar import de `EmployeeScheduleEditor`
- Cambiar tabs a: "Feriados", "Calendario", "Solicitudes"
- Usar nuevos componentes

### 2. `src/components/hr/PendingScheduleRequests.tsx`
**Cambios:**
- Agregar función para aprobar solicitud desde el wizard
- Crear comunicado automático al aprobar/rechazar (línea 113 tiene TODO)

---

## Archivos a Eliminar

1. `src/components/hr/EmployeeScheduleEditor.tsx` (1155 líneas - código muerto)
2. `src/components/hr/MonthlyScheduleCalendar.tsx` (468 líneas - usa tabla vacía)

---

## Notificaciones

### Canales de notificación (según tu respuesta #9: "Todas las anteriores")

| Evento | Comunicado Interno | Email | Banner/Alerta |
|--------|-------------------|-------|---------------|
| Horario publicado | ✅ | ✅ | ✅ (badge en Mi Cuenta) |
| Horario modificado | ✅ (diferente texto) | ✅ | ✅ |
| Solicitud aprobada | ✅ | ✅ | ✅ |
| Solicitud rechazada | ✅ | ✅ | ✅ |

### Ejemplo de comunicado automático

```javascript
{
  title: "📅 Tu horario de Febrero ya está disponible",
  body: "Tu encargado publicó el horario del mes. Revisalo en 'Mi Horario'.",
  type: "info",
  tag: "horario",
  source_type: "local",
  source_branch_id: branchId,
  target_roles: null, // Para el usuario específico
  // Se filtra por user_id en frontend
}
```

---

## Permisos (respetando V2)

| Acción | Roles permitidos |
|--------|------------------|
| Ver feriados | Todos |
| Gestionar feriados | superadmin, coordinador |
| Ver calendario de equipo | encargado, franquiciado, superadmin |
| Crear/editar horarios | encargado, franquiciado, superadmin |
| Ver mi propio horario | Todos los empleados |
| Solicitar día libre | Todos los empleados |

---

## Orden de Implementación

| Paso | Descripción | Archivos |
|------|-------------|----------|
| 1 | Migración de BD | SQL: agregar columnas a employee_schedules |
| 2 | Hooks | useHolidays.ts, useSchedules.ts |
| 3 | Componentes | HolidaysManager.tsx |
| 4 | Componentes | CreateScheduleWizard.tsx |
| 5 | Componentes | MonthlyScheduleView.tsx |
| 6 | Integración | Modificar SchedulesPage.tsx |
| 7 | Edge Function | send-schedule-notification |
| 8 | Eliminar código muerto | EmployeeScheduleEditor.tsx, MonthlyScheduleCalendar.tsx |
| 9 | Testing | Flujo completo end-to-end |

---

## Vista del Empleado (Mi Cuenta)

El componente `MyScheduleCard.tsx` ya funciona correctamente con `user_id` y se reutiliza sin cambios. Solo agregamos un badge de "Nuevo" cuando hay un horario recién publicado.

---

## Consideraciones Adicionales

1. **Copiar semana anterior**: Función para acelerar la carga de horarios repetitivos
2. **Aplicar turno masivo**: Seleccionar varios días y aplicar el mismo horario
3. **Feriados pre-cargados**: Podemos agregar un botón para cargar feriados oficiales de Argentina
4. **Historial de cambios**: Los campos `modified_at`, `modified_by`, `modification_reason` permiten auditoría
5. **Restricción multi-sucursal** (respuesta #12): Un encargado solo puede editar horarios de empleados de SU sucursal (validado por `branch_ids` en `user_roles_v2`)
