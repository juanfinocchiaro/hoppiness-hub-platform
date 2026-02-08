
# Análisis Completo: Problemas de Drag-Selection en Editor de Horarios

## Resumen de Síntomas Reportados

| # | Síntoma | Descripción |
|---|---------|-------------|
| 1 | **Selección no se extiende hasta la última celda** | Arrastras de Dom1 a Mar3, pero solo se selecciona hasta Lun2 |
| 2 | **Deselección inesperada al arrastrar verticalmente** | Click en una celda, arrastrar hacia abajo, y se deselecciona todo |
| 3 | **"Ghost dragging" al volver a la ventana** | Al salir y volver, el mouse sin click selecciona celdas |

---

## Diagnóstico Técnico Detallado

### Problema 1: Selección que "no alcanza" la última celda

**Causa raíz identificada**: Conflicto entre `onPointerDown` y `onClick` en la misma celda.

**Flujo actual problemático:**
```text
1. PointerDown en Dom1 → handleDragStart() → isDragging=true, selection={Dom1}
2. PointerMove sobre Lun2 → handleGridPointerMove() → selection={Dom1,Lun2}
3. PointerMove sobre Mar3 → handleGridPointerMove() → ❌ NO SE EJECUTA
4. PointerUp → endDrag() → selection={Dom1,Lun2} (sin Mar3)
```

**¿Por qué Mar3 no se detecta?**

El problema está en `handleGridPointerMove` que usa `document.elementFromPoint(e.clientX, e.clientY)`:

```typescript
// Línea 309-314 del hook
const element = document.elementFromPoint(e.clientX, e.clientY);
if (!element) return;   // ← Si el cursor está entre celdas, retorna

const cellElement = element.closest('[data-cell]');
if (!cellElement) return;  // ← Si hay un overlay/tooltip, no encuentra la celda
```

**Problemas específicos:**
1. **Gaps entre celdas**: El `border-r` crea un espacio de 1px donde `elementFromPoint` no encuentra ninguna celda
2. **Z-index de Tooltips**: Al pasar sobre una celda con Tooltip, el elemento bajo el cursor puede ser el TooltipTrigger, no el div con `data-cell`
3. **Timing de actualización**: Si el `PointerMove` llega justo cuando React está re-renderizando (por el `setSelectedCells`), el elemento puede no estar disponible

### Problema 2: Deselección al arrastrar verticalmente (una fila hacia abajo)

**Causa raíz**: Doble ejecución de eventos `onClick` + `onPointerDown`.

**Flujo problemático:**
```text
1. PointerDown en CeldaA → handleDragStart() → isDragging=true
2. PointerMove (muy poco, cursor apenas sale) → didMove queda false
3. PointerUp → endDrag() → commit selection (solo CeldaA)
4. Click en CeldaB (porque el browser dispara click en la celda donde terminó el drag)
   → handleCellClick() → ¡reemplaza selección con solo CeldaB!
   → Pero si el cursor estaba entre celdas, no hay target válido
   → setSelectedCells(new Set([CeldaB])) o peor: new Set() vacío
```

**El flag `didMove` no previene esto correctamente** porque se revisa en `handleCellClick`:

```typescript
// Línea 240-243
if (dragStateRef.current.didMove) {
  dragStateRef.current.didMove = false;
  return;
}
```

Pero `didMove` solo se marca `true` si cambió de celda durante el drag. Si el movimiento fue mínimo (pero suficiente para que el browser registre la posición final en otra celda), `didMove=false` y el `onClick` pisa la selección.

### Problema 3: Ghost dragging (selección sin click)

**Causa**: Los listeners de `blur` y `visibilitychange` pueden no ejecutarse si el focus se pierde de cierta manera (ej: click en otra app sin cambiar pestaña).

**Además**: El `onPointerMove` en el contenedor se ejecuta SIEMPRE que el mouse se mueve, y solo chequea `dragStateRef.current.active`. Si por alguna razón ese ref quedó en `true`...

---

## Soluciones Propuestas

### Solución A: Pointer Capture (Crítico)

Agregar `setPointerCapture` cuando inicia el drag para que TODOS los eventos de movimiento lleguen al elemento, incluso si el cursor está en gaps o sobre otros elementos:

```typescript
// En handleDragStart:
const handleDragStart = useCallback((userId: string, date: string, e: React.PointerEvent) => {
  if (!enabled) return;
  if (e.shiftKey || e.ctrlKey || e.metaKey) return;
  if (e.button !== 0) return;
  
  // ✅ Capturar el pointer para que todos los eventos lleguen
  (e.target as HTMLElement).setPointerCapture(e.pointerId);
  
  // ... resto de la lógica
}, [enabled]);
```

Y en `endDrag` / `cancelDrag`:
```typescript
// Liberar pointer capture si existe
if (dragStateRef.current.pointerId !== null) {
  try {
    document.releasePointerCapture(dragStateRef.current.pointerId);
  } catch {}
}
```

### Solución B: Mover tracking del pointer al elemento que tiene capture

Con pointer capture, el tracking debería hacerse en handlers específicos en vez del contenedor:

```typescript
// En cada celda, agregar:
onPointerMove={(e) => {
  if (canManageSchedules && e.pointerId === dragStateRef.current.pointerId) {
    // Actualizar selección directamente con la celda conocida
    selection.updateDragCell(member.id, dateStr);
  }
}}
```

Alternativamente, usar un listener global:
```typescript
useEffect(() => {
  const handleGlobalMove = (e: PointerEvent) => {
    if (!dragStateRef.current.active) return;
    // El resto de la lógica de elementFromPoint...
  };
  
  window.addEventListener('pointermove', handleGlobalMove);
  return () => window.removeEventListener('pointermove', handleGlobalMove);
}, []);
```

### Solución C: Prevenir conflicto onClick/onPointerDown

**Opción C1**: Usar un timeout para marcar si hubo drag:

```typescript
const handleDragStart = useCallback((...) => {
  // ... inicio del drag
  
  // Prevenir click inmediato
  setTimeout(() => {
    dragStateRef.current.dragStarted = true;
  }, 50);
}, []);

const handleCellClick = useCallback((...) => {
  // Si el drag comenzó, ignorar el click
  if (dragStateRef.current.active || dragStateRef.current.dragStarted) {
    dragStateRef.current.dragStarted = false;
    return;
  }
  // ... lógica de click
}, []);
```

**Opción C2** (Mejor): Separar completamente click y drag:

```typescript
// En el JSX, en vez de tener ambos handlers:
onClick={(e) => {
  if (e.detail > 0 && !dragStateRef.current.justDragged) {
    selection.handleCellClick(member.id, dateStr, e);
  }
}}
onPointerDown={(e) => {
  selection.handleDragStart(member.id, dateStr, e);
}}
onPointerUp={(e) => {
  if (!dragStateRef.current.didMove) {
    // Si no se movió, procesar como click
    selection.handleCellClick(member.id, dateStr, e as any);
  }
  dragStateRef.current.justDragged = dragStateRef.current.didMove;
  selection.endDrag();
}}
```

### Solución D: Reseteo más agresivo del estado de drag

```typescript
// En cancelDrag, además de limpiar refs:
const cancelDrag = useCallback(() => {
  dragStateRef.current = {
    active: false,
    startCell: null,
    currentCell: null,
    didMove: false,
    pointerId: null,
    justDragged: false, // ← nuevo
  };
  lastDetectedCellRef.current = null;
  setIsDragging(false);
  
  // ✅ También limpiar cualquier pointer capture pendiente
  document.querySelectorAll('[data-cell]').forEach(el => {
    try {
      (el as HTMLElement).releasePointerCapture?.(dragStateRef.current.pointerId!);
    } catch {}
  });
}, []);
```

### Solución E: Prevenir propagación de eventos que interfieren

```typescript
// En el contenedor del grid, prevenir que ciertos eventos suban:
onPointerDown={(e) => {
  // No hacer nada aquí, solo en las celdas
  e.stopPropagation();
}}
```

---

## Plan de Implementación

### Fase 1: Refactorizar `useScheduleSelection.ts`

1. **Agregar Pointer Capture** en `handleDragStart`
2. **Crear `updateDragCell`** como método dedicado (no depende de elementFromPoint)
3. **Refactorizar `endDrag`** para liberar pointer capture y manejar el flag `justDragged`
4. **Agregar listener global `pointermove`** como backup durante drag activo
5. **Mejorar `cancelDrag`** con limpieza más exhaustiva

### Fase 2: Actualizar `InlineScheduleEditor.tsx`

1. **Modificar los handlers de celdas**:
   - `onPointerDown` → inicia drag con capture
   - `onPointerMove` → actualiza drag directamente (si esta celda tiene capture)
   - `onPointerUp` → termina drag, procesa click si no hubo movimiento
   - Eliminar `onClick` separado (manejar en pointerUp)

2. **Agregar `onLostPointerCapture`** para detectar si perdimos el capture inesperadamente

3. **Remover el fallback `onMouseMove`/`onMouseDown`** (Pointer Events tienen soporte universal en browsers modernos)

### Fase 3: Testing

Casos a verificar:
1. ✓ Click simple → selecciona 1 celda
2. ✓ Drag horizontal Dom1→Mar3 → selecciona 3 celdas en fila
3. ✓ Drag vertical 1 celda hacia abajo → selecciona 2 celdas (columna)
4. ✓ Drag diagonal → rectángulo completo
5. ✓ Salir de ventana y volver → no hay ghost dragging
6. ✓ Drag sobre feriados → funciona igual
7. ✓ Ctrl+Click → agrega/quita de selección

---

## Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `src/components/hr/schedule-selection/useScheduleSelection.ts` | Refactor completo del sistema de drag con Pointer Capture |
| `src/components/hr/InlineScheduleEditor.tsx` | Actualizar handlers de celda, eliminar fallbacks legacy |
| `src/components/hr/schedule-selection/types.ts` | Agregar nuevos campos al tipo de drag state |

---

## Resultado Esperado

Después de implementar:
- El drag se sentirá **fluido y preciso** como en Excel/Google Sheets
- No habrá más "celdas que no alcanzan" porque Pointer Capture garantiza que todos los movimientos se registren
- No habrá deselecciones inesperadas porque el conflicto click/drag estará resuelto
- No habrá ghost dragging porque el estado se limpiará correctamente
