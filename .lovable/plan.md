

# Fix Liquidación: horas inconsistentes, tardanzas falsas, vacaciones invisibles

## Problemas encontrados

### 1. Vacaciones nunca aparecen
`useLaborHours` construye `userIds` solo desde `clock_entries` (línea 299). Empleados de vacaciones que no fichan **nunca se incluyen** en la lista. Se necesita incluir también los user_ids de `schedules`.

### 2. Horas totales no coinciden con el diario
El diario (Fichajes) usa `useEmployeeTimeData` → `timeEngine.pairClockEntries` que tiene lógica distinta de `useLaborHours.pairClockEntries`:
- Distinto manejo de turnos sin cerrar (el diario incluye "in-progress", el mensual los ignora con `minutesWorked: 0`)
- Distinto manejo de `schedule_id` grouping
- El diario acumula todos los pares incluyendo en progreso; el mensual solo cuenta `completedEntries` (línea 339)

### 3. Tardanzas falsas
La lógica de tardanza (líneas 402-428) usa `clockInMin` del timestamp UTC pero lo compara con `start_time` local. Además, usa `diff < 720` que puede generar falsos positivos con turnos nocturnos. También cuenta tardanza en días de vacaciones/franco.

## Plan de corrección (1 archivo: `src/hooks/useLaborHours.ts`)

### A. Incluir usuarios de schedules (vacaciones visibles)
```text
ANTES: userIds = [...new Set(rawEntries.map(e => e.user_id))]
DESPUÉS: userIds = [...new Set([
  ...rawEntries.map(e => e.user_id),
  ...schedules.map(s => s.user_id)
])]
```
Esto asegura que empleados con vacaciones programadas pero sin fichajes aparezcan en la tabla.

### B. Fix tardanza: solo contar en días hábiles, usar hora local
- Saltar días donde `isDayOff` o `position === 'vacaciones'`
- Convertir `clockIn` a hora local Argentina (UTC-3) antes de comparar con `start_time`
- Mejorar la lógica de "closest schedule" para no contar tardanzas espurias

### C. Asegurar consistencia de horas con el diario
- Los pares sin `checkOut` ya se excluyen correctamente de `completedEntries` (consistente con no contar turnos en progreso)
- Verificar que no se pierdan pares por la lógica de `schedule_id` grouping

### D. Fix build errors en este archivo
- `fetchLaborConfig` ya no se exporta de `hrService.ts` → arreglar `useEmployeeTimeData.ts` 
- Otros build errors son de archivos no relacionados (PromocionesPage, POSPage, etc.) — se listarán como pendientes

## Archivos a modificar

1. **`src/hooks/useLaborHours.ts`** — Fix principal:
   - Incluir user_ids de schedules para vacaciones
   - Fix tardanza: skip días no hábiles, usar hora local
   
2. **`src/hooks/useEmployeeTimeData.ts`** — Fix build error:
   - Reemplazar `fetchLaborConfig` por la query directa (ya no existe en hrService)

3. **`src/hooks/useMonthClosed.ts`** y **`src/hooks/usePayrollReport.ts`** — Fix build errors:
   - Restaurar exports faltantes en `hrService.ts` o ajustar imports

## Nota sobre los demás build errors
Los ~40 errores restantes (PromocionesPage, POSPage, FichaTecnicaTab, financialService, etc.) son del migration español→inglés previo y no están relacionados con esta funcionalidad. Se pueden abordar en un paso separado.

