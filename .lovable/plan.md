
## Objetivo
Eliminar de raíz el error que le impide a Dalma (y a cualquier encargado) publicar horarios 1, 2 o muchos días a la vez, que hoy aparece como:

- `duplicate key value violates unique constraint "employee_schedules_employee_month_day_shift_unique"`

Ese constraint está mal para el modelo actual (por fecha exacta `schedule_date`) y vuelve imposible cargar más de un día por semana (porque usa `day_of_week` como parte de la unicidad).

---

## Hallazgo principal (causa raíz)
En la tabla `employee_schedules` existen **dos “reglas” de unicidad**:

1) Correcta para el sistema nuevo:
- `idx_employee_schedules_user_date_unique` (unique por `user_id, schedule_date`)

2) Heredada del sistema viejo (la que rompe todo):
- `employee_schedules_employee_month_day_shift_unique` (unique por `employee_id, schedule_year, schedule_month, day_of_week, shift_number`)

Esta segunda regla implica que, para un empleado y un mes, **solo puede existir 1 registro por día de la semana** (ej: solo 1 “lunes” en todo el mes), lo cual es incompatible con horarios mensuales por fecha.

Esto explica que “ya lo cargó 4 veces” y siempre falla: la app intenta guardar múltiples lunes/martes/etc. del mes, y la base lo rechaza.

Además: hoy la UI hace UPSERT por `user_id,schedule_date`, pero igual falla porque **el otro unique constraint** se dispara antes de que el UPSERT pueda resolver el conflicto.

---

## Comprobaciones que ya hice (para evitar arreglos a ciegas)
- Verifiqué los índices reales de `employee_schedules` en la base.
- Verifiqué si había filas con `schedule_date` en null (no hay): `null_schedule_date = 0`. Esto es clave porque permite eliminar la regla vieja sin dejar datos “en el limbo”.

---

## Solución integral (backend + frontend) — en pasos

### 1) Arreglo definitivo en la base de datos (lo que elimina el error)
**Cambio de esquema:**
- Eliminar el índice/constraint único heredado:
  - `DROP INDEX public.employee_schedules_employee_month_day_shift_unique;`

**Opcional recomendado (para consistencia futura):**
- Asegurar el modelo “un registro por día” de forma explícita:
  - Mantener como autoridad la unicidad por fecha (`user_id,schedule_date`) ya existente.
- Si en el futuro quieren múltiples turnos por día (shift_number > 1), el diseño ideal sería:
  - unique por (`user_id`,`schedule_date`,`shift_number`)
  - y adaptar UI/DB para soportarlo.
  - (No lo implemento ahora salvo que lo pidan, para no abrir alcance.)

**Por qué esto es “de raíz”**
- Porque remueve la regla que hace físicamente imposible guardar varios días del mes (no es un bug de UI; es un bloqueo estructural).

---

### 2) Optimizar el guardado desde la UI (para que sea robusto y rápido)
Hoy `InlineScheduleEditor` guarda **día por día** dentro de loops. Esto:
- genera muchas llamadas,
- aumenta chances de error parcial,
- hace más probable que Dalma “intente varias veces”.

**Cambio propuesto:**
- Construir un único array `recordsToUpsert` con todos los cambios válidos (de todos los empleados) y ejecutar:
  - `supabase.from('employee_schedules').upsert(recordsToUpsert, { onConflict: 'user_id,schedule_date' })`
- Y para “borrados” (cuando vacía una celda), agrupar deletes en menos llamadas (por ejemplo por usuario y rango del mes o por pares `user_id + schedule_date`).

**Beneficios**
- Guardado mucho más rápido.
- Menos probabilidad de “guardó la mitad y falló”.
- Reintentos más sencillos e idempotentes (si Dalma lo hace 4 veces, no debería romper ni duplicar).

---

### 3) Corregir detalles que hoy pueden generar inconsistencias (no bloqueantes, pero importantes)
- Evitar `new Date('YYYY-MM-DD').getDay()` para `day_of_week` por el tema UTC/Argentina.
  - Cambiar a `parseISO(day.date)` o derivar `day_of_week` desde el `Date` ya local del calendario si aplica.
  - Esto no es lo que causa el “duplicate key”, pero evita que el `day_of_week` quede mal cargado.

---

### 4) UX de error y anti “doble submit”
- Agregar un guard con `useRef` o deshabilitar el botón “Publicar horarios” mientras hay un guardado en curso (además del `isPending` ya visible).
- Mostrar un mensaje de error “amigable” cuando sea un problema de constraint (si vuelve a pasar por otra razón), incluyendo:
  - qué empleado y qué día falló (cuando sea posible),
  - y sugerencia “reintentar” sin perder cambios.

---

## Plan de verificación (end-to-end)
1) En la misma pantalla `/milocal/:branchId/equipo/horarios`:
   - Cargar horarios para Dalma en 8 días del mes (incluyendo 2 lunes).
   - Publicar.
2) Repetir con 2-3 empleados a la vez (como el caso del screenshot: 6 empleados, 18 cambios).
3) Re-publicar los mismos cambios (idempotencia):
   - No debe duplicar ni fallar.
4) Probar en zona horaria Argentina (UTC‑3) con cambios en días limítrofes del mes:
   - Confirmar que el día de la semana y fecha guardada coinciden.

---

## Entregables concretos (qué voy a tocar cuando implemente)
1) Migración de base de datos:
   - Drop del índice unique heredado `employee_schedules_employee_month_day_shift_unique`.
2) Código UI:
   - Refactor del “save” en `InlineScheduleEditor.tsx` para hacer upsert en batch (no por celda).
   - Ajuste de cálculo de `day_of_week` para evitar UTC issues.
   - Guard anti doble click / doble submit y mejor manejo de errores.

---

## Riesgos / Consideraciones
- Eliminar ese índice no borra datos; solo quita una restricción errónea.
- Como ya no hay filas con `schedule_date = null`, el sistema ya está en modo “nuevo”, por lo que el cambio es seguro.
- Si alguien dependía del constraint viejo (muy improbable, porque bloquea el negocio), el único efecto será permitir lo que hoy necesitan: múltiples semanas del mes.

---

## Nota técnica breve (por qué el error se dispara incluso con UPSERT)
UPSERT resuelve conflictos sobre el índice que se le indica (`onConflict: user_id,schedule_date`), pero **si existe otra restricción unique que también se viola** (la vieja por `day_of_week`), la inserción falla igual. Por eso el fix correcto es eliminar la constraint heredada.

