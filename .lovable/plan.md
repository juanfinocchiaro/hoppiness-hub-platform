
# Plan: Separar Horarios en 2 Vistas (Personas + Cobertura)

## Objetivo
Simplificar la pantalla de Horarios separando en 2 tabs independientes que comparten el mismo contenedor de scroll, logrando:
- Mejor rendimiento (solo se renderiza la vista activa)
- Scroll horizontal sincronizado entre tabs
- Sticky header + sticky primera columna funcionando correctamente

## Arquitectura de la Solución

### Enfoque Elegante
Usar **un solo contenedor scrollable** que alterna su contenido interno segun el tab activo. Esto mantiene el `scrollLeft` automaticamente sincronizado sin necesidad de estado extra.

```
[Tab: Personas] [Tab: Cobertura]
     |                 |
     v                 v
+--------------------------------------------------+
| CONTENEDOR SCROLL UNICO                          |
| +-------+----------------------------------+     |
| | STICKY |  DIAS (scroll horizontal) -->   |     |
| | COL    |                                  |     |
| +-------+----------------------------------+     |
|                                                  |
|  Si tab=Personas: filas de empleados            |
|  Si tab=Cobertura: filas de horas               |
+--------------------------------------------------+
```

## Cambios en Archivos

### 1. Modificar `InlineScheduleEditor.tsx`

**Agregar estado para tab activo:**
```typescript
const [activeView, setActiveView] = useState<'personas' | 'cobertura'>('personas');
```

**Agregar Segmented Control antes del calendario:**
```tsx
<div className="flex items-center gap-2 bg-muted p-1 rounded-lg w-fit">
  <button 
    className={cn("px-3 py-1.5 rounded text-sm", activeView === 'personas' && "bg-background shadow")}
    onClick={() => setActiveView('personas')}
  >
    Personas
  </button>
  <button 
    className={cn("px-3 py-1.5 rounded text-sm", activeView === 'cobertura' && "bg-background shadow")}
    onClick={() => setActiveView('cobertura')}
  >
    Cobertura
  </button>
</div>
```

**Estructura del contenedor unico:**
```tsx
<CardContent className="p-0 max-h-[calc(100vh-320px)] overflow-auto relative">
  <div className="flex">
    {/* Columna sticky izquierda - cambia segun vista */}
    <div className="shrink-0 border-r bg-card z-20 sticky left-0">
      {/* Header sticky */}
      <div className="h-12 sticky top-0 z-30 bg-muted/50">
        {activeView === 'personas' ? 'Empleado' : 'Hora'}
      </div>
      
      {/* Filas de la columna izquierda */}
      {activeView === 'personas' 
        ? team.map(...) 
        : filteredHours.map(...) 
      }
    </div>
    
    {/* Grilla de dias - mismo ancho siempre */}
    <div ref={gridScrollRef} style={{ width: gridWidth }}>
      {/* Header de dias - sticky top */}
      <div className="h-12 sticky top-0 z-10 bg-muted/50">
        {monthDays.map(day => ...)}
      </div>
      
      {/* Contenido segun vista activa */}
      {activeView === 'personas' 
        ? team.map(member => <ScheduleRow />)
        : filteredHours.map(hour => <CoverageRow />)
      }
    </div>
  </div>
</CardContent>
```

### 2. Vista Personas (existente, solo reorganizar)

Mantiene exactamente la funcionalidad actual:
- Filas por empleado
- Click en celda abre popover de edicion
- Indicadores de turno, break, posicion
- Badge de "Franco" para dias libres

### 3. Vista Cobertura (nueva, extraer de lo existente)

**Agregar filtro de rango horario:**
```typescript
const [hourRange, setHourRange] = useState<'all' | '12-00' | '18-00'>('all');

const filteredHours = useMemo(() => {
  if (hourRange === 'all') return hoursWithCoverage;
  const [start, end] = hourRange === '12-00' ? [12, 24] : [18, 24];
  return hoursWithCoverage.filter(h => h >= start || h < end);
}, [hoursWithCoverage, hourRange]);
```

**Selector de rango:**
```tsx
<Select value={hourRange} onValueChange={setHourRange}>
  <SelectItem value="all">Todas las horas</SelectItem>
  <SelectItem value="12-00">12:00 - 00:00</SelectItem>
  <SelectItem value="18-00">18:00 - 00:00</SelectItem>
</Select>
```

**Tooltip mejorado con nombres:**
```tsx
<TooltipContent>
  <p className="font-medium">Lun 2, 19:00</p>
  <p>2 personas:</p>
  <ul className="text-xs">
    <li>Brian</li>
    <li>Caro</li>
  </ul>
</TooltipContent>
```

### 4. Sticky Headers y Columnas

**CSS clave para sticky correcto:**
```tsx
// Columna izquierda
<div className="sticky left-0 z-20 bg-card">

// Celda esquina (interseccion header + columna)
<div className="sticky left-0 top-0 z-30 bg-muted/50">

// Header de dias
<div className="sticky top-0 z-10 bg-muted/50">
```

## Codigo Eliminado

- Remover la seccion de cobertura integrada al final de la grilla de empleados (lineas 621-664)
- Remover la fila separadora "Cobertura" de la columna izquierda (lineas 524-545)
- Ya no se necesita `ShiftCoverageBar.tsx` (no se usa en esta pantalla)

## Beneficios

1. **Rendimiento**: Solo se renderiza una grilla a la vez
2. **Scroll sincronizado**: Al usar un solo contenedor, el scrollLeft se mantiene automaticamente
3. **Sticky funcional**: Sin conflictos entre grillas multiples
4. **UX limpia**: Cada vista tiene un proposito claro
5. **Alineacion perfecta**: Mismas columnas de dias, mismo ancho

## Criterios de Aceptacion

- [ ] Scroll horizontal funciona en ambas vistas
- [ ] Sticky header (dias) queda fijo al scrollear vertical
- [ ] Sticky primera columna queda fija al scrollear horizontal
- [ ] Cambiar de tab mantiene la misma posicion de scroll horizontal
- [ ] No hay doble scroll horizontal
- [ ] Vista Personas permite editar turnos
- [ ] Vista Cobertura muestra heatmap por hora con tooltips
- [ ] Filtro de rango horario funciona en Cobertura
