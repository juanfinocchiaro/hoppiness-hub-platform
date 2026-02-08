
## Objetivo (lo que vamos a arreglar)
1) El “lag de 1 celda” (A1→B1 no actualiza, recién A1→C1 muestra A1+B1) en la selección por arrastre.  
2) Los bordes de fila/columna en feriados (que hoy se ven “cortados” o inconsistentes).  
3) Quitar la “notificación/barra” de selección arriba (no mostrar nada si no hay selección; y opcionalmente no reservar altura).

---

## Hallazgos en el codebase (estado actual)
### Archivos involucrados
- **Hook de selección**: `src/components/hr/schedule-selection/useScheduleSelection.ts`
- **Tipos**: `src/components/hr/schedule-selection/types.ts`
- **Toolbar/Hints**: `src/components/hr/schedule-selection/SelectionToolbar.tsx`
- **Grid**: `src/components/hr/InlineScheduleEditor.tsx` (ruta actual `/milocal/:branchId/equipo/horarios` usa este componente)

### 1) Confirmación: el bug NO parece ser “stale ref/state” dentro de `handleCellEnter`
En `useScheduleSelection.ts`, `handleCellEnter` hoy hace esto (resumen):
- compara `currentKey` vs `newKey`
- actualiza `dragStateRef.current.currentCell = { userId, date }`
- calcula la selección usando **el endCell por parámetro**:  
  `calculateRectSelection(startCell, { userId, date })`

Eso ya evita el patrón “Entré a B1 pero calculé con A1” por orden de refs/state.
Conclusión: el síntoma A1→B1→(nada)→C1 sí encaja perfecto con otra causa:
- **el evento (o la detección) de “entré a B1” NO está ocurriendo**, entonces `currentCell` queda en A1 hasta que se detecta C1, y el rectángulo A1→C1 incluye B1 “de rebote”.

### 2) Por qué se pierde B1 (muy probable)
Hoy el sistema depende de **`onPointerEnter` en cada celda** (ver `InlineScheduleEditor.tsx`, celdas tienen `onPointerEnter={() => selection.handleCellEnter(...)}`).

En grillas con `border-r/border-b`, es típico que exista un “micro-gap” (1px de borde, subpixel, repaint) donde:
- el puntero puede pasar por un borde/gap y **no disparar enter del siguiente elemento** en un frame,
- o el target real del evento es un hijo/overlay, no el contenedor con `data-cell`,
- o el movimiento rápido con botón presionado haga que se “salte” el enter de la celda intermedia.

Resultado: “me paro sobre B1 visualmente pero el sistema no registró enter en B1”.

---

## Plan de corrección (sin re-arquitectura, pero robusto)
### Fase A — Instrumentación mínima para confirmar (rápido, 1 commit)
1) Agregar logs temporales (controlados por un flag) dentro de:
   - `handleDragStart`
   - `handleCellEnter`
   - un nuevo detector de celda “under pointer” (ver Fase B)
2) Qué buscamos ver:
   - si al pasar por B1 **no hay log de `handleCellEnter(B1)`**, entonces confirmado: el evento se pierde.
   - si sí hay log, pero la selección no cambia, recién ahí revisamos cálculo (pero hoy el código se ve correcto).

> Nota: estos logs se dejan con un `const DEBUG = false` para poder activarlos rápido si vuelve a pasar.

---

### Fase B — Fallback sólido durante drag: `pointermove` global + `elementFromPoint` (2–3 commits)
Objetivo: aunque `onPointerEnter` se pierda, durante drag se detecta la celda actual con la posición del puntero y se llama a `handleCellEnter` manualmente.

1) En `useScheduleSelection.ts`:
   - agregar `useEffect` que **solo mientras `dragStateRef.current.active === true`** escuche `window.addEventListener('pointermove', ...)`.
   - en cada `pointermove`:
     - usar `document.elementFromPoint(e.clientX, e.clientY)`
     - subir con `closest('[data-cell]')`
     - parsear `data-cell="userId:yyyy-MM-dd"` y llamar a `handleCellEnter(userId, date)`.

2) Robustez extra para el caso “gap de 1px”:
   - implementar muestreo multi-punto:
     - probar `(x,y)`, `(x+1,y)`, `(x-1,y)`, `(x,y+1)`, `(x,y-1)`
   - tomar el primer `data-cell` encontrado.
   - esto elimina el “A1→B1 no detectado” incluso si el puntero cae justo en el borde.

3) Evitar jitter / re-renders innecesarios:
   - mantener un `lastDetectedKeyRef` y si no cambia, no llamar a `handleCellEnter`.
   - `handleCellEnter` ya ignora si `currentKey === newKey`, pero igual conviene para performance.

4) Mantener `onPointerEnter`:
   - se deja como vía primaria (barata y limpia),
   - el `pointermove global` actúa como “airbag” cuando se pierde el enter.

---

### Fase C — Overlays y “pointer-events: none” (1 commit)
Si existe cualquier overlay sobre la grilla (highlight layers, wrappers, etc.), puede interceptar el puntero y hacer errático `closest('[data-cell]')`.

Acción:
- revisar componentes que renderizan encima de la grilla (especialmente si hay contenedores `absolute` o `sticky` superpuestos).
- asegurar `pointer-events: none` en capas visuales que no deban capturar eventos.

En este editor, la selección actualmente se pinta con clases (`ring`, `bg-primary/20`), no con overlays, pero igual lo verificamos en el DOM (y si hay overlays de popovers/tooltips dentro de la celda, confirmamos que no tapen el wrapper).

---

## Plan UI: bordes en feriados + eliminar barra superior
### D1) Bordes de fila/columna en feriados (1 commit)
Hoy la celda feriado usa:
- `border-r border-b border-border/40` (bien)
- pero además agrega `border-orange-200` que cambia el color de TODOS los bordes; puede quedar tan tenue que “parece que no hay fila”.

Cambio propuesto:
- NO cambiar el color de borde para feriados; solo cambiar el fondo.
- Mantener un borde consistente (`border-border/40`) para que siempre se vean filas/columnas iguales.
- Si querés un acento sutil, aplicarlo en el header del día (ya está en naranja) y no en todas las celdas.

Concretamente:
- en `InlineScheduleEditor.tsx`:
  - reemplazar `isHoliday && '... border-orange-200 ...'` por solo `isHoliday && 'bg-orange-50 ...'`
  - conservar `border-r border-b border-border/40` siempre.

### D2) Quitar la “notificación/barra” de selección arriba (1 commit)
Hoy se renderiza siempre (cuando `canManageSchedules && activeView === 'personas'`) y reserva altura (`min-h-[40px]`), incluso sin selección.

Cambio propuesto:
- renderizar el contenedor de `SelectionToolbar` **solo si `selection.selectedCells.size > 0`**.
- si querés conservar el hint “Click para seleccionar…”, moverlo a otro lugar (o directamente no mostrarlo).
- Resultado: desaparece el bloque superior cuando no hay selección (sin ruido visual).

---

## Validación (checklist exacta en tu pantalla)
En `/milocal/.../equipo/horarios`:

1) Drag corto A1→B1: debe seleccionar A1 y B1 inmediatamente (sin necesitar C1).
2) Drag A1→C1: debe seleccionar A1,B1,C1.
3) Drag rápido (moviendo el mouse rápido sobre bordes): no debe “saltearse” celdas.
4) Drag vertical (A1→A2): debe seleccionar ambas (y no deseleccionar).
5) Bordes: en columnas feriado, se deben ver los bordes de fila (líneas horizontales) igual que los días normales.
6) Barra superior: no debe aparecer nada arriba si no hay selección.

---

## Entregables (qué cambios de código voy a hacer)
- `useScheduleSelection.ts`
  - agregar fallback `pointermove global` durante drag + muestreo multi-punto
  - agregar logs opcionales de debug (apagados por defecto)
- `InlineScheduleEditor.tsx`
  - ajustar clases de feriados para no romper bordes
  - ocultar `SelectionToolbar` cuando no hay selección (y quitar el “placeholder” si no lo querés)
- (opcional) revisar si hay capas que requieran `pointer-events: none`

---

## Riesgos / Tradeoffs
- `pointermove global` durante drag aumenta un poco el trabajo por movimiento, pero solo ocurre mientras arrastrás. Con el “lastDetectedKeyRef” queda muy liviano.
- Si hay popovers abiertos durante drag, la detección con `elementFromPoint` puede apuntar a otra cosa. Por eso el `closest('[data-cell]')` y el muestreo multi-punto son clave.

---

## Pregunta mínima (solo para cerrar el alcance visual)
- ¿Querés eliminar completamente cualquier ayuda textual (“Click para seleccionar · …”) o querés que quede en algún lugar más discreto (por ejemplo, abajo del grid o dentro de un tooltip)?
