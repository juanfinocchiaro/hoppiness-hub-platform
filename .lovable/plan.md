
# Plan: Editor de Horarios Excel-Style - Simplificación Total

## Estado: ✅ COMPLETADO

## Cambios Implementados

### 1. ✅ Drag Selection Arreglado
- Migrado de `onMouseEnter` en cada celda a `onMouseMove` en el contenedor
- Agregado `data-cell` attribute a cada celda para identificación
- Usando `elementFromPoint()` para encontrar la celda bajo el cursor
- `isDragging` ahora es estado (no ref) para reactividad en el padre

### 2. ✅ Auto-focus Eliminado
- Eliminado el `useEffect` que hacía `focus()` y `select()` en los inputs de hora
- Ahora el usuario hace click manualmente cuando quiere editar las horas

### 3. ✅ Popover Eliminado
- Eliminado `ScheduleCellPopover` del render de celdas
- Eliminado estado `editingCell` y funciones asociadas
- Eliminado `onDoubleClick` de las celdas
- Toda la edición es ahora inline desde la toolbar

### 4. ✅ Toolbar Expandida
Nueva estructura de `SelectionToolbar`:
- **Badge de selección**: "X celda(s)"
- **Tipo de día**: Franco / Vacaciones 🏖️ / Cumple 🎂
- **Posición**: Dropdown con posiciones de `work_positions`
- **Horas**: Entrada + Salida + Aplicar
- **Break**: Toggle automático (30 min para turnos +6h)
- **Acciones**: Copiar / Pegar / Limpiar / Deseleccionar

### 5. ✅ Nuevas Funciones en Hook
- `handleApplyVacation()` - Aplica vacaciones a la selección
- `handleApplyBirthday()` - Aplica día de cumple a la selección
- `handleApplyWithOptions(start, end, position, includeBreak)` - Aplicar con todas las opciones

---

## Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `useScheduleSelection.ts` | Refactorizado completamente - isDragging como state, nuevas funciones |
| `SelectionToolbar.tsx` | Reescrito - sin auto-focus, todas las opciones inline |
| `InlineScheduleEditor.tsx` | Eliminado popover, agregado data-cell, onMouseMove en contenedor |

---

## Flujo de Usuario Final

1. **Click** en celda → la selecciona (borde azul)
2. **Arrastrar** → selecciona rectángulo de celdas (drag funciona correctamente)
3. **Shift+click** → extiende selección
4. **En la toolbar**: elegir qué aplicar
   - Click "Franco" → todas las celdas quedan como día libre
   - Click "Vac" → vacaciones
   - Click "Cumple" → día de cumple
   - Elegir posición + horas + break + Aplicar → asigna horario completo
5. **Enter** en input de hora → aplica
6. **Escape** → deselecciona
7. **Atajos**: F=Franco, V=Vacaciones, Ctrl+C/V, Delete
