
# Plan: Editor de Horarios Excel-Style - Simplificación Total

## Resumen
Simplificar el editor eliminando el popover y moviendo TODAS las opciones a la toolbar inline. Corregir los bugs de selección/drag.

---

## Problema 1: Drag Selection No Funciona Correctamente

### Causa raíz
El evento `onMouseEnter` solo se dispara cuando el mouse **entra** a una celda nueva, no cuando se mueve **dentro** de ella. Si movés el mouse muy rápido, podés "saltar" celdas sin que se registre el enter.

### Solución
Cambiar de `onMouseEnter` a un sistema basado en coordenadas del mouse:
1. En `onMouseDown`: guardar que estamos arrastrando
2. En `onMouseMove` del **contenedor padre** (no de cada celda): calcular qué celda está bajo el cursor usando `elementFromPoint()` o datos de posición
3. Esto garantiza que cada movimiento del mouse actualice la selección

### Cambios en `InlineScheduleEditor.tsx`:
```tsx
// Agregar ref al contenedor de la grilla
const gridRef = useRef<HTMLDivElement>(null);

// Handler en el contenedor, no en cada celda
<div 
  ref={gridRef}
  onMouseMove={(e) => {
    if (!selection.isDragging) return;
    // Calcular celda bajo cursor
    const element = document.elementFromPoint(e.clientX, e.clientY);
    const cellData = element?.closest('[data-cell]')?.getAttribute('data-cell');
    if (cellData) {
      const [userId, date] = cellData.split(':');
      selection.handleDragMove(userId, date);
    }
  }}
>
```

### Cambios en `useScheduleSelection.ts`:
- Exponer `isDragging` correctamente (usar state en vez de ref para reactivity)
- Simplificar `handleDragMove` para que funcione con cualquier celda

---

## Problema 2: Auto-focus Invasivo del Input

### Causa raíz
En `SelectionToolbar.tsx`, el `useEffect` hace `focus()` y `select()` en el input de hora cuando hay selección:
```tsx
useEffect(() => {
  if (selectionCount > 0 && startInputRef.current) {
    startInputRef.current?.focus();
    startInputRef.current?.select(); // <- ESTO causa el "19" seleccionado
  }
}, [selectionCount > 0]);
```

### Solución
Eliminar el `useEffect` de auto-focus completamente (como elegiste "Sin auto-focus").

---

## Problema 3: Eliminar el Popover

### Cambios:
1. Eliminar `ScheduleCellPopover` del render de cada celda
2. Eliminar el estado `editingCell` y funciones `handleCellDoubleClick` / `handleClosePopover`
3. Eliminar `onDoubleClick` de las celdas
4. El archivo `ScheduleCellPopover.tsx` puede quedar (no rompe nada) pero ya no se usa

---

## Problema 4: Toolbar Completa con Todas las Opciones

### Nuevo diseño de `SelectionToolbar`:

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│ [5 celdas]  [Franco ▾] [Vacaciones] [Cumple]  │  [19:00] → [23:00] [Aplicar]   │
│             [Posición ▾]                      │  [Copiar] [Pegar] [Limpiar] [✕] │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Componentes en la toolbar expandida:**
1. **Badge de selección**: "X celda(s)"
2. **Botones de tipo de día**:
   - Franco (día libre normal)
   - Vacaciones 🏖️
   - Cumple 🎂 (solo si aplica)
3. **Selector de posición**: Dropdown con todas las posiciones
4. **Inputs de hora**: Entrada → Salida + Aplicar
5. **Break**: Checkbox o toggle para incluir break (auto-calculado si >6h)
6. **Acciones**: Copiar / Pegar / Limpiar / Deseleccionar

### Props adicionales para toolbar:
- `onApplyVacation: () => void`
- `onApplyBirthday: () => void`
- `onApplyWithPosition: (start, end, position, includeBreak) => void`
- `positions: WorkPosition[]`

---

## Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `useScheduleSelection.ts` | Exponer `isDragging` como estado reactivo; agregar `handleApplyVacation`, `handleApplyBirthday`, `handleApplyWithOptions` |
| `SelectionToolbar.tsx` | Eliminar auto-focus; agregar botones Franco/Vacaciones/Cumple; agregar selector de Posición; agregar toggle de Break |
| `InlineScheduleEditor.tsx` | Eliminar popover y double-click; usar `data-cell` attributes; agregar `onMouseMove` en contenedor; pasar props de posiciones a toolbar |

---

## Implementación Detallada

### 1. `useScheduleSelection.ts` - Cambios:

```typescript
// Nuevo: isDragging como estado (para reactivity en padre)
const [isDragging, setIsDragging] = useState(false);

// handleDragStart: setIsDragging(true)
// useEffect mouseup: setIsDragging(false)

// Nuevas funciones:
const handleApplyVacation = useCallback(() => { ... }, [...]);
const handleApplyBirthday = useCallback(() => { ... }, [...]);

// Modificar handleApplyQuickSchedule para aceptar posición y break:
const handleApplyWithOptions = useCallback((
  startTime: string, 
  endTime: string, 
  position: string | null,
  includeBreak: boolean
) => { ... }, [...]);
```

### 2. `SelectionToolbar.tsx` - Nuevo diseño:

```tsx
export function SelectionToolbar({
  selectionCount,
  clipboard,
  onCopy,
  onPaste,
  onClear,
  onApplyDayOff,
  onApplyVacation,
  onApplyBirthday,
  onApplyWithOptions,
  onDeselect,
  positions,      // WorkPosition[]
  showBirthday,   // boolean - si algún empleado seleccionado tiene cumple este mes
  className,
}: SelectionToolbarProps) {
  const [startTime, setStartTime] = useState('19:00');
  const [endTime, setEndTime] = useState('23:00');
  const [position, setPosition] = useState('');
  const [includeBreak, setIncludeBreak] = useState(true);
  
  // SIN auto-focus useEffect
  
  // Render:
  // - Fila 1: Tipo de día (Franco, Vacaciones, Cumple)
  // - Fila 2: Posición dropdown + Horas + Break toggle + Aplicar
  // - Fila 3: Copiar/Pegar/Limpiar
}
```

### 3. `InlineScheduleEditor.tsx` - Cambios:

```tsx
// ELIMINAR:
const [editingCell, setEditingCell] = useState<...>(null);
const handleCellDoubleClick = ...;
const handleClosePopover = ...;

// AGREGAR data-cell attribute a cada celda:
<div
  data-cell={`${member.id}:${dateStr}`}
  ...
>

// AGREGAR onMouseMove en contenedor:
<div 
  className="flex flex-col"
  onMouseMove={handleGridMouseMove}
>

// ELIMINAR onDoubleClick y ScheduleCellPopover de las celdas

// Pasar nuevas props a SelectionToolbar:
<SelectionToolbar
  ...
  onApplyVacation={selection.handleApplyVacation}
  onApplyBirthday={selection.handleApplyBirthday}
  onApplyWithOptions={selection.handleApplyWithOptions}
  positions={workPositions}
  showBirthday={...}
/>
```

---

## Flujo de Usuario Final

1. **Click** en celda → la selecciona (borde azul)
2. **Arrastrar** → selecciona rectángulo de celdas
3. **Shift+click** → extiende selección
4. **En la toolbar**: elegir qué aplicar
   - Click "Franco" → todas las celdas quedan como día libre
   - Click "Vacaciones" → todas con vacaciones
   - Elegir posición + horas + Aplicar → asigna horario con posición
5. **Enter** en input de hora → aplica
6. **Escape** → deselecciona

---

## Cronograma

| Paso | Descripción |
|------|-------------|
| 1 | Arreglar drag: `data-cell` + `onMouseMove` en contenedor |
| 2 | Eliminar auto-focus del toolbar |
| 3 | Eliminar popover y double-click |
| 4 | Expandir toolbar con todas las opciones |
| 5 | Agregar funciones de aplicación masiva en hook |
