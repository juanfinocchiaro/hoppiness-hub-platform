

## Mejorar Visualización de Cobertura de Madrugada (Turnos Nocturnos)

### El Problema

En la vista de Cobertura, las horas de madrugada (00:00-02:00) del día 8 muestran personal que en realidad **está terminando un turno que empezó el día 7**. Esto genera confusión porque:

- El número 6 en la celda "Dom 8 - 00:00" parece indicar que hay 6 personas trabajando el domingo a medianoche
- Pero en realidad son 6 personas **cerrando el sábado**, no abriendo el domingo

### Solución Propuesta: "Jornada Operativa" en lugar de "Día Calendario"

**Concepto**: Reorganizar las horas para que cada columna represente una **jornada operativa** (11:00 a 02:00+) en lugar de un día calendario (00:00 a 23:59).

#### Cambios en la grilla de Cobertura:

```
ANTES (día calendario):
┌───────┬───────┬───────┬───────┐
│ Hora  │ Sáb 7 │ Dom 8 │ Lun 9 │
├───────┼───────┼───────┼───────┤
│ 00:00 │   -   │   6   │   6   │  ← ¿6 personas el domingo a la 0?
│ 01:00 │   -   │   6   │   6   │  
│ 12:00 │   2   │   1   │   1   │
│ ...   │       │       │       │
│ 23:00 │   6   │   6   │   2   │
└───────┴───────┴───────┴───────┘

DESPUÉS (jornada operativa):
┌───────┬───────┬───────┬───────┐
│ Hora  │ Sáb 7 │ Dom 8 │ Lun 9 │
├───────┼───────┼───────┼───────┤
│ 11:00 │   0   │   1   │   1   │  ← Día empieza a las 11
│ 12:00 │   2   │   1   │   1   │
│ ...   │       │       │       │
│ 23:00 │   6   │   6   │   2   │
│ 00:00 │   6   │   6   │   2   │  ← Estas son horas del cierre de ESE día
│ 01:00 │   4   │   6   │   2   │  
│ 02:00 │   -   │   -   │   -   │  ← Hora de cierre máximo
└───────┴───────┴───────┴───────┘
```

### Implementación Técnica

#### 1. Redefinir el orden de horas (de 11:00 a 04:00)

Cambiar `allHoursWithCoverage` para que ordene las horas en secuencia operativa:

```typescript
// Horas operativas: 11, 12, 13, ..., 23, 0, 1, 2, 3, 4
const operationalHourOrder = (hour: number): number => {
  return hour < 5 ? hour + 24 : hour; // 0→24, 1→25, 2→26, 3→27, 4→28
};

const hours = Array.from(hourSet).sort((a, b) => 
  operationalHourOrder(a) - operationalHourOrder(b)
);
```

#### 2. Cambiar la lógica de `getEmployeesAtHour`

Para horas de madrugada (0-4), asignar la cobertura a la columna del día **anterior** (el día en que empezó la jornada):

```typescript
const getEmployeesAtHour = (dateStr: string, hour: number) => {
  // Para horas de madrugada (0-4), buscamos en el día de la COLUMNA
  // pero como turnos que empezaron ESE día (no el día anterior)
  
  if (hour < 5) {
    // Hora de madrugada = mostrar quién tiene un turno 
    // que EMPEZÓ este mismo día y cruza medianoche
    return schedulesWithPending.filter(s => {
      if (s.schedule_date !== dateStr) return false;
      if (s.is_day_off || !s.start_time || !s.end_time) return false;
      
      const [startH] = s.start_time.split(':').map(Number);
      const [endH] = s.end_time.split(':').map(Number);
      
      // Solo turnos nocturnos que cruzan medianoche
      if (endH >= startH) return false; // Turno normal, no aplica
      
      // El turno termina después de las 00:00, verificar si cubre esta hora
      return hour < endH;
    });
  }
  
  // Horas normales (5:00 - 23:59): lógica actual
  // ...
};
```

#### 3. Agregar indicador visual para horas de madrugada

En las filas de 00:00-04:00, agregar un indicador que muestre que son "horas de cierre":

```tsx
// Etiqueta de hora con indicador
<div className="flex items-center gap-1">
  <span>{String(hour).padStart(2, '0')}:00</span>
  {hour < 5 && (
    <span className="text-[9px] text-muted-foreground">(cierre)</span>
  )}
</div>
```

#### 4. Tooltip mejorado con contexto

Cuando el tooltip muestre personal en horas de madrugada, indicar que es cobertura de cierre:

```tsx
<TooltipContent>
  <p className="font-medium">
    {format(day, "EEE d", { locale: es })}, {hour}:00
    {hour < 5 && <span className="text-muted-foreground"> (cierre)</span>}
  </p>
  <p className="text-xs text-muted-foreground">
    {hour < 5 ? 'Cerrando el turno de la noche:' : 'Personal:'}
  </p>
  {/* lista de empleados */}
</TooltipContent>
```

### Archivos a Modificar

1. **`src/components/hr/InlineScheduleEditor.tsx`**
   - Cambiar `allHoursWithCoverage` para ordenar horas en secuencia operativa (11-04)
   - Actualizar `getEmployeesAtHour` para que las horas <5 busquen turnos del mismo día que cruzan medianoche
   - Agregar indicador "(cierre)" en etiquetas de filas de madrugada
   - Mejorar tooltips con contexto

### Beneficios

1. **Claridad operativa**: El sábado 7 muestra TODO lo que pasa en la jornada del sábado, incluyendo el cierre después de medianoche
2. **Orden lógico**: Las horas van de apertura (11:00) a cierre (02:00), no de 00:00 a 23:00
3. **Sin ambigüedad**: Queda claro que las 6 personas a las 00:00 del sábado son las que están cerrando el sábado, no abriendo el domingo

### Verificación

1. Un turno 20:00-02:00 del sábado 7 debe mostrar cobertura en:
   - Sábado 7: filas 20:00, 21:00, 22:00, 23:00, 00:00, 01:00
   - Domingo 8: SIN cobertura en las filas de madrugada (salvo que alguien tenga turno ese día)

