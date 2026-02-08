
## Objetivo
Corregir los bugs de interacción “click + drag” del editor de horarios (selección que no se extiende, deselección inesperada, y “selección loca” al volver a la ventana). La prioridad es que el comportamiento sea consistente tipo Excel: mantener click y arrastrar siempre extiende selección; si se pierde el mouseup (cambio de pestaña/ventana) el drag se cancela automáticamente; y mover el mouse sin click nunca debe seleccionar nada.

---

## Qué está pasando (diagnóstico con base en el código actual)
### 1) “Selección loca” al salir y volver a la ventana
En `useScheduleSelection.ts` el drag termina con un listener global `window.addEventListener('mouseup', ...)`.
Si el usuario:
- mantiene el click,
- sale de la ventana (o cambia de pestaña),
- y suelta el mouse afuera,
es muy común que **no llegue** el evento `mouseup` a la app.  
Resultado: `isDragging` queda `true`. Luego, al volver, cualquier `onMouseMove` en la grilla ejecuta `handleDragMove()` y parece que “selecciona sin click”.

Esto coincide perfecto con lo que describiste.

### 2) “Arrastré de Vac a Cumple y no extendió hasta que llegué a Miércoles”
Hoy el tracking del drag depende de:
- `onMouseMove={handleGridMouseMove}` colocado en **cada fila** (row) en `InlineScheduleEditor.tsx`
- `elementFromPoint()` + `closest('[data-cell]')`

Problemas típicos de este enfoque:
- si el cursor se mueve entre filas/zonas donde no hay evento en ese row específico, se pierde el tracking momentáneamente
- si el elemento bajo el cursor no termina resolviendo correctamente `closest('[data-cell]')` (por overlays/tooltip/elementos “encima”), la celda no se detecta y el drag “no avanza”
- al no usar Pointer Capture, el drag es más frágil cuando el cursor sale del área o el navegador decide cambiar el target

### 3) “Hice click en Cumple, arrastré 1 celda hacia abajo y se deseleccionó todo”
Esto suele ocurrir cuando el navegador/React termina disparando una secuencia rara de eventos (mouseup/click) con estado de drag inconsistente, o cuando el drag se cancela a mitad de camino y luego se procesa un click normal que pisa la selección. El código intenta evitar eso con `didDragMoveRef`, pero al no tener un “drag lifecycle” robusto (cancel por blur/pointercancel), pueden aparecer estados intermedios.

---

## Estrategia de solución (robusta, estilo “Excel real”)
### A) Migrar el drag a Pointer Events + Pointer Capture
En vez de confiar en `mouse*`, usar:
- `onPointerDown` en la celda (inicio drag)
- `pointer capture` (`e.currentTarget.setPointerCapture(e.pointerId)`) para que el componente siga recibiendo movimiento aunque el puntero salga del elemento
- `onPointerMove` en un contenedor estable (o listeners globales durante drag)
- `onPointerUp` y `onPointerCancel` para terminar/cancelar drag de forma confiable

Esto reduce muchísimo los casos “no me extendió selección” y evita perder el “mouseup”.

### B) Cancelar drag ante pérdida de foco / cambio de pestaña
Agregar en el hook `useScheduleSelection.ts` listeners mientras `isDragging` está activo para:
- `window.blur`
- `document.visibilitychange` (si `document.hidden`)
- opcional: `window.pointerup` / `window.pointercancel` como backup

Cuando ocurra cualquiera de estos, se ejecuta `cancelDrag()`:
- `setIsDragging(false)`
- limpiar refs (`dragStartCellRef`, `dragCurrentCellRef`)
- resetear flags (`didDragMoveRef`)

Con esto, al volver a la ventana, **no queda** `isDragging=true`, por lo tanto mover el mouse no selecciona nada.

### C) Mover `onMouseMove` (o `onPointerMove`) del row a un contenedor único de la grilla
Ahora está en cada fila (`team.map` row). Eso hace que el tracking dependa de dónde esté el cursor.  
Lo vamos a mover a un contenedor único que cubra TODA la grilla (la parte de “Days Grid”), de modo que:
- horizontal y vertical funcionen igual de bien
- no se “corta” al cruzar de una fila a otra rápido

### D) Throttle / “solo cuando cambia la celda”
Durante drag, `elementFromPoint()` puede disparar muchísimas veces.
Vamos a:
- ignorar updates si la celda detectada es la misma que la anterior
- (opcional) hacer throttle con `requestAnimationFrame` para suavizar y evitar renders excesivos

### E) Blindaje extra: nunca modificar selección si `isDragging` no está activo
Esto ya está, pero lo reforzamos para que cualquier path de `handleGridMouseMove/PointerMove` sea un no-op si no hay drag real.

---

## Cambios concretos por archivo

### 1) `src/hooks/useScheduleSelection.ts`
**Agregar:**
- `startDrag(cell, pointerId?)`
- `updateDrag(cell)` (solo si cambió)
- `endDrag()` (commit final)
- `cancelDrag(reason)` (blur/hidden/pointercancel)

**Reemplazar/Mejorar:**
- el listener `mouseup` por `pointerup` y `pointercancel` (y mantener mouseup como fallback si hace falta)
- agregar listeners de `blur` y `visibilitychange` que llamen `cancelDrag()`

**Resultado esperado:**
- si soltás el mouse fuera de la ventana: el drag se cancela (no queda pegado)
- no hay selección sin click

### 2) `src/components/hr/InlineScheduleEditor.tsx`
**Cambiar:**
- mover el handler de movimiento desde cada row a un contenedor principal de grilla (la zona que contiene todas las celdas)
- cambiar `onMouseDown` por `onPointerDown` en cada celda (inicio drag)
- (si corresponde) cambiar el handler de movimiento a `onPointerMove` (o mantener `onMouseMove` pero con drag lifecycle basado en pointer)

**Mantener:**
- `data-cell="${member.id}:${dateStr}"` como fuente de verdad para identificar la celda bajo cursor

**Extra UX (opcional pero recomendable):**
- añadir `touch-action: none` en el contenedor de grilla para que en trackpads/touch no se mezcle con scroll/gestos durante drag (lo evaluamos según cómo se usa la app).

---

## Validación (casos de prueba que vamos a ejecutar)
1) Click en una celda → queda seleccionada 1 celda, sin lag.
2) Click sostenido y drag horizontal (Vac → Cumple → Mié) → la selección se extiende inmediatamente, sin “saltos”.
3) Click sostenido y drag vertical 1 celda hacia abajo → quedan 2 celdas seleccionadas (misma columna, 2 filas).
4) Iniciar drag, salir de la ventana sin soltar, volver → no debe quedar “drag pegado”; mover mouse sin click no selecciona nada.
5) Iniciar drag, soltar fuera del grid → termina bien (no queda pegado).
6) Shift+click y Ctrl/Cmd+click siguen funcionando igual.

---

## Alcance / No cambios
- No toca lógica de guardado.
- No toca feriados, cobertura, ni estilos (solo interacción de selección).
- La toolbar (Vac/Cumple/Franco/etc.) queda igual; solo estabilizamos la selección.

---

## Entregable
Una corrección enfocada en robustez de interacción que elimina los “saltos” de selección y el estado “pegado” al volver a la ventana, usando Pointer Events + cancelación por blur/visibilitychange + un único punto de tracking en la grilla.
