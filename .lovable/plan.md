# Plan de Refactor: Sistema de Selección Excel-Like (COMPLETADO)

## Estado: ✅ IMPLEMENTADO

## Cambios Realizados

### 1. Modelo Basado en Índices (useScheduleSelection.ts)
- **Eliminado**: Uso de `new Date("YYYY-MM-DD")` que causaba bugs de zona horaria en Argentina (UTC-3)
- **Implementado**: Maps precomputados para lookups O(1):
  - `dayIndexByDateStr`: Map<string, number>
  - `dateStrByDayIndex`: string[]
  - `userIndexById`: Map<string, number>
- **Resultado**: Selección y copy/paste determinísticos sin dependencia de timezone

### 2. Pointer Capture + Validación de Botón
- **Agregado**: `setPointerCapture()` en `handleDragStart` para tracking confiable
- **Agregado**: Validación `(e.buttons & 1) === 0` en `pointermove` para detectar botón liberado
- **Agregado**: Handler `onLostPointerCapture` en las celdas
- **Resultado**: El drag no se "pierde" si el mouse sale de la ventana o hay interrupciones

### 3. Mejora de `findCellAtPoint`
- **Agregado**: Line scanning con más offsets (±4px, ±8px) en horizontal, vertical y diagonal
- **Resultado**: Mejor detección cuando el puntero está sobre bordes o gaps

### 4. Copy/Paste con Anchor Correcto
- **Corregido**: El anchor ahora es siempre top-left real (min dayIdx, min userIdx)
- **Antes**: Ordenaba por userIdx primero, lo que daba anchors incorrectos
- **Ahora**: Ordena por dayIdx primero, luego userIdx
- **Resultado**: Pegar nunca va "hacia atrás"

## Archivos Modificados
1. `src/components/hr/schedule-selection/useScheduleSelection.ts` - Reescrito completamente (V9)
2. `src/components/hr/InlineScheduleEditor.tsx` - Agregado handler `onLostPointerCapture`

## Criterios de Aceptación
- [x] Drag A1→B1 selecciona B1 siempre, incluso pasando por bordes
- [x] Drag rápido no pierde celdas intermedias
- [x] Sin "un día corrido" en Argentina (UTC-3)
- [x] Pegar nunca va hacia atrás con offsets positivos
- [x] El código de selección ya no usa `new Date()` para comparaciones
