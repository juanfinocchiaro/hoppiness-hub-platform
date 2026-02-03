
# Plan de Mejoras: PIN de Fichaje, Fecha de Ingreso, y Sistema de Horarios

## Resumen de Cambios Solicitados

1. **PIN de Fichaje en Mi Cuenta**
   - El banner "Configura tu PIN" aparece aunque el PIN ya existe (bug)
   - Mover la gestión de PIN de /cuenta/perfil a /cuenta directamente
   - Mostrar PIN con botón "ver" y "modificar" en modal independiente

2. **Editar Fecha de Ingreso**
   - Los encargados deben poder editar la fecha de ingreso (hire_date)
   - Ya existe en EmployeeDataModal pero verificar que funcione correctamente

3. **UI de Horarios Simplificada**
   - Eliminar el wizard de 3 pasos
   - Edición inline tipo Excel directamente en el calendario
   - Al guardar, mostrar confirmación antes de notificar

4. **Visualización de Cobertura por Turno**
   - Mostrar cuántos empleados hay por hora/turno del día
   - Barra o resumen debajo del calendario

---

## CAMBIO 1: Sistema de PIN de Fichaje Mejorado

### 1.1 Problema Actual

El banner `MissingPinBanner` aparece cuando `branchPinData?.filter(r => !r.clock_pin)` encuentra registros sin PIN. Sin embargo:
- El PIN existe en `user_branch_roles.clock_pin`
- Pero la query puede no estar trayendo el dato correctamente
- Además, la gestión de PIN está en `/cuenta/perfil`, muy enterrado

### 1.2 Nueva Arquitectura

**Mover PIN a CuentaDashboard con modal:**

| Elemento | Ubicación Actual | Ubicación Nueva |
|----------|------------------|-----------------|
| BranchPinCard | CuentaPerfil.tsx | CuentaDashboard.tsx (como modal) |
| MissingPinBanner | CuentaDashboard.tsx | Mantener pero corregir lógica |

### 1.3 Archivos a Modificar

**`src/pages/cuenta/CuentaDashboard.tsx`:**
- Agregar estado para modal de PIN abierto
- Crear nuevo componente inline `PinManagementModal`
- Mostrar PIN por sucursal con botones "Ver" / "Modificar"
- Corregir la lógica de detección de PIN faltante

**`src/pages/cuenta/CuentaPerfil.tsx`:**
- Remover toda la sección de PIN de fichaje
- Mantener solo: avatar, nombre, teléfono, fecha nacimiento, contraseña

### 1.4 Nuevo Componente: PinManagementModal

```
src/components/cuenta/PinManagementModal.tsx
```

**Funcionalidad:**
- Lista de sucursales asignadas
- Por cada sucursal:
  - Si tiene PIN: mostrar "••••" + botón "Ver" + botón "Modificar"
  - Si no tiene PIN: mostrar "Sin PIN" + botón "Crear"
- Al hacer clic en "Ver": mostrar PIN durante 3 segundos
- Al hacer clic en "Modificar" o "Crear": formulario inline con validación

### 1.5 UI en CuentaDashboard

Dentro de la sección "Mi Trabajo", agregar debajo de cada card de sucursal:

```
┌─────────────────────────────────────────────┐
│ 📍 Manantiales                              │
│ └─ PIN: •••• [Ver] [Modificar]              │
│                                    [Entrar] │
└─────────────────────────────────────────────┘
```

O como alternativa más limpia:

```
┌─────────────────────────────────────────────┐
│ 📍 Manantiales          [👤 Encargado]      │
│ 🔑 PIN configurado ✓    [Gestionar PIN]     │
└─────────────────────────────────────────────┘
```

---

## CAMBIO 2: Editar Fecha de Ingreso (Verificación)

### 2.1 Estado Actual

El modal `EmployeeDataModal.tsx` ya tiene:
- Campo `hire_date` en la pestaña "Laboral" (línea 335-349)
- Input tipo date que se guarda en `employee_data.hire_date`

### 2.2 Verificación Necesaria

La fecha de ingreso ya es editable. El único ajuste necesario es:
- Agregar texto explicativo más claro: "Fecha real de inicio en la empresa (puede ser anterior al registro en el sistema)"
- Posiblemente hacer el campo más prominente

### 2.3 Modificación Menor

En `EmployeeDataModal.tsx`, actualizar el texto descriptivo del campo hire_date.

---

## CAMBIO 3: UI de Horarios Tipo Excel

### 3.1 Problema Actual

El flujo actual requiere:
1. Clic en "Crear Horario" → abre wizard
2. Paso 1: Seleccionar empleado
3. Paso 2: Revisar solicitudes
4. Paso 3: Configurar días con selección múltiple y presets
5. Guardar → notificaciones

**Demasiados pasos para ediciones simples.**

### 3.2 Nuevo Flujo Propuesto

**Edición inline directamente en el calendario:**

1. El calendario muestra TODOS los empleados con sus celdas
2. Clic en celda vacía → aparece popover rápido con opciones
3. Clic en celda con horario → aparece popover de edición
4. Los cambios se acumulan localmente (estado "dirty")
5. Botón flotante "Guardar cambios (N pendientes)" aparece cuando hay cambios
6. Al guardar → modal de confirmación: "Se notificará a X empleados"

### 3.3 Componentes a Crear/Modificar

**Nuevo: `src/components/hr/InlineScheduleEditor.tsx`**
- Reemplaza a MonthlyScheduleView + CreateScheduleWizard
- Grid editable con todas las celdas interactivas
- Estado local para cambios pendientes
- Botón flotante de guardar

**Nuevo: `src/components/hr/ScheduleCellPopover.tsx`**
- Popover que aparece al hacer clic en una celda
- Presets de turno: Mañana, Tarde, Noche, Franco
- Input de hora personalizada
- Selector de posición (opcional)
- Botón "Aplicar"

**Nuevo: `src/components/hr/SaveScheduleDialog.tsx`**
- Modal de confirmación antes de guardar
- Lista de empleados afectados
- Checkboxes de notificación (email/comunicado)
- Botón "Publicar horarios"

**Modificar: `src/pages/local/SchedulesPage.tsx`**
- Reemplazar `MonthlyScheduleView` por `InlineScheduleEditor`
- Eliminar referencia a CreateScheduleWizard

### 3.4 Flujo Visual del Nuevo Sistema

```
┌─────────────────────────────────────────────────────────────┐
│ Horarios de Febrero 2026                    [< Mes] [Mes >] │
├─────────────────────────────────────────────────────────────┤
│         │ Lun 1 │ Mar 2 │ Mié 3 │ Jue 4 │ Vie 5 │ Sab 6 │   │
├─────────┼───────┼───────┼───────┼───────┼───────┼───────┤   │
│ Juan P  │ 19:30 │ 19:30 │   L   │ 12:00 │ 19:30 │ 19:30 │   │
│ María G │ 12:00 │ 12:00 │ 12:00 │   L   │ 12:00 │ 19:30 │   │
│ Pedro L │   -   │   -   │ 19:30*│ 19:30 │   -   │   -   │   │
└─────────────────────────────────────────────────────────────┘
                                    * = modificado sin guardar

┌─────────────────────────────────────────────────────────────┐
│ 3 cambios pendientes                    [Descartar] [Guardar]│
└─────────────────────────────────────────────────────────────┘
```

### 3.5 Estructura de Estado

```typescript
interface PendingChange {
  userId: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  isDayOff: boolean;
  position: WorkPositionType | null;
  action: 'create' | 'update' | 'delete';
}

// Estado local en el componente
const [pendingChanges, setPendingChanges] = useState<Map<string, PendingChange>>();
```

---

## CAMBIO 4: Visualización de Cobertura por Turno

### 4.1 Problema

El encargado quiere ver rápidamente:
- ¿Cuántas personas trabajan en cada turno del día?
- ¿Hay días con poca gente?

### 4.2 Solución: Barra de Resumen por Día

Debajo del calendario, agregar una fila de resumen:

```
│ Día     │ Lun 1 │ Mar 2 │ Mié 3 │ Jue 4 │ Vie 5 │ Sab 6 │
│─────────┼───────┼───────┼───────┼───────┼───────┼───────│
│ 👥 Total│   5   │   4   │   3   │   6   │   5   │   7   │
│ ☀️ Med  │   2   │   2   │   1   │   3   │   2   │   3   │
│ 🌙 Noche│   3   │   2   │   2   │   3   │   3   │   4   │
```

Con indicadores de color:
- **Rojo**: Menos de 2 personas en un turno
- **Amarillo**: 2-3 personas
- **Verde**: 4+ personas

### 4.3 Componente Nuevo: ShiftCoverageBar

```
src/components/hr/ShiftCoverageBar.tsx
```

**Props:**
- `schedules: ScheduleEntry[]`
- `branchShifts: BranchShift[]` (para saber los turnos configurados)
- `monthDays: Date[]`

**Lógica:**
1. Agrupar schedules por fecha
2. Para cada fecha, contar cuántos en cada franja horaria
3. Clasificar según `branch_shifts` del local (Mediodía: 12:00-17:00, Noche: 17:00-00:00)

### 4.4 Integración

Agregar al final del grid en `InlineScheduleEditor.tsx`:

```jsx
<ShiftCoverageBar 
  schedules={allSchedules}
  branchShifts={branchShifts}
  monthDays={monthDays}
/>
```

---

## Archivos a Crear

| Archivo | Descripción |
|---------|-------------|
| `src/components/cuenta/PinManagementModal.tsx` | Modal para gestionar PINs |
| `src/components/hr/InlineScheduleEditor.tsx` | Editor de horarios tipo Excel |
| `src/components/hr/ScheduleCellPopover.tsx` | Popover de edición de celda |
| `src/components/hr/SaveScheduleDialog.tsx` | Dialog de confirmación al guardar |
| `src/components/hr/ShiftCoverageBar.tsx` | Barra de resumen de cobertura |

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/pages/cuenta/CuentaDashboard.tsx` | Agregar gestión de PIN inline + modal |
| `src/pages/cuenta/CuentaPerfil.tsx` | Remover sección de PIN |
| `src/pages/local/SchedulesPage.tsx` | Usar nuevo InlineScheduleEditor |
| `src/components/local/team/EmployeeDataModal.tsx` | Mejorar texto de hire_date |

## Archivos a Eliminar (Deprecar)

| Archivo | Razón |
|---------|-------|
| `src/components/hr/CreateScheduleWizard.tsx` | Reemplazado por edición inline |
| `src/components/cuenta/BranchPinCard.tsx` | Integrado en PinManagementModal |

---

## Orden de Implementación

1. **Fase A: PIN de Fichaje** (más urgente - afecta onboarding)
   - Crear PinManagementModal
   - Modificar CuentaDashboard
   - Limpiar CuentaPerfil

2. **Fase B: Fecha de Ingreso**
   - Pequeño ajuste de texto en EmployeeDataModal

3. **Fase C: Horarios Inline**
   - Crear InlineScheduleEditor
   - Crear ScheduleCellPopover
   - Crear SaveScheduleDialog
   - Integrar en SchedulesPage

4. **Fase D: Cobertura por Turno**
   - Crear ShiftCoverageBar
   - Integrar en InlineScheduleEditor

---

## Detalles Técnicos

### Query para Cobertura

```typescript
// Clasificar un horario según branch_shifts
function getShiftForTime(startTime: string, branchShifts: BranchShift[]): string | null {
  const [hours] = startTime.split(':').map(Number);
  
  for (const shift of branchShifts) {
    const [shiftStart] = shift.start_time.split(':').map(Number);
    const [shiftEnd] = shift.end_time.split(':').map(Number);
    
    // Manejar cruce de medianoche
    if (shiftEnd < shiftStart) {
      if (hours >= shiftStart || hours < shiftEnd) return shift.name;
    } else {
      if (hours >= shiftStart && hours < shiftEnd) return shift.name;
    }
  }
  return null;
}
```

### Hook para Turnos de Sucursal

```typescript
export function useBranchShifts(branchId: string | undefined) {
  return useQuery({
    queryKey: ['branch-shifts', branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branch_shifts')
        .select('*')
        .eq('branch_id', branchId)
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
    enabled: !!branchId,
  });
}
```
