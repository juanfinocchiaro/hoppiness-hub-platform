
# Plan de Implementación: Editor de Horarios v2 "Estilo Excel"

## Objetivo Principal
Transformar el editor de horarios actual en una experiencia idéntica a Excel, donde:
- **Click simple = Seleccionar** (no abre popover)
- **Doble-click = Editar** (abre popover)
- **Click-drag = Seleccionar rango** rectangular
- **Toolbar siempre visible** con inputs de hora para edición rápida

---

## Fase 0: Limpieza y Preparación de Base de Datos

### 0.1 Eliminar código muerto
| Archivo | Acción |
|---------|--------|
| `src/components/hr/ScheduleCopyPasteControls.tsx` | Eliminar (204 líneas no usadas) |
| `src/components/hr/ScheduleQuickActions.tsx` | Eliminar (98 líneas no usadas) |

### 0.2 Migración: agregar columnas de break
La tabla `employee_schedules` actualmente no persiste los campos de break. Se agregaran las columnas:

```sql
ALTER TABLE employee_schedules 
  ADD COLUMN IF NOT EXISTS break_start TIME,
  ADD COLUMN IF NOT EXISTS break_end TIME;
```

### 0.3 Actualizar save mutation
Modificar `InlineScheduleEditor.tsx` para incluir `break_start` y `break_end` en los INSERT/UPDATE.

---

## Fase 1: Click = Seleccionar (Cambio de paradigma)

Este es el cambio más importante de todo el plan.

### 1.1 Nuevo modelo de interacción
| Gesto | Comportamiento Actual | Comportamiento Nuevo |
|-------|----------------------|---------------------|
| Click simple | Abre popover | **Selecciona la celda** |
| Ctrl/Cmd + Click | Selecciona celda | Toggle celda en selección |
| Shift + Click | Selecciona rango | Extiende selección |
| Click-drag | No existe | **Selecciona rango rectangular** |
| Doble-click | No definido | **Abre popover de edición** |

### 1.2 Cambios en `InlineScheduleEditor.tsx`
1. Separar el `ScheduleCellPopover` del click simple
2. El click simple ahora llama `selection.handleCellClick()` sin requerir Ctrl
3. El popover se abre solo con doble-click (controlado con estado `editingCell`)
4. Implementar drag-select:
   - `onMouseDown` en celda: iniciar selección, marcar `dragStartCell`
   - `onMouseMove` en contenedor: si hay `dragStartCell`, calcular rectángulo de selección
   - `onMouseUp`: confirmar selección, limpiar `dragStartCell`

### 1.3 Cambios en `useScheduleSelection.ts`
- `handleCellClick` ya no requiere modifier keys para selección simple
- Nuevo estado: `isDragging`, `dragStartCell`, `dragCurrentCell`
- Nuevas funciones: `handleDragStart`, `handleDragMove`, `handleDragEnd`
- La selección por arrastre calcula el rectángulo entre celda inicio y celda actual

### 1.4 Cambios en `ScheduleCellPopover.tsx`
- Convertir de Popover con trigger a componente controlado
- Nuevo prop: `open` y `onOpenChange` (controlado externamente)
- El componente padre decide cuándo abrir (en doble-click)

---

## Fase 2: Toolbar Siempre Visible con Edición Inline

### 2.1 Nuevo diseño del header (dos estados)

**Sin selección:**
```text
[ Personas | Cobertura ]              [ Copiar mes anterior ]
```

**Con selección (ej: 5 celdas):**
```text
[ 5 celdas ]  Entrada [__:__]  Salida [__:__]  [Aplicar]  [Franco]  |  [Copiar] [Pegar] [Limpiar]  |  [✕]
```

### 2.2 Cambios en `SelectionToolbar.tsx`
1. Agregar inputs de hora (Entrada/Salida) al centro de la toolbar
2. Botón "Aplicar" que llama `selection.handleApplyQuickSchedule(start, end)`
3. Auto-focus: cuando hay selección, el input de Entrada recibe el foco
4. Tab navega a Salida, Enter aplica el horario

### 2.3 Cambios en `InlineScheduleEditor.tsx`
1. Toolbar siempre visible (no solo cuando hay selección)
2. Integrar botón "Copiar mes anterior" en la toolbar principal
3. Si el mes está vacío, el botón se muestra más prominente

---

## Fase 3: Copiar Mes Anterior

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

## Fase 4: Drag-to-Fill (El "cuadradito" de Excel)

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

## Fase 5: Mejoras de Visualización

### 5.1 Mostrar nombre y apellido completo
Actualmente se muestra solo el primer nombre. Cambiar a nombre completo con `text-ellipsis`.

### 5.2 Ordenar empleados jerárquicamente
Ordenar el array `team` por rol:
1. Encargados primero
2. Cajeros/supervisores
3. Empleados operativos

### 5.3 Fila de headcount (opcional)
Agregar una fila sticky al fondo del grid que muestre el total de empleados trabajando cada día.

---

## Archivos a Modificar

| Archivo | Cambios | Fase |
|---------|---------|------|
| `ScheduleCopyPasteControls.tsx` | ELIMINAR | 0 |
| `ScheduleQuickActions.tsx` | ELIMINAR | 0 |
| `useScheduleSelection.ts` | Click sin modifier, drag-select, fill-drag | 1, 4 |
| `InlineScheduleEditor.tsx` | Click=select, doble-click=edit, drag handlers, toolbar | 1, 2, 3 |
| `ScheduleCellPopover.tsx` | Convertir a componente controlado | 1 |
| `SelectionToolbar.tsx` | Inputs de hora, auto-focus, Aplicar | 2 |

### Migración de Base de Datos
```sql
ALTER TABLE employee_schedules 
  ADD COLUMN IF NOT EXISTS break_start TIME,
  ADD COLUMN IF NOT EXISTS break_end TIME;
```

---

## Cronograma Sugerido

| Fase | Descripción | Esfuerzo | Prioridad |
|------|-------------|----------|-----------|
| 0 | Limpieza + break en DB | 1 hora | Hacer ya |
| 1 | Click = Seleccionar | 1 día | Hacer ya |
| 2 | Toolbar con edición inline | 1 día | Hacer ya |
| 3 | Copiar mes anterior | 0.5 días | Pronto |
| 4 | Drag-to-fill | 1 día | Pronto |
| 5 | Mejoras visuales | 0.5 días | Después |

**Total estimado: 4 días de desarrollo**

---

## Resultado Final Esperado

El encargado podrá:
1. Abrir el mes vacío → click "Copiar mes anterior" → todo prellenado
2. Click en una celda para seleccionar, click-drag para seleccionar rango
3. Tipear horario en la toolbar → Enter → aplicado a todas las celdas seleccionadas
4. Arrastrar el cuadradito de una celda para replicar hacia la derecha o abajo
5. Doble-click si necesita configurar posición o break específico
6. Ver nombre completo de cada empleado, ordenados por jerarquía

**Tiempo de carga de un mes: de 5+ minutos a menos de 1 minuto.**
