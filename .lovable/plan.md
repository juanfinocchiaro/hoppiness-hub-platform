

# Auditoría Funcional End-to-End — Re-ejecución Post-Fixes

---

## Resumen: Qué se hizo vs qué falta

### Implementado correctamente

| Item original | Estado |
|---|---|
| **BUG-004**: labor_config table (no hardcoded) | HECHO — `labor_config` + `useLaborConfig` hook |
| **BUG-005**: Anti-duplicados edge function | HECHO — check 2 min en `register-clock-entry` |
| **BUG-006**: `deleteClockEntry` recalcula state | HECHO — queries last entry y upsert state |
| **BUG-008**: Duplicación solicitudes | HECHO — check antes de insert en `createLeaveRequest` |
| **BUG-009**: Presentismo con tardanza acumulativa | HECHO — `tardanzaAcumuladaMin` + config |
| **BUG-002**: Horas licencia columna separada | HECHO — `hsLicencia` en `useLaborHours` |
| BUG-004b: Francos vs feriados desglose | HECHO — `hsFrancoTrabajado` + `feriadosHs` |
| CSV export con columnas nuevas | HECHO |

### Pendiente o con bugs activos

| Item | Estado | Severidad |
|---|---|---|
| **Reconciliador stale + clock-out tardío** | BUG NUEVO CRITICO | Crítico |
| **EditEntryDialog timezone bug** | BUG ACTIVO | Crítico |
| **work_date asignación post-reconciliación** | BUG ACTIVO | Crítico |
| **BUG-003**: Retiro anticipado autorizado UI | PARCIAL — columna DB existe, falta checkbox en UI | Alto |
| **BUG-007**: Conflicto solicitud vs horario | NO HECHO | Alto |
| **BUG-010**: Warning edición retroactiva | NO HECHO | Medio |
| LATE_THRESHOLD en helpers.ts | PARCIAL — cambiado a 15 pero sigue hardcodeado | Medio |

---

## (1) Mapa de Flujos — Estado Actual

```text
FICHAJE REAL (QR/PIN)
  └─ Edge Function: register-clock-entry
       ├─ Valida PIN (RPC validate_clock_pin_v2)
       ├─ Lee employee_time_state
       │   └─ Si state=working y shift stale (>14h o >6h post midnight):
       │       → AUTO-CIERRA con system_inferred clock_out
       │       → state pasa a OFF
       │       → El siguiente fichaje se lee como clock_in ← BUG: debería ser clock_out
       ├─ Check duplicados (< 2 min) ✅
       ├─ Empareja con schedule
       ├─ Inserta clock_entries (work_date = fecha operativa)
       └─ Actualiza employee_time_state
```

---

## (2) Lista de Bugs y Riesgos (priorizados)

### BUG-011 (NUEVO)
- **Módulo:** Fichajes
- **Severidad:** Crítico
- **Probabilidad:** Alta (pasa TODAS las noches)
- **Descripción:** Race condition entre stale reconciler y fichaje real. El auto-close genera un `clock_out system_inferred` a las 02:00 UTC (23:00 ARG). Cuando el empleado realmente sale a las 02:12 ARG (05:12 UTC), `employee_time_state` ya está en `off`, así que el sistema registra un nuevo `clock_in` en vez de `clock_out`.
- **Reproducción:** Turno 19:00-02:00. Empleado sale a las 02:12 AR. El reconciliador ya cerró a las 02:00 UTC (23:00 AR, que es ANTES de las 02:00 AR reales). El empleado marca PIN → sistema crea clock_in para el 02/03.
- **Dato real en DB:** Leandro Germanis: clock_in at 05:13 UTC con `work_date: 2026-03-02` y `schedule_id` del 02/03. Carolina Salas: clock_in at 05:12 UTC con `work_date: 2026-03-01` (misma schedule que su turno original).
- **Impacto:** Operativo/financiero — turnos no cerrados, horas mal calculadas, datos corruptos.
- **Causa:** El stale reconciler usa `02:00:00+00` (UTC) como hora de cierre. Para un turno que termina a las 02:00 AR (= 05:00 UTC), el cierre ocurre 3 horas antes de lo esperado. El cálculo de `estimatedOut` no considera timezone Argentina.
- **Fix sugerido:**
  - **Hotfix:** El `estimatedOut` en la Edge Function debe calcularse en hora Argentina, no UTC. Si `end_time = 02:00` y `schedule_date = 2026-03-01`, el cierre estimado debería ser `2026-03-02T05:00:00Z` (02:00 AR del 2 de marzo), no `2026-03-02T02:00:00Z`.
  - **Estructural:** El stale check debería comparar elapsed time contra el horario programado en timezone local. Si el empleado está dentro de `end_time + afterMin` (ventana de captura), NO debe auto-cerrar. Solo auto-cerrar si pasan más de `afterMin` minutos después de `end_time` en hora Argentina.

### BUG-012 (NUEVO)
- **Módulo:** Fichajes
- **Severidad:** Crítico
- **Probabilidad:** Alta
- **Descripción:** `EditEntryDialog` construye el nuevo timestamp usando la fecha local del `created_at` sin ajustar timezone. `new Date(entry.created_at)` devuelve un Date en UTC. `format(date, 'yyyy-MM-dd')` formatea en timezone local del navegador. `new Date(\`${dateStr}T${time}:00\`).toISOString()` crea un timestamp interpretado como local y luego convertido a UTC. Esto puede desplazar la hora ±3 horas.
- **Reproducción:** Carolina Salas tiene `created_at: 2026-03-02T05:12:46Z` (02:12 AR del 02/03). El dialog muestra "02:12" (correcto). Pero `format(date, 'yyyy-MM-dd')` da "2026-03-02" (fecha local). Al guardar con hora corregida, `new Date("2026-03-02T02:12:00")` se interpreta como hora local Argentina → `toISOString()` da `2026-03-02T05:12:00Z`. Esto funciona por accidente en AR, pero la fecha que se usa para `work_date` debería ser `work_date` del entry, no derivada de `created_at`.
- **Fix sugerido:** Usar `entry.work_date` (si existe) como fecha base en lugar de derivarla de `created_at`. Agregar campo `date` editable que muestre `work_date`.

### BUG-013 (NUEVO)
- **Módulo:** Fichajes
- **Severidad:** Alto
- **Probabilidad:** Alta
- **Descripción:** Claribel Orlandi: su clock_out real a las 02:12 AR (05:12 UTC) tiene `work_date: 2026-03-02` y `schedule_id: null`, desconectado de su clock_in del 01/03. Esto se debe a que el estado ya estaba en `off` (por el auto-close), así que el sistema la trató como un fichaje independiente. En la vista del 01/03 aparece "Turno no cerrado" con salida "23:00" (el system_inferred). En la vista del 02/03 aparece un clock_out huérfano sin schedule.
- **Impacto:** Datos corruptos — la vista del 01/03 muestra una hora de salida falsa (23:00 en vez de 02:12), y el 02/03 tiene una entrada fantasma.

### BUG-003 (PENDIENTE)
- **Módulo:** Liquidación
- **Severidad:** Alto
- **Probabilidad:** Alta
- **Descripción:** La columna `early_leave_authorized` existe en DB, pero no hay checkbox en `EditEntryDialog` ni `AddManualEntryForm` para marcar un retiro como autorizado.
- **Fix:** Agregar switch/checkbox "Retiro anticipado autorizado" en ambos formularios.

### BUG-007 (PENDIENTE)
- **Módulo:** Solicitudes
- **Severidad:** Alto
- **Probabilidad:** Media
- **Descripción:** Aprobar un día libre no actualiza el horario. El calendario sigue mostrando turno programado.

### BUG-010 (PENDIENTE)
- **Módulo:** Liquidación
- **Severidad:** Medio
- **Probabilidad:** Media
- **Descripción:** No hay warning al editar fichajes de meses anteriores.

### BUG-014 (NUEVO)
- **Módulo:** Fichajes (UI)
- **Severidad:** Medio
- **Probabilidad:** Alta
- **Descripción:** `LATE_THRESHOLD = 15` en `helpers.ts:178` sigue hardcodeado. Aunque `useLaborHours` usa `labor_config`, la vista de roster diaria usa su propia constante para determinar si mostrar un fichaje como "tarde" visualmente.
- **Fix:** Pasar el valor de `labor_config` al `buildDayRoster` o a `resolveRowStatus`.

---

## (3) Fricciones UX

| Fricción | Solución |
|---|---|
| Encargado ve "Turno no cerrado" con salida 23:00, pero la salida real fue a las 02:12. No hay forma de distinguir system_inferred de real | Mostrar badge "Cierre automático" cuando `resolved_type = 'system_inferred'`. Mostrar la hora real del clock_out del empleado si existe uno posterior |
| Al editar fichaje de ayer (overnight), el dialog no muestra la fecha, solo la hora. No queda claro qué fecha se está editando | Mostrar campo de fecha editable en EditEntryDialog, pre-llenado con `work_date` |
| No hay checkbox de "Retiro anticipado autorizado" | Agregar en EditEntryDialog y AddManualEntryForm |
| En el historial expandido (imagen 4), todos los días futuros muestran "Pendiente" sin indicación de que es normal | Ocultar días futuros o marcarlos con color gris tenue |

---

## (4) Auditoría de Permisos — Sin cambios desde la auditoría anterior

Misma matriz. Los fixes implementados no alteraron permisos.

---

## (5) Integridad de Datos

| Área | Estado |
|---|---|
| `employee_time_state` sync on delete | CORREGIDO |
| Anti-duplicados en edge function | CORREGIDO |
| Duplicación solicitudes | CORREGIDO |
| `labor_config` dinámica | CORREGIDO |
| Auto-close timezone bug | **ACTIVO** — genera datos corruptos |
| `work_date` assignment post-stale-close | **ACTIVO** — entries huérfanas |
| `updateClockEntry` no actualiza `work_date` al cambiar fecha | **ACTIVO** |

---

## (6) Plan de Fix Prioritario

### Prioridad 1: Fix del motor de fichaje (stale reconciler timezone)

En `register-clock-entry/index.ts`:

1. **Calcular `estimatedOut` en timezone Argentina**, no UTC. Cuando `end_time = 02:00` y `schedule_date = 2026-03-01`, el cierre estimado debe ser `2026-03-02 02:00:00 AR` = `2026-03-02 05:00:00 UTC`.
2. **No auto-cerrar si estamos dentro de la ventana de captura**. Si `now < end_time_argentina + afterMin`, el turno NO es stale, el empleado simplemente no ha fichado salida aún.
3. **Cuando state=off y hay un auto-close reciente**, verificar si el fichaje entrante podría ser la salida real del turno auto-cerrado. Si `now` está dentro de `end_time + afterMin`, eliminar el auto-close y registrar un clock_out real en su lugar.

### Prioridad 2: Fix EditEntryDialog

1. Usar `work_date` del entry como fecha base (no derivar de `created_at`).
2. Agregar campo fecha editable.
3. Agregar checkbox "Retiro anticipado autorizado" (solo para clock_out).
4. Agregar warning si `work_date` pertenece a un mes anterior.

### Prioridad 3: LATE_THRESHOLD dinámico en helpers.ts

Pasar `late_tolerance` como parámetro a `resolveRowStatus` / `buildDayRoster` en vez de usar constante.

### Prioridad 4: Conflicto solicitud-horario

Al aprobar solicitud, marcar automáticamente el horario como `is_day_off` o mostrar warning.

---

## Preguntas de Cierre

1. **Stale reconciler timing:** Cuando el turno es 19:00-02:00 AR, ¿cuántos minutos DESPUÉS de las 02:00 AR se debe esperar antes de auto-cerrar? Actualmente afterMin es 60 del branch. ¿Está bien usar eso como ventana de gracia post-turno?

2. **Clock-out tardío post auto-close:** Si el reconciliador ya cerró un turno y el empleado marca PIN 30 minutos después, ¿querés que el sistema (a) reemplace el auto-close con la salida real, o (b) ignore el fichaje tardío y deje el auto-close?

3. **Carolina/Leandro data fix:** ¿Querés que limpiemos los datos corruptos del 01/03 y 02/03 como parte del fix, o los encargados lo corrigen manualmente?

