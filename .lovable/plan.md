
# Plan de Implementación: Editor de Horarios v2 "Estilo Excel"

## Objetivo Principal
Transformar el editor de horarios actual en una experiencia idéntica a Excel, donde:
- **Click simple = Seleccionar** (no abre popover) ✅
- **Doble-click = Editar** (abre popover) ✅
- **Click-drag = Seleccionar rango** rectangular ✅
- **Toolbar siempre visible** con inputs de hora para edición rápida ✅

---

## Fase 0: Limpieza y Preparación de Base de Datos ✅ COMPLETADA

### 0.1 Eliminar código muerto ✅
| Archivo | Acción |
|---------|--------|
| `src/components/hr/ScheduleCopyPasteControls.tsx` | ✅ Eliminado |
| `src/components/hr/ScheduleQuickActions.tsx` | ✅ Eliminado |

### 0.2 Migración: agregar columnas de break ✅
```sql
ALTER TABLE employee_schedules 
  ADD COLUMN IF NOT EXISTS break_start TIME,
  ADD COLUMN IF NOT EXISTS break_end TIME;
```

---

## Fase 1: Click = Seleccionar (Cambio de paradigma) ✅ COMPLETADA

### 1.1 Nuevo modelo de interacción ✅
| Gesto | Comportamiento |
|-------|---------------|
| Click simple | **Selecciona la celda** |
| Ctrl/Cmd + Click | Toggle celda en selección |
| Shift + Click | Extiende selección (rango rectangular) |
| Click-drag | **Selecciona rango rectangular** |
| Doble-click | **Abre popover de edición** |

### 1.2 Cambios implementados ✅
- `useScheduleSelection.ts`: Drag-select con `handleDragStart`, `handleDragMove`, mouseup global
- `InlineScheduleEditor.tsx`: Click=select, doble-click=edit, drag handlers en celdas
- `ScheduleCellPopover.tsx`: Convertido a componente controlado con `open`/`onOpenChange`

---

## Fase 2: Toolbar Siempre Visible con Edición Inline ✅ COMPLETADA

### 2.1 Nuevo diseño del header ✅
- Row 1: View toggle (Personas/Cobertura) + Clipboard indicator + Save/Discard
- Row 2 (cuando hay selección): Inputs de hora + Apply + Franco + Copy/Paste/Clear

### 2.2 Cambios implementados ✅
- `SelectionToolbar.tsx`: Inputs de hora (Entrada/Salida), botón Aplicar, auto-focus, Tab navega, Enter aplica

---

## Fase 3: Copiar Mes Anterior (PENDIENTE)

### 3.1 Lógica de mapeo semanal
No es un mapeo 1:1 por fecha, sino por día de semana:
1. Tomar la última semana completa (Lun-Dom) del mes anterior como "patrón"
2. Replicar ese patrón en todas las semanas del mes nuevo
3. Los cambios se agregan como `pendingChanges` (no se guardan automáticamente)

### 3.2 Implementación
- Nueva función en `useSchedules.ts`: `usePreviousMonthSchedules(branchId, month, year)`
- Diálogo de confirmación antes de aplicar
- Los horarios se cargan como borrador, el encargado puede ajustar antes de publicar

---

## Fase 4: Drag-to-Fill (El "cuadradito" de Excel) (PENDIENTE)

### 4.1 Comportamiento
Cuando exactamente 1 celda con contenido está seleccionada:
1. Mostrar un cuadrado azul (6x6px) en la esquina inferior derecha de la celda
2. Al arrastrar horizontal: replica el horario a los días siguientes del mismo empleado
3. Al arrastrar vertical: replica el horario a otros empleados el mismo día

### 4.2 Implementación en `useScheduleSelection.ts`
- Estado: `fillOriginCell`, `isFilling`, `fillDirection`
- `handleFillDragStart`: al clickear el cuadradito
- `handleFillDragMove`: calcular dirección y celdas destino
- `handleFillDragEnd`: aplicar el valor a todas las celdas del rango

### 4.3 Restricción
Solo aparece cuando hay 1 celda seleccionada con contenido (no vacía, no rango múltiple).

---

## Fase 5: Mejoras de Visualización ✅ COMPLETADA

### 5.1 Mostrar nombre y apellido completo ✅
Cambiado a nombre completo con `truncate` y `title` tooltip.

### 5.2 Ordenar empleados jerárquicamente ✅
Array `team` ordenado por rol:
1. Encargados primero (priority 1)
2. Cajeros (priority 2)
3. Empleados operativos (priority 3)

### 5.3 Fila de headcount (OPCIONAL - No implementado)
Agregar una fila sticky al fondo del grid que muestre el total de empleados trabajando cada día.

---

## Archivos Modificados

| Archivo | Cambios | Estado |
|---------|---------|--------|
| `ScheduleCopyPasteControls.tsx` | ELIMINADO | ✅ |
| `ScheduleQuickActions.tsx` | ELIMINADO | ✅ |
| `useScheduleSelection.ts` | Click sin modifier, drag-select | ✅ |
| `InlineScheduleEditor.tsx` | Click=select, doble-click=edit, drag handlers, toolbar, ordenamiento | ✅ |
| `ScheduleCellPopover.tsx` | Componente controlado | ✅ |
| `SelectionToolbar.tsx` | Inputs de hora, auto-focus, Aplicar | ✅ |
| `popover.tsx` | Agregado PopoverAnchor export | ✅ |

---

## Resumen de Progreso

| Fase | Descripción | Estado |
|------|-------------|--------|
| 0 | Limpieza + break en DB | ✅ Completada |
| 1 | Click = Seleccionar | ✅ Completada |
| 2 | Toolbar con edición inline | ✅ Completada |
| 3 | Copiar mes anterior | ⏳ Pendiente |
| 4 | Drag-to-fill | ⏳ Pendiente |
| 5 | Mejoras visuales | ✅ Completada |

---

## Resultado Actual

El encargado ahora puede:
1. ✅ Click en una celda para seleccionar, click-drag para seleccionar rango
2. ✅ Tipear horario en la toolbar → Enter → aplicado a todas las celdas seleccionadas
3. ✅ Doble-click para configurar posición o break específico
4. ✅ Ver nombre completo de cada empleado, ordenados por jerarquía
5. ⏳ "Copiar mes anterior" (próxima iteración)
6. ⏳ Arrastrar el cuadradito de una celda para replicar (próxima iteración)
