
# Plan: Barra de Herramientas Fija para Editor de Horarios

## Problema Actual
La interfaz tiene elementos que aparecen/desaparecen dinámicamente:
- Botones Guardar/Descartar solo visibles con cambios pendientes
- SelectionToolbar en segunda fila solo visible con celdas seleccionadas
- Esto causa que el layout "salte" y rompa la experiencia

## Solución: Header de Dos Filas Fijo

Reorganizar el `CardHeader` con dos filas **siempre presentes**:

```
+----------------------------------------------------------+
| [Personas][Cobertura]  |  [📋 clipboard]  |  [Guardar]   |  ← Fila 1
+----------------------------------------------------------+
| [3 celdas] | [Copiar][Pegar][Limpiar] | [Franco][18-00]  |  ← Fila 2
+----------------------------------------------------------+
```

### Fila 1 (Siempre visible)
- Izquierda: Toggle Personas/Cobertura + filtro horario (cobertura)
- Centro: Indicador de clipboard (si hay algo copiado)
- Derecha: Acciones de guardado (aparecen cuando hay cambios)

### Fila 2 (Siempre presente, contenido dinámico)
- Cuando hay selección: muestra SelectionToolbar completo
- Cuando no hay selección: muestra hint de atajos o queda vacío con altura mínima
- Altura fija de ~40px para evitar saltos

## Cambios Técnicos

### 1. Modificar `CardHeader` en InlineScheduleEditor.tsx

```tsx
<CardHeader className="py-2 px-4 border-b bg-muted/30">
  {/* Fila 1: Toggle + Clipboard + Actions - SIEMPRE */}
  <div className="flex items-center justify-between gap-4 min-h-[40px]">
    {/* Izq: Toggle vistas */}
    <div className="flex items-center gap-2">
      {/* Toggle Personas/Cobertura */}
      {/* Filtro horario si cobertura */}
    </div>
    
    {/* Centro: Indicador clipboard */}
    {selection.clipboard && (
      <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground">
        <Copy className="w-3 h-3" />
        {selection.clipboard.sourceInfo}
        <button onClick={selection.clearClipboard}>×</button>
      </div>
    )}
    
    {/* Der: Acciones guardar */}
    <div className="flex items-center gap-2">
      {pendingChanges.size > 0 && (
        <>
          <Badge>N pendientes</Badge>
          <Button onClick={handleDiscardChanges}>Descartar</Button>
          <Button onClick={() => setSaveDialogOpen(true)}>Guardar</Button>
        </>
      )}
    </div>
  </div>
  
  {/* Fila 2: Toolbar selección - SIEMPRE presente */}
  <div className="min-h-[36px] flex items-center">
    {selection.hasSelection && activeView === 'personas' ? (
      <SelectionToolbar ... /> {/* Sin clipboard indicator */}
    ) : canManageSchedules && activeView === 'personas' ? (
      {/* Hint de atajos cuando no hay selección */}
      <div className="text-xs text-muted-foreground flex items-center gap-4">
        <span>Click para editar • Ctrl+Click: multiselección • Shift+Click: rango</span>
      </div>
    ) : null}
  </div>
</CardHeader>
```

### 2. Modificar SelectionToolbar.tsx

Remover el indicador de clipboard del toolbar (ya estará en Fila 1):

- Eliminar la sección `{clipboard && (...)}` al final del componente
- Eliminar prop `onClearClipboard` 
- Mantener solo: conteo, copy/paste/clear, quick schedules, deselect

### 3. Mover leyenda de colores

La leyenda actual (Ctrl+Click, Seleccionado, Modificado) está arriba del Card.
Moverla dentro del header o convertirla en tooltip sobre botón de ayuda.

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/hr/InlineScheduleEditor.tsx` | Reestructurar CardHeader con 2 filas fijas |
| `src/components/hr/schedule-selection/SelectionToolbar.tsx` | Remover sección clipboard |

## Beneficios

1. **Layout estable**: No hay saltos cuando aparecen/desaparecen elementos
2. **Guardar siempre accesible**: El botón siempre está en la misma posición
3. **Clipboard visible**: El usuario siempre sabe si tiene algo copiado
4. **Hints útiles**: Cuando no hay selección, el usuario ve atajos disponibles
