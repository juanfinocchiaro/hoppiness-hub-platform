

## Bug: `useLaborHours.ts` tiene la misma lógica vieja de `group.find()` que ya corregimos en `timeEngine.ts`

### Causa raíz confirmada

Leonardo tiene 4 fichajes el 29/03, todos con el mismo `schedule_id` (turno cortado):
- clock_in 14:53 → clock_out 19:03 (turno 12:00-15:00)
- clock_in 23:56 → clock_out 03:55 (turno 21:00-02:00)

En **`src/hooks/useLaborHours.ts` líneas 161-163**, la función `pairClockEntries` local usa:
```typescript
const clockIn = group.find(e => e.entry_type === 'clock_in');   // solo el primero
const clockOut = group.find(e => e.entry_type === 'clock_out'); // solo el primero
```

Esto genera **1 par** en vez de **2 pares**. Es exactamente el mismo bug que corregimos en `timeEngine.ts` pero en una copia diferente de la función de emparejamiento.

La vista de **Fichajes** usa `timeEngine.ts` (ya corregido) → muestra los 2 turnos.
La vista de **Liquidación** usa `useLaborHours.ts` (sin corregir) → muestra solo 1 turno.

### Solución

**Archivo: `src/hooks/useLaborHours.ts`** — Reemplazar el bloque `for (const [, group] of bySchedule)` (líneas 161-183) con emparejamiento secuencial:

```typescript
for (const [, group] of bySchedule) {
  let pendingIn: ClockEntryRaw | null = null;
  for (const e of group) {
    if (e.entry_type === 'clock_in') {
      if (pendingIn) {
        // clock_in huérfano
        const date = pendingIn.work_date ?? format(new Date(pendingIn.created_at), 'yyyy-MM-dd');
        paired.push({
          date, checkIn: pendingIn.created_at, checkOut: null,
          minutesWorked: 0, hoursDecimal: 0,
          isHoliday: holidays.has(date), isDayOff: scheduledDaysOff.has(date),
          earlyLeaveAuthorized: false,
        });
      }
      pendingIn = e;
    } else if (e.entry_type === 'clock_out' && pendingIn) {
      const checkInTime = new Date(pendingIn.created_at);
      const date = pendingIn.work_date ?? format(checkInTime, 'yyyy-MM-dd');
      const minutes = differenceInMinutes(new Date(e.created_at), checkInTime);
      paired.push({
        date, checkIn: pendingIn.created_at, checkOut: e.created_at,
        minutesWorked: Math.max(0, minutes), hoursDecimal: Math.max(0, minutes) / 60,
        isHoliday: holidays.has(date), isDayOff: scheduledDaysOff.has(date),
        earlyLeaveAuthorized: e.early_leave_authorized || false,
      });
      pendingIn = null;
    }
  }
  if (pendingIn) {
    const date = pendingIn.work_date ?? format(new Date(pendingIn.created_at), 'yyyy-MM-dd');
    paired.push({
      date, checkIn: pendingIn.created_at, checkOut: null,
      minutesWorked: 0, hoursDecimal: 0,
      isHoliday: holidays.has(date), isDayOff: scheduledDaysOff.has(date),
      earlyLeaveAuthorized: false,
    });
  }
}
```

### Impacto
- Corrige Leonardo y cualquier otro empleado con turno cortado en liquidación
- No afecta turnos simples (siguen generando 1 par)
- Un solo archivo a modificar

### Archivos a modificar
- `src/hooks/useLaborHours.ts` — líneas 161-183

