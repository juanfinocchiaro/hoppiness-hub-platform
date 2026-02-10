

## Importar feriados 2025

### Problema
Los feriados de 2025 nunca fueron importados a la base de datos. Solo existen los de 2026 (importados el 7 de febrero). Por eso el calendario de horarios no marca ningún día como feriado para fechas de 2025.

### Solución
Insertar los feriados de Argentina 2025 directamente en la base de datos usando una migración SQL. La función `getArgentinaHolidays()` ya existe en el código y calcula correctamente las fechas, pero la forma más directa es insertar los datos vía SQL.

### Feriados Argentina 2025 a insertar

| Fecha | Descripción |
|---|---|
| 2025-01-01 | Año Nuevo |
| 2025-03-03 | Carnaval |
| 2025-03-04 | Carnaval |
| 2025-03-24 | Día de la Memoria |
| 2025-04-02 | Día del Veterano y Caídos en Malvinas |
| 2025-04-17 | Jueves Santo (día no laborable) |
| 2025-04-18 | Viernes Santo |
| 2025-05-01 | Día del Trabajador |
| 2025-05-25 | Día de la Revolución de Mayo |
| 2025-06-16 | Paso a la Inmortalidad del Gral. Güemes |
| 2025-06-20 | Paso a la Inmortalidad del Gral. Belgrano |
| 2025-07-09 | Día de la Independencia |
| 2025-08-18 | Paso a la Inmortalidad del Gral. San Martín |
| 2025-10-13 | Día del Respeto a la Diversidad Cultural |
| 2025-11-24 | Día de la Soberanía Nacional |
| 2025-12-08 | Inmaculada Concepción de María |
| 2025-12-25 | Navidad |

### Cambio técnico

Una única migración SQL que inserta los 17 feriados en la tabla `special_days` con `branch_id = NULL` (feriados globales). Sin cambios de código.
