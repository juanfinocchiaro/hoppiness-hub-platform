
Contexto (lo que entendí)
- El problema que estás describiendo ahora no es “Ctrl+C no copia”, sino el núcleo: “hago click en una celda, mantengo apretado y me muevo por la grilla para seleccionar más celdas” y sigue fallando (se saltea celdas / va atrasado / no es confiable).
- Ya existe un fallback con pointermove + elementFromPoint, pero en tu caso no alcanza: la selección múltiple por arrastre sigue “exactamente igual”.
- Tu zona horaria es Argentina (UTC‑3). Esto es importante porque en JS `new Date("YYYY-MM-DD")` se interpreta como UTC y puede correrse al día anterior local, rompiendo comparaciones y offsets. En tu repo ya existe un estándar para evitar esto (usar parseISO / fecha local), pero el sistema de selección no lo respeta todavía.

Auditoría a fondo (estado real del sistema hoy)
Archivos clave:
- src/components/hr/schedule-selection/useScheduleSelection.ts
  - Drag state en ref (dragStateRef)
  - updateDragSelection() calcula rectángulo usando calculateRectSelection(start,end)
  - Fallback global: window.pointermove + findCellAtPoint() + elementFromPoint() + closest([data-cell])
  - Copy/Paste: offsets con differenceInDays(new Date(dateStr), anchorDate), addDays(anchorTargetDate, dayOffset)
- src/components/hr/InlineScheduleEditor.tsx
  - Cada celda: data-cell="userId:yyyy-MM-dd"
  - Eventos: onPointerDown / onPointerEnter / onPointerUp
  - Celdas usan bordes y fondos (feriados ya corregido)
- Tipos: src/components/hr/schedule-selection/types.ts

10+ causas posibles (con probabilidad y cómo se verifica)
Nota: varias pueden coexistir; por eso la solución tiene que ser “integral”, no un parche aislado.

Causa 1 (muy probable): bug de zona horaria por new Date("YYYY-MM-DD") en selección
Dónde:
- calculateRectSelection(): startDate = new Date(start.date), endDate = new Date(end.date)
- handleCopy(): anchorDate = new Date(anchorCell.date), differenceInDays(new Date(cell.date), anchorDate)
- handlePaste(): anchorTargetDate = new Date(anchorTarget.date), addDays(anchorTargetDate, dayOffset)

Por qué rompe:
- En UTC‑3, new Date("2026-02-10") = 2026-02-10T00:00Z = 2026-02-09 21:00 local.
- Eso puede provocar:
  - rectángulos que incluyen/excluyen un día mal,
  - offsets dayOffset incorrectos (negativos o corridos),
  - “pega hacia atrás” aunque el usuario haya elegido jueves como destino.

Cómo confirmarlo rápido:
- Loguear start.date/end.date y también startDate.toString() / endDate.toString().
- Si ves que la fecha local cae “el día anterior”, está confirmado.

Causa 2 (muy probable): calculateRectSelection itera monthDays con Date local, pero compara contra minDate/maxDate calculados desde Date UTC
monthDays viene de eachDayOfInterval() (fechas locales), mientras minDate/maxDate pueden estar corridos a 21:00 del día anterior (UTC parse). Comparar day >= minDate puede incluir un día extra o excluir el primero.

Causa 3 (muy probable): el fallback pointermove detecta “otra cosa” (sticky header/columna fija) y no encuentra data-cell
elementFromPoint puede devolver:
- header sticky,
- columna fija de empleados,
- contenedor con border,
y closest('[data-cell]') devuelve null. Si en un “frame” justo estás sobre un borde/intersección, no actualiza y se saltea.

Cómo confirmarlo:
- En DEBUG, loguear cuando findCellAtPoint retorna null durante drag y loguear el tagName/class del elementFromPoint.

Causa 4 (probable): no hay pointer capture; el drag depende de eventos del browser que pueden “desengancharse”
Aunque haya window.pointermove, el “inicio” y “fin” del drag (pointerup) puede perderse o llegar tarde, y el estado active puede quedar inconsistente en casos de:
- click + scroll accidental,
- mouseup fuera de ventana,
- trackpad con gestures.

Causa 5 (probable): falta de gate por e.buttons en pointermove
El pointermove global se ejecuta solo si dragStateRef.active es true, pero no valida que el botón siga presionado (e.buttons & 1). En ciertos navegadores, si el drag se corta raro, active puede quedar true un rato y generar selecciones inesperadas (o al revés: active false temprano).

Causa 6 (probable): lastDetectedKeyRef impide “recuperar” cuando la detección alterna (celda/null/celda)
Si el puntero pasa por un gap y findCellAtPoint alterna entre A1 y null, el sistema puede quedarse con lastDetectedKeyRef en A1 y no actualizar cuando vuelve a detectar A1, y recién actualizar en C1, dando sensación de lag/saltos.

Causa 7 (probable): renderCellContent puede contener elementos que capturan eventos o cambian el target real
Aunque closest() suele salvarlo, si hay elementos con pointer-events o portales/poppers, elementFromPoint puede caer en una capa que NO está dentro del DOM de la celda (portal) y entonces closest([data-cell]) nunca aparece.

Causa 8 (probable): comparación de fechas por objetos Date en vez de índices (díaIndex)
Comparar Date con horas distintas es frágil. Lo correcto para una grilla “Excel-like” es trabajar con:
- dayIndex (0..N-1) y userIndex (0..M-1)
y derivar dateStr desde monthDays[dayIndex].

Causa 9 (confirmada como bug de lógica): el “anchor” de copy no está definido como top-left de forma consistente
En handleCopy hoy se ordena por userIdx y luego por date. El anchor termina siendo “primer usuario” aunque la fecha no sea la más temprana; eso genera dayOffset negativos y luego al pegar “hacia atrás”.
Aunque esto es copy/paste, también es parte del mismo “sistema Excel” y hay que arreglarlo en la auditoría integral.

Causa 10 (probable): el sistema de selección está recreando Sets grandes en cada pointermove sin throttle
En grillas grandes, setSelectedCells(selection) en cada movimiento puede generar:
- frames perdidos,
- render retrasado,
- sensación de “me toma una celda tarde”.
Solución típica: throttle con requestAnimationFrame o solo recalcular si cambió endCell (y no por ruido de puntero). Hoy se recalcula si cambia key, pero no si la detección es ruidosa o el cálculo es pesado.

Causa 11 (posible): onPointerEnter sigue existiendo y puede interferir con el fallback (doble fuente de verdad)
Si onPointerEnter dispara en un orden distinto al pointermove (por ejemplo, enter llega tarde y “pisotea” currentCell), podrías ver comportamientos erráticos. Ideal: durante drag, elegir una sola fuente (pointermove + elementFromPoint) como “authoritative”.

Causa 12 (posible): parsing de data-cell por split(':') es frágil si cambia el formato
Hoy userId es UUID (no contiene ‘:’), así que no es el problema actual, pero para robustez la auditoría lo contempla (por ejemplo, si se agrega otro encoding).

Solución integral y optimizada (lo que voy a implementar)
Objetivo: que la grilla sea determinista y “Excel-like” de verdad, eliminando clases de bugs (zona horaria, gaps, orden de eventos) en lugar de seguir parchando síntomas.

A) Unificar el modelo interno a índices (no Date objects)
- Precomputar:
  - dayIndexByDateStr: Map<string, number> (dateStr -> index en monthDays)
  - dateStrByDayIndex: string[] (index -> dateStr)
  - userIndexById: Map<string, number>
- Representar una celda como { userIdx, dayIdx } internamente.
- calculateRectSelection() pasa a usar min/max de índices, y arma el Set con loops de índices:
  for u=minU..maxU
    for d=minD..maxD
      add(cellKeyString(userId[u], dateStr[d]))

Beneficios:
- Se elimina por completo la dependencia de new Date("YYYY-MM-DD") y los offsets por UTC‑3.
- Performance mejor (comparación de ints).
- Copy/Paste y selección usan el mismo sistema.

B) Drag selection “single source of truth” con pointer capture + pointermove global
- En pointerDown:
  - setPointerCapture(e.pointerId) en el elemento de la celda (o en el contenedor del grid) para garantizar continuidad.
  - guardar dragStart (indices) y active true.
- Durante drag:
  - solo usar el pointermove global + elementFromPoint para detectar endCell (ignorar onPointerEnter mientras active).
  - agregar validación e.buttons & 1 (si ya no está presionado, terminar drag inmediatamente).
  - mejorar findCellAtPoint:
    - aumentar offsets y considerar también un “line scan” pequeño (x±4,y) para atravesar bordes.
- En pointerUp / lostpointercapture:
  - endDrag consistente, sin duplicar caminos.

C) Robustez contra sticky headers/columna izquierda
- En findCellAtPoint:
  - si elementFromPoint cae en header/left, intentar:
    - usar offsets que empujen hacia “adentro” de la celda (x+4,y+4),
    - repetir búsqueda.
  - (Opcional) como fallback final: si no hay cell, mantener última cell válida, no “congelar” selection.

D) Rehacer Copy/Paste sobre índices (y corregir anchor)
- Copy:
  - anchor = top-left real: minDayIdx y minUserIdx dentro del conjunto.
  - Para cada celda seleccionada:
    - dayOffset = cell.dayIdx - anchor.dayIdx
    - userOffset = cell.userIdx - anchor.userIdx
- Paste:
  - Si el usuario tiene 1 celda seleccionada: paste anchor = esa celda.
  - Si tiene un bloque seleccionado: paste anchor = top-left del bloque destino (pero con índices, determinista).
  - target = anchor + offsets (sumas de ints), validar rango.
- Con esto desaparece “pega hacia atrás” por definición (no hay fechas UTC ni anchor mal elegido).

E) Instrumentación de auditoría (para demostrar causas y no “adivinar”)
- Agregar un DEBUG interno que, cuando está activo:
  - loguea: startIdx, endIdx, elementFromPoint target, cell encontrada, y tamaño del set.
  - loguea: veces que findCellAtPoint devuelve null durante drag.
- Dejarlo apagado por defecto.

F) Optimización: throttle con requestAnimationFrame (si hace falta)
- Si el cálculo del set es pesado, actualizar selección a lo sumo 1 vez por frame:
  - guardar “pendingEndCell” en ref
  - rAF que aplica el cálculo con la última celda detectada
Esto evita “lag visual” por exceso de renders.

Secuencia de implementación (paso a paso)
1) Refactor controlado en useScheduleSelection.ts:
   - introducir maps dayIndexByDateStr/userIndexById
   - reemplazar toda lógica basada en Date por índices
   - ajustar copy/paste a offsets por índices
2) Ajustar InlineScheduleEditor.tsx:
   - pasar el evento completo a handleDragStart para poder hacer pointer capture (necesita el elemento actualTarget)
   - opcional: durante drag, deshabilitar onPointerEnter para evitar doble fuente (o dejarlo pero que handleCellEnter ignore si “drag source = pointermove”).
3) Activar DEBUG localmente y validar con tu escenario real:
   - arrastre lento y rápido, horizontal y vertical
   - verificación de que no saltea celdas
4) Confirmar que copy/paste ya no retrocede (por índices + anchor correcto).

Criterios de aceptación (lo que tiene que quedar perfecto)
- Drag A1→B1 selecciona B1 siempre, incluso pasando por bordes.
- Drag rápido no “pierde” celdas intermedias.
- No hay “un día corrido” en Argentina (UTC‑3) ni en selección ni en copy/paste.
- Pegar nunca va “hacia atrás” si los offsets son positivos (y si copiaste un bloque, el bloque se preserva).
- Performance: no se nota pesado al arrastrar.

Riesgos / tradeoffs
- Es un refactor real (no un parche): toca lógica central, pero reduce muchísimo la probabilidad de futuros bugs.
- El throttle con rAF solo lo agrego si en tu máquina sigue habiendo “lag” por performance; primero medimos con índices porque eso ya suele mejorar mucho.

Qué me falta de vos (solo si querés maximizar precisión)
- Confirmar si el fallo de drag selection es:
  a) “se saltea una celda intermedia”,
  b) “selecciona pero visualmente tarda un frame”,
  c) “se corta el drag y deja de seleccionar”,
  d) “selecciona pero el rectángulo queda mal (fechas corridas)”.
Con el refactor por índices, a+b+c+d deberían quedar cubiertas, pero esto ayuda a elegir si agrego rAF throttle y/o ajustes extra en findCellAtPoint.

