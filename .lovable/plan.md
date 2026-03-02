

# Resumen Diario en ClockInsPage

## Datos disponibles en `RosterRow`
Cada fila ya tiene: `totalMinutes`, `isLate`, `lateMinutes`, `status`, `schedule`. No necesitamos queries adicionales, todo se calcula del array `rows` existente.

## Metricas propuestas

| Metrica | Calculo | Justificacion |
|---|---|---|
| Total horas del dia | Suma `totalMinutes` de todos los rows con status completado/working/unclosed/late | Metrica principal del dia |
| Horas extras | Suma de `totalMinutes` que exceda el turno programado por empleado (comparar con duracion del schedule) | Solo si hay excedente real |
| Llegadas tarde | Cuenta de rows con `isLate === true` + suma de `lateMinutes` | Frecuencia + magnitud |
| Turnos no cerrados | Cuenta de `status === 'unclosed'` | Alerta operativa |
| Ausencias | Cuenta de `status === 'absent'` | Alerta operativa |

## Ubicacion

Debajo de `RosterSummaryBar` y antes de la tabla (entre lineas 330-332 del ClockInsPage). Un componente nuevo `DaySummaryStats` con cards compactas tipo grid horizontal.

## Diseño visual

Grid de 4-5 chips/cards compactas en una sola fila:
- `Total: 52h 30m` (icono Clock)
- `Extras: 3h 15m` (icono TrendingUp, solo si > 0)
- `Tardes: 2 (18 min)` (icono AlertTriangle, solo si > 0, color amber)
- `No cerrados: 1` (solo si > 0, color amber)
- `Ausentes: 1` (solo si > 0, color red)

Los que son 0 no se muestran para mantener limpio. Solo se muestra "Total" siempre.

## Calculo de horas extras por empleado

Para cada row completado: si tiene schedule con start/end, calcular la duracion programada. Si `totalMinutes > scheduledMinutes`, la diferencia es extra. Sumar todas.

## Archivos a crear/modificar

| Archivo | Cambio |
|---|---|
| `src/components/local/clockins/DaySummaryStats.tsx` | Nuevo componente |
| `src/pages/local/ClockInsPage.tsx` L330-331 | Importar y renderizar `DaySummaryStats` debajo de `RosterSummaryBar` |

