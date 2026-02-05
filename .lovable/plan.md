
# Plan: Simplificar Interfaz del Editor de Horarios

## Problema
1. Al hacer click en una celda aparecen **dos cosas**: el popover de edición Y la celda se marca como seleccionada, mostrando la barra de herramientas
2. Los "horarios predeterminados" (18-00, 12-18, 12-00) en la barra de selección son innecesarios
3. Demasiada información visual: leyendas, hints, toolbar - todo junto abruma

## Solución: Un Solo Modo de Interacción

### Nuevo Flujo
- **Click simple**: Abre popover de edición (SIN seleccionar la celda)
- **Ctrl+Click / Shift+Click**: Selección múltiple (sin popover)
- La barra de herramientas SOLO aparece cuando hay multiselección (2+ celdas)

### Diagrama de Interacción

```text
┌─────────────────────────────────────────────────────────────┐
│                         CLICK NORMAL                        │
│                              ↓                              │
│                    Abre Popover de edición                  │
│                    (Franco, Horario, Posición)              │
│                              ↓                              │
│                    Guardar → Pendiente                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    CTRL/SHIFT + CLICK                       │
│                              ↓                              │
│                    Selección múltiple                       │
│                              ↓                              │
│              Toolbar aparece (solo multiselección)          │
│              [N celdas] [Copiar] [Pegar] [Franco] [×]       │
└─────────────────────────────────────────────────────────────┘
```

## Cambios Técnicos

### 1. InlineScheduleEditor.tsx

**Separar comportamientos de click:**
```tsx
// Líneas 933-964 - Cambiar el handler de click
onClick={(e) => {
  // Solo Shift/Ctrl activa selección
  if (e.shiftKey || e.ctrlKey || e.metaKey) {
    e.preventDefault();
    e.stopPropagation(); // Evitar que abra popover
    selection.handleCellClick(member.id, dateStr, e);
  }
  // Click normal NO selecciona - solo abre popover
}}

// El div interno del popover NO debe llamar handleCellClick
<div className="w-full h-full flex items-center justify-center">
  {renderCellContent(value, isPending, isHoliday, false)}
</div>
```

**Simplificar el header - Row 2:**
- Eliminar hint de atajos cuando no hay selección (solo ocupa espacio)
- Solo mostrar toolbar cuando `selectedCells.size >= 1` (pero simplificado)

**Eliminar leyenda duplicada:**
- Eliminar la leyenda de colores que está arriba del Card (líneas 650-663)
- O convertirla en tooltip de un botón de ayuda

### 2. SelectionToolbar.tsx

**Eliminar horarios predeterminados:**
```tsx
// ELIMINAR líneas 38-44 y 146-157
const QUICK_SCHEDULES = [...] // DELETE

// ELIMINAR del JSX:
{QUICK_SCHEDULES.slice(0, 3).map((qs) => (
  <Button ... />
))}
```

**Resultado - Toolbar simplificado:**
```text
[3 celdas] | [Copiar] [Pegar] [Limpiar] | [Franco] | [×]
```

### 3. Limpieza Visual

**Eliminar información redundante:**
- Quitar la sección de leyenda fuera del Card (Ctrl+Click, Seleccionado, Modificado)
- Quitar la Row 2 de hints cuando no hay selección - dejar vacío o colapsado

**Header final:**
```text
┌─────────────────────────────────────────────────────────────┐
│ [Personas][Cobertura]     [📋 copiado]      [Guardar]       │
├─────────────────────────────────────────────────────────────┤
│ [3 celdas] | [Copiar][Pegar][Limpiar] | [Franco] | [×]      │  ← Solo si hay selección
└─────────────────────────────────────────────────────────────┘
```

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| InlineScheduleEditor.tsx | Separar click normal de multiselección, eliminar leyenda |
| SelectionToolbar.tsx | Eliminar QUICK_SCHEDULES y simplificar |

## Resultado Esperado

1. **Click = Editar**: Un click abre el popover directamente para editar
2. **Ctrl/Shift+Click = Multiselección**: Para operaciones masivas
3. **Toolbar limpio**: Solo [Copiar][Pegar][Limpiar][Franco][×]
4. **Menos ruido visual**: Sin leyendas ni hints redundantes
