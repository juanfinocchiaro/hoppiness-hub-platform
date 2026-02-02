
# Plan: Sistema de Edición de Horarios y Limpieza

## Resumen del Problema

Actualmente, el sistema solo permite **crear horarios nuevos** que reemplazan completamente el mes anterior. No hay forma de:
- Editar un día específico de un horario ya publicado
- Ver visualmente qué empleados ya tienen horario y cuáles no

Además, la función "Copiar semana anterior" no aporta valor real al flujo de trabajo.

---

## Diagnóstico Técnico

| Elemento | Estado Actual |
|----------|---------------|
| `useSaveMonthlySchedule` | DELETE + INSERT completo del mes |
| `useModifySchedule` | Existe pero NO se usa |
| "Copiar semana anterior" | Líneas 223-249 y 588-596 del wizard |
| Edición de día individual | No implementada |

---

## Cambios a Implementar

### 1. Refactorizar MonthlyScheduleView para permitir edición de días

**Archivo**: `src/components/hr/MonthlyScheduleView.tsx`

- Al hacer clic en una celda con horario existente, abrir un modal de edición rápida
- Mostrar botón "Editar" al hacer hover sobre celdas con horario
- El modal permite:
  - Cambiar hora de entrada/salida
  - Marcar como franco
  - Ingresar motivo del cambio (obligatorio)
  - Opción de notificar al empleado

### 2. Crear componente EditScheduleDayModal

**Nuevo archivo**: `src/components/hr/EditScheduleDayModal.tsx`

Modal simple con:
- Selector de horario (presets + personalizado)
- Checkbox "Día franco"
- Campo de texto "Motivo del cambio" (obligatorio)
- Checkbox de notificaciones
- Botones Cancelar / Guardar

Usará el hook existente `useModifySchedule()`.

### 3. Eliminar "Copiar semana anterior"

**Archivo**: `src/components/hr/CreateScheduleWizard.tsx`

- Eliminar función `copyPreviousWeek` (líneas 223-249)
- Eliminar botón de la UI (líneas 588-596)

### 4. Mejorar visualización del calendario

**Archivo**: `src/components/hr/MonthlyScheduleView.tsx`

- Agregar indicador visual de "empleados con horario publicado" vs "sin horario"
- Mostrar ícono de lápiz al hover para indicar que es editable

---

## Flujo de Usuario Mejorado

```text
ANTES:
1. Encargado quiere cambiar horario de Braian del día 15
2. Abre "Crear Horario"
3. Selecciona Braian
4. Carga TODO el mes de nuevo
5. Al guardar, se borra el horario anterior completo

DESPUÉS:
1. Encargado ve calendario mensual
2. Hace clic en la celda del día 15 de Braian
3. Se abre modal de edición rápida
4. Cambia el horario y escribe "Cambio de turno por pedido del empleado"
5. Guarda solo ese día
```

---

## Detalles Técnicos

### EditScheduleDayModal Props

```typescript
interface EditScheduleDayModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule: ScheduleEntry;  // El registro existente
  employeeName: string;
  onSuccess: () => void;
}
```

### Lógica del Modal

```typescript
// Usar useModifySchedule existente
const modifySchedule = useModifySchedule();

const handleSave = async () => {
  await modifySchedule.mutateAsync({
    schedule_id: schedule.id,
    start_time: isDayOff ? undefined : startTime,
    end_time: isDayOff ? undefined : endTime,
    is_day_off: isDayOff,
    modification_reason: reason,
    notify_email: notifyEmail,
    notify_communication: notifyCommunication,
  });
};
```

---

## Archivos a Modificar

| Archivo | Cambio | Prioridad |
|---------|--------|-----------|
| `MonthlyScheduleView.tsx` | Agregar onClick en celdas + modal | Alta |
| `EditScheduleDayModal.tsx` | Nuevo componente | Alta |
| `CreateScheduleWizard.tsx` | Eliminar "Copiar semana anterior" | Media |

---

## Consideraciones de UX

1. **Solo se pueden editar días con horario existente** - Para agregar días nuevos, usar "Crear Horario"
2. **El motivo del cambio es obligatorio** - Para auditoría y comunicación
3. **Notificaciones opcionales** - Por defecto activadas
4. **Visual claro** - Celda hover muestra que es editable

---

## Ejemplo Visual del Modal

```text
┌─────────────────────────────────────────┐
│  Editar Horario - Braian                │
│  Viernes 15 de Febrero                  │
├─────────────────────────────────────────┤
│                                         │
│  Horario actual: 19:30 - 23:30          │
│                                         │
│  ○ Turno: [Tarde (14:00 - 22:00)   ▼]  │
│                                         │
│  □ Marcar como Franco                   │
│                                         │
│  Motivo del cambio: *                   │
│  [_________________________________]    │
│                                         │
│  ─────────────────────────────────────  │
│  ☑ Notificar por email                  │
│  ☑ Enviar comunicado interno            │
│                                         │
│        [Cancelar]     [Guardar]         │
└─────────────────────────────────────────┘
```
