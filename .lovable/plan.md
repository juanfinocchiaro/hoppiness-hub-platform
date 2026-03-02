

# Fix: Turno cortado debe generar DOS filas, no una

## Diagnóstico

Pablo tiene **UN solo schedule** con dos segmentos: `11:00-17:00` y `21:00-02:00`. El sistema trata esto como una sola fila y muestra `"11:00 - 17:00 / 21:00 - 02:00"` todo junto.

El fichaje de la noche (20:52) no tiene `schedule_id` → cae a "unlinked". La lógica de rescue en L373-378 **no lo puede rescatar** porque el schedule ya tiene entries del turno mañana (`hasLinked = true`), así que lo salta y crea "No programado".

Resultado: fila 1 = "No programado" con datos de noche, fila 2 = "11:00-17:00 / 21:00-02:00" con datos de mañana. Datos cruzados y confusos.

## Solución

Cuando un schedule tiene `start_time_2 / end_time_2`, **expandirlo en dos schedules virtuales** antes de hacer el matching. Cada segmento genera su propia fila con su propio label y sus propias entries.

### Archivo: `src/components/local/clockins/helpers.ts`

**Paso 1 — Expandir split schedules (~L341)**: Antes del matching, recorrer `workSchedules` y para cada schedule con `start_time_2/end_time_2`, reemplazarlo por dos "virtual schedules":
- Segmento 1: `{ ...sched, start_time, end_time, start_time_2: null, end_time_2: null, _virtualSegment: 1 }`
- Segmento 2: `{ ...sched, start_time: start_time_2, end_time: end_time_2, start_time_2: null, end_time_2: null, _virtualSegment: 2 }`

Ambos mantienen el mismo `id` para que entries con `schedule_id` apuntando a ese schedule sean asignados.

**Paso 2 — Distribuir entries entre segmentos (~L94-113)**: En `groupEntriesBySchedule`, cuando dos virtual schedules comparten el mismo `id`, distribuir los entries por proximidad temporal al `start_time` de cada segmento en vez de simplemente agrupar todo bajo el mismo id.

**Paso 3 — Rescue mejorado (~L373-378)**: Permitir que un segmento virtual vacío reciba entries rescatados, incluso si el otro segmento del mismo schedule original ya tiene entries.

**Paso 4 — Labels correctos**: Como cada segmento virtual ya tiene solo su `start_time/end_time` sin `_2`, el `shiftLabel` automáticamente mostrará `"11:00 - 17:00"` y `"21:00 - 02:00"` por separado.

### Cambios en types

Agregar campo opcional `_virtualSegment?: 1 | 2` a `ScheduleInfo` para distinguir segmentos expandidos (solo uso interno, no viene del DB).

### Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/components/local/clockins/types.ts` | Agregar `_virtualSegment?: 1 \| 2` a `ScheduleInfo` |
| `src/components/local/clockins/helpers.ts` | Expandir split schedules en dos virtuales + distribuir entries por segmento + fix rescue |

