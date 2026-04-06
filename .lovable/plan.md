

## Informe PDF individual: mostrar el mes completo con horarios programados y faltas

### Problema actual
El PDF individual solo muestra días donde hubo fichajes (`entries`). Si un empleado tenía horario programado pero no fichó (falta), ese día no aparece. Tampoco se muestra el horario programado original para comparar.

### Solución

**1. Enriquecer `EmployeeLaborSummary` con datos de horarios (`useLaborHours.ts`)**

Agregar un nuevo campo al tipo `EmployeeLaborSummary`:
```typescript
scheduledDays: { date: string; startTime: string | null; endTime: string | null; isDayOff: boolean; position: string | null }[];
```

Popularlo desde `userSchedules` que ya se consulta en el hook (línea 293-305). Simplemente mapear y devolver esos registros como parte del summary.

**2. Reescribir `buildDailyRows` en `laborEmployeeExport.ts`**

En vez de iterar solo `s.entries` (fichajes), generar una fila por cada día del mes (1..N):

- Para cada día del mes:
  - Buscar el horario programado → columna "Horario" (ej: "12:00-15:00 / 21:00-02:00")
  - Buscar fichajes de ese día en `s.entries` → columnas "Entrada" y "Salida"
  - Si hay múltiples fichajes en el mismo día (turno cortado), generar sub-filas
  - Determinar el tipo: Feriado, Franco, Vacaciones, Cumpleaños, **Ausente** (tenía horario, no fichó), Regular
  - Calcular tardanza si corresponde

Agregar la columna **"Horario"** a la tabla del PDF:

```text
DAILY_HEADERS = ['Día', 'Horario', 'Entrada', 'Salida', 'Horas', 'Tipo', 'Tardanza']
```

**3. Lógica de detección de estado por día**

```
Si es feriado → "Feriado"
Si es franco (is_day_off sin position especial) → "Franco"  
Si position = vacaciones → "Vacaciones"
Si position = cumple → "Cumpleaños"
Si tiene horario pero no fichó → "AUSENTE" (resaltado en rojo)
Si fichó normalmente → "Regular"
Si no tiene horario ni fichaje → no mostrar fila
```

**4. Formato visual en el PDF**

- Filas de "AUSENTE": texto rojo, fondo rosado suave
- Columna "Horario": muestra el turno programado (ej: "12:00-15:00")
- Días de Franco/Vacaciones: sin columnas de fichaje, solo el tipo
- Para turnos cortados con 2 fichajes el mismo día: mostrar 2 sub-filas con el mismo día

**5. Aplicar los mismos cambios al Excel** (`exportEmployeeExcel`)

### Archivos a modificar
- `src/hooks/useLaborHours.ts` — agregar `scheduledDays` al tipo y al return
- `src/utils/laborEmployeeExport.ts` — reescribir `buildDailyRows`, agregar columna "Horario", marcar ausentes

