

## Agregar Turno Cortado al Toolbar (sin doble-click)

### Entendimiento del pedido
Querés que la funcionalidad de **turno cortado** (doble jornada: ej. 11:00-14:00 / 20:00-01:00) esté disponible directamente en la **barra de herramientas** que aparece cuando hay celdas seleccionadas, en lugar de tener que hacer doble-click para abrir un modal. Esto mantiene el flujo Excel-style fluido.

---

### Cambios propuestos

#### 1. Agregar toggle y campos de segundo turno al `SelectionToolbar`

**Ubicación**: Entre los inputs de hora existentes y el botón "Aplicar"

**Nuevos elementos UI**:
- **Toggle "Turno cortado"** (switch pequeño con icono de reloj dividido)
- **Inputs de segundo turno** (Entrada 2 / Salida 2) - solo visibles cuando el toggle está activo

**Comportamiento**:
- Cuando el toggle está desactivado: funciona como ahora (un solo turno)
- Cuando el toggle está activo:
  - Aparecen 2 inputs adicionales para el segundo tramo
  - El switch de "Break" se oculta automáticamente (no aplica a turnos cortados)

#### 2. Actualizar la firma de `onApplyWithOptions`

Actualmente recibe:
```typescript
onApplyWithOptions(start, end, position, includeBreak)
```

Se extiende a:
```typescript
onApplyWithOptions(start, end, position, includeBreak, start2?, end2?)
```

Esto permite enviar los datos del segundo turno al sistema de cambios.

#### 3. Actualizar `handleApplyWithOptions` en `useScheduleSelection.ts`

- Recibir los nuevos parámetros `startTime2` y `endTime2`
- Incluirlos en el `ScheduleValue` que se aplica a las celdas
- Cuando hay turno cortado, omitir el cálculo automático de break

#### 4. Eliminar el manejo de doble-click

- Remover el estado `editingCell`
- Remover el componente `ScheduleCellPopover` del render
- Remover el handler `onDoubleClick` de las celdas

---

### Diseño visual del toolbar ampliado

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ [3 celdas] | [Franco] [Vac] [Cumple] | [Posición ▼]                             │
│                                                                                  │
│ Entrada [19:00] Salida [23:00]                                                   │
│                                                                                  │
│ 🔲 Turno cortado    (cuando activo:)  Entrada 2 [--:--] Salida 2 [--:--]        │
│                                                                                  │
│ ☕ Break (oculto si turno cortado)    [✓ Aplicar] | [Copiar] [Pegar] [Limpiar] │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

### Archivos a modificar

1. **`src/components/hr/schedule-selection/SelectionToolbar.tsx`**
   - Agregar estado local: `isSplitShift`, `startTime2`, `endTime2`
   - Agregar toggle de "Turno cortado" 
   - Agregar inputs condicionales para segundo turno
   - Ocultar switch de Break cuando hay turno cortado
   - Actualizar `handleApply` para enviar los nuevos parámetros
   - Actualizar props interface para `onApplyWithOptions`

2. **`src/components/hr/schedule-selection/useScheduleSelection.ts`**
   - Extender `handleApplyWithOptions` para recibir `startTime2?` y `endTime2?`
   - Incluir estos valores en el `ScheduleValue` resultante
   - Omitir break automático cuando hay turno cortado

3. **`src/components/hr/InlineScheduleEditor.tsx`**
   - Eliminar estado `editingCell`
   - Eliminar el componente `<ScheduleCellPopover>` del render
   - Eliminar `onDoubleClick` de las celdas

---

### Detalle técnico

**SelectionToolbar - Nuevos estados y lógica:**
```typescript
const [isSplitShift, setIsSplitShift] = useState(false);
const [startTime2, setStartTime2] = useState('');
const [endTime2, setEndTime2] = useState('');

const handleApply = () => {
  if (startTime && endTime) {
    onApplyWithOptions(
      startTime, 
      endTime, 
      selectedPosition || null, 
      isSplitShift ? false : includeBreak, // No break for split shifts
      isSplitShift ? startTime2 : undefined,
      isSplitShift ? endTime2 : undefined
    );
  }
};
```

**useScheduleSelection - handleApplyWithOptions extendido:**
```typescript
const handleApplyWithOptions = useCallback((
  startTime: string, 
  endTime: string, 
  position: string | null,
  includeBreak: boolean,
  startTime2?: string,
  endTime2?: string
) => {
  // ... existing logic ...
  
  const scheduleValue: ScheduleValue = {
    startTime,
    endTime,
    isDayOff: false,
    position,
    breakStart: startTime2 ? null : breakStart, // No break for split shifts
    breakEnd: startTime2 ? null : breakEnd,
    startTime2: startTime2 || null,
    endTime2: endTime2 || null,
  };
  // ...
}, [...]);
```

---

### Beneficios

1. **Flujo más rápido**: No hay que hacer doble-click ni abrir modales
2. **Consistencia Excel-style**: Todo se maneja desde el toolbar inline
3. **Menos código**: Se elimina el modal/popover de edición individual
4. **Mejor UX**: El toggle hace evidente cuándo es turno cortado

---

### Verificación recomendada

1. Seleccionar una o más celdas
2. Activar toggle "Turno cortado"
3. Ingresar: 11:00-14:00 / 20:00-01:00
4. Click en "Aplicar"
5. Verificar que la celda muestre ambos tramos (ej: `11-14 / 20-01`)
6. Guardar y confirmar que se persiste correctamente

