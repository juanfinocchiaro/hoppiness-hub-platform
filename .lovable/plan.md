
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

## Fase 3: Copiar Mes Anterior ✅ COMPLETADA

### 3.1 Lógica de mapeo semanal ✅
- Hook `usePreviousMonthPattern` busca la última semana completa del mes anterior
- Función `applyPatternToMonth` mapea el patrón a todos los días del mes actual
- Los cambios se agregan como `pendingChanges` (borrador)

### 3.2 Implementación ✅
- Botón "Copiar mes anterior" en toolbar (prominente cuando el mes está vacío)
- Diálogo de confirmación antes de aplicar
- Los horarios se cargan como borrador

---

## Fase 4: Drag-to-Fill ✅ COMPLETADA

### 4.1 Comportamiento ✅
- Estado `canShowFillHandle` detecta cuando 1 celda con contenido está seleccionada
- `handleFillDragStart`, `handleFillDragMove` implementados
- Detecta dirección (horizontal/vertical) automáticamente

### 4.2 Restricción ✅
Solo aparece cuando hay 1 celda seleccionada con contenido.

---

## Fase 5: Mejoras de Visualización ✅ COMPLETADA

### 5.1 Mostrar nombre y apellido completo ✅
Cambiado a nombre completo con `truncate` y `title` tooltip.

### 5.2 Ordenar empleados jerárquicamente ✅
Array `team` ordenado por rol:
1. Encargados primero (priority 1)
2. Cajeros (priority 2)
3. Empleados operativos (priority 3)

### 5.3 Feriados en header ✅
- Indicador visual (punto naranja) en días feriados
- Tooltip con nombre del feriado al pasar el mouse

---

## Archivos Modificados

| Archivo | Cambios | Estado |
|---------|---------|--------|
| `ScheduleCopyPasteControls.tsx` | ELIMINADO | ✅ |
| `ScheduleQuickActions.tsx` | ELIMINADO | ✅ |
| `useScheduleSelection.ts` | Click sin modifier, drag-select, fill-drag | ✅ |
| `InlineScheduleEditor.tsx` | Click=select, doble-click=edit, drag handlers, toolbar, ordenamiento | ✅ |
| `ScheduleCellPopover.tsx` | Componente controlado | ✅ |
| `SelectionToolbar.tsx` | Inputs de hora, auto-focus, Aplicar | ✅ |
| `popover.tsx` | Agregado PopoverAnchor export | ✅ |
| `usePreviousMonthSchedules.ts` | NUEVO - Fase 3 | ✅ |
| `SchedulesPage.tsx` | Prop readOnly para impersonación | ✅ |

---

## Resumen de Progreso

| Fase | Descripción | Estado |
|------|-------------|--------|
| 0 | Limpieza + break en DB | ✅ Completada |
| 1 | Click = Seleccionar | ✅ Completada |
| 2 | Toolbar con edición inline | ✅ Completada |
| 3 | Copiar mes anterior | ✅ Completada |
| 4 | Drag-to-fill | ✅ Completada |
| 5 | Mejoras visuales | ✅ Completada |

---

## Resultado Final

El encargado ahora puede:
1. ✅ Abrir el mes vacío → click "Copiar mes anterior" → todo prellenado
2. ✅ Click en una celda para seleccionar, click-drag para seleccionar rango
3. ✅ Tipear horario en la toolbar → Enter → aplicado a todas las celdas seleccionadas
4. ✅ Arrastrar para replicar horizontalmente o verticalmente (fill-drag)
5. ✅ Doble-click para configurar posición o break específico
6. ✅ Ver nombre completo de cada empleado, ordenados por jerarquía
7. ✅ Ver feriados marcados en el header con tooltip informativo
