

## Override de encargado en fichaje bloqueado por reglamento

### Resumen
Cuando un empleado tiene el fichaje bloqueado por no firmar el reglamento, la encargada podrá autorizar el fichaje ingresando su propio PIN desde la misma pantalla pública.

### Cambios

**1. `src/services/hrService.ts`** — Nueva función `validateManagerOverridePin`
- Busca branch por `clock_code`, luego busca en `user_role_assignments` un usuario con ese `clock_pin` y rol `encargado`, `franquiciado` o `superadmin` asignado a esa sucursal
- Retorna `{ user_id, full_name }` o `null`

**2. `src/pages/FichajeEmpleado.tsx`** — UI de override en step `regulation-blocked`
- Nuevos estados: `showManagerPinInput`, `managerPin`, `managerOverride`, `managerValidating`
- Botón "Autorizar como encargado" que muestra input de PIN de 4 dígitos con auto-submit
- Si PIN válido: avanza a step `camera`
- Si PIN inválido: toast error
- En `clockMutation`: pasa `override_manager_name` al edge function

**3. `supabase/functions/register-clock-entry/index.ts`** — Auditoría
- Acepta campo opcional `override_manager_name` en el body
- Si presente, lo guarda en `manual_reason` del clock_entry insertado

### Archivos a modificar
- `src/services/hrService.ts`
- `src/pages/FichajeEmpleado.tsx`
- `supabase/functions/register-clock-entry/index.ts`

