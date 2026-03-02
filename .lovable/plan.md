

# Renombrar chip "Extras" a "Excedente s/turno"

Cambio simple en `DaySummaryStats.tsx`:

| Archivo | Cambio |
|---|---|
| `src/components/local/clockins/DaySummaryStats.tsx` L63-67 | Cambiar label `'Extras'` → `'No programadas'` para reflejar que son horas trabajadas fuera del turno programado, no horas extras de liquidación |

Solo es un cambio de string en una línea.

