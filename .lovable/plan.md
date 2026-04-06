
## Bug confirmado: el fichaje manual sí se guarda, pero queda con `work_date` equivocado y por eso “no aparece”

### Qué está pasando
No es un problema de guardado ni de refresco de UI. El registro se inserta, pero después las pantallas de Fichajes lo buscan por `work_date`, y ese campo se está calculando mal en algunos horarios nocturnos.

### Causa raíz confirmada
En `src/services/hrService.ts`, `createManualClockEntry()` hace esto:

```ts
const ts = new Date(params.timestamp);
const dateStr = ts.toISOString().slice(0, 10);
```

Eso toma la fecha en UTC, no la fecha operativa/local.

Ejemplo real:
- Encargado carga `28/03/2026 21:00`
- En Argentina eso termina como `2026-03-29T00:00:00.000Z`
- `toISOString().slice(0, 10)` devuelve `2026-03-29`
- Entonces:
  - busca horario en `employee_schedules.schedule_date = 2026-03-29`
  - guarda `clock_entries.work_date = 2026-03-29`

Pero la UI del día 28 consulta:
- `fetchClockEntriesRaw(...).eq('work_date', '2026-03-28')`
- `useFichajeDetalle()` también agrupa por `work_date`

Resultado: el fichaje “se agregó”, pero queda colgado en el día siguiente y parece que no se tomó.

### Por qué es grave
Esto puede afectar a cualquier fichaje manual cargado en horarios donde la conversión a UTC cambia de día, especialmente:
- cargas manuales nocturnas
- turnos de cierre
- entradas/salidas agregadas desde:
  - `ClockInsPage`
  - `RosterExpandedRow`
  - `EmployeeSummaryPanel`

Además del ocultamiento visual, también puede romper:
- vinculación con `schedule_id`
- liquidación
- cálculo de tardanza/ausencia
- emparejamiento de turnos cortados

### Implementación propuesta

#### 1. Hacer explícito el `workDate` en la creación manual
Modificar `createManualClockEntry()` para aceptar un `workDate?: string`.

La regla será:
- si llega `workDate`, usarlo como fuente de verdad
- si no llega, usar un fallback local seguro (no UTC)

#### 2. Dejar de usar `toISOString().slice(0, 10)` para decidir el día laboral
En `createManualClockEntry()`:
- usar `params.workDate` para:
  - lookup de `employee_schedules.schedule_date`
  - valor final de `clock_entries.work_date`
- mantener la lógica existente de `clock_out` heredando del abierto solo como fallback cuando no venga `workDate`

#### 3. Pasar `workDate` desde todos los formularios/manual actions
Actualizar estos llamados para enviar la fecha operativa que el usuario eligió:

- `src/components/local/clockins/AddManualEntryForm.tsx`
- `src/components/local/clockins/RosterExpandedRow.tsx`
- `src/pages/local/ClockInsPage.tsx`
- `src/components/local/EmployeeSummaryPanel.tsx`

La idea:
- `timestamp` sigue representando el instante real
- `workDate` representa el día operativo donde debe mostrarse y liquidarse

#### 4. Mantener intacta la regla 00:00–04:59
La lógica actual de “madrugada pertenece al día anterior” ya está en la UI y está bien encaminada.
No hay que romper eso; solo evitar que el service vuelva a recalcular el día usando UTC.

### Archivos a modificar
- `src/services/hrService.ts`
- `src/components/local/clockins/AddManualEntryForm.tsx`
- `src/components/local/clockins/RosterExpandedRow.tsx`
- `src/pages/local/ClockInsPage.tsx`
- `src/components/local/EmployeeSummaryPanel.tsx`

### Resultado esperado
Después del cambio:
- si agregás un fichaje manual para el `28/03`, se verá en el `28/03`
- tomará el horario correcto de ese día
- se liquidará en el día correcto
- no quedará corrido al 29 por timezone

### Validaciones clave
1. Cargar manual `28/03 21:00` y verificar que aparezca en Fichajes del 28
2. Cargar manual `28/03 00:55` y verificar que quede en jornada operativa del 28
3. Confirmar que el `schedule_id` se vincule con el horario correcto
4. Confirmar que Liquidaciones refleje ese fichaje en el mismo día
5. Revisar otro perfil con cierre nocturno para evitar que el bug siga ocurriendo en más empleados
