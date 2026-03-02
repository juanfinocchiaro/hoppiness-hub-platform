

# Auditoría UX/QA: Fichajes, Horarios, Equipo, Solicitudes, Liquidación

---

## 1. REDUNDANCIAS

### R1. Fichajes del empleado: 3 vistas con datos solapados
| Ubicación | Componente | Datos | Editable |
|---|---|---|---|
| Sidebar → Equipo → Fichajes (`ClockInsPage`) | `RosterTable` + `RosterExpandedRow` | Roster diario + historial mensual expandible por empleado | SI (editar, agregar, eliminar) |
| Sidebar → Equipo → clic en empleado → "Ver fichajes" | `EmployeeClockInsModal` | Lista plana del mes, total horas | NO (solo lectura, dice "usá pantalla de Fichajes") |
| Sidebar → Equipo → clic en empleado → expandido → historial mes | `RosterExpandedRow` (dentro de `ClockInsPage`) | Historial del mes con inline edit | SI |

**Fuente única:** `ClockInsPage` ya tiene el historial completo del mes con edición. `EmployeeClockInsModal` es redundante, solo lectura, con su propio cálculo de horas (diferente al de `useLaborHours`). Debería eliminarse o reemplazarse con un link directo a Fichajes filtrado por empleado.

### R2. Horarios del empleado: 2 vistas
| Ubicación | Componente | Datos | Editable |
|---|---|---|---|
| Sidebar → Equipo → Horarios (`SchedulesPage`) | `InlineScheduleEditor` (grilla Excel) | Todos los empleados, mes completo | SI |
| Sidebar → Equipo → clic en empleado → "Ver horarios" | `EmployeeScheduleModal` | Un solo empleado, mes actual, lista vertical | NO (solo lectura) |

**Fuente única:** `InlineScheduleEditor`. El modal es una vista degradada sin edición. Eliminarlo o reemplazar con deep link.

### R3. Edición de fichaje: 2 mecanismos distintos
| Desde | Mecanismo | Campos |
|---|---|---|
| `RosterTable` → hover → ícono lápiz | `EditEntryDialog` (dialog modal) | Tipo, Fecha, Hora, Motivo, Early Leave checkbox |
| `RosterExpandedRow` → historial mes → expandir día → ícono lápiz | Inline edit dentro del `RosterExpandedRow` | Solo: Tipo, Hora, Motivo (SIN fecha, SIN early leave) |

**Bug:** El inline edit de `RosterExpandedRow` (L54-77) usa `new Date(base)` derivado de `created_at`, no `work_date`. Y no tiene el campo `early_leave_authorized` ni el campo de fecha editable. Es decir, los fixes de BUG-012 y BUG-003 solo se aplicaron a `EditEntryDialog`, no al inline editor del expanded row.

### R4. Agregar fichaje manual: 2 mecanismos
| Desde | Componente | Campos |
|---|---|---|
| `RosterExpandedRow` → historial mes → expandir día → "+ Fichaje manual" | Inline form dentro de `RosterExpandedRow` | Tipo, Hora, Motivo (SIN early leave) |
| `ClockInsPage` no tiene un botón "Agregar" a nivel de página | — | — |

**Problema:** El `AddManualEntryForm` que tiene `early_leave_authorized` checkbox solo se usa en algún otro lugar (o no se usa). El inline form del expanded row es independiente y carece del campo.

### R5. Dashboard → Pendientes → "Solicitudes de día libre" linkea a Horarios
En `ManagerDashboard.tsx` L360: `<Link to={\`/milocal/${branch.id}/equipo/horarios\`}>` para "Solicitudes de día libre". Pero las solicitudes tienen su propia página en `/milocal/:id/tiempo/solicitudes` (`RequestsPage`). El link lleva al lugar equivocado.

---

## 2. FRICCIONES UX

### F1. No hay botón "Agregar fichaje" a nivel de página
En `ClockInsPage`, el encargado ve la tabla del día. Para agregar un fichaje manual debe: (1) encontrar al empleado en la tabla, (2) hacer clic para expandir, (3) dentro del historial del mes, encontrar el día, (4) expandir el día, (5) clic "+ Fichaje manual". Son 5 pasos. Debería haber un botón `+ Agregar fichaje` en el header de la página que abra un formulario con selector de empleado + fecha + hora + tipo.

### F2. Editar fichaje desde la tabla: solo edita el ÚLTIMO entry
En `RosterTable` → `ActionButtons` L42: `const editableEntry = allEntries[allEntries.length - 1]`. Si un empleado tiene entrada y salida, el botón de lápiz solo abre el último (la salida). No hay forma directa de editar la entrada desde la fila principal. El encargado debe expandir para acceder a editar la entrada.

### F3. El inline edit del expanded row no tiene validación de motivo
En `RosterExpandedRow` L57: `if (!editReason.trim()) throw new Error('Ingresá un motivo')`. Pero el `throw` dentro de `mutationFn` resulta en un error silencioso — no se muestra un toast claro al usuario. El botón "Guardar" debería estar `disabled` cuando `editReason` está vacío (como sí lo hace `EditEntryDialog`).

### F4. Labels confusos en sidebar
- "Horarios" y "Fichajes" usan el mismo ícono (`Clock`) — pueden confundirse.
- "Firmas" (para firmas de reglamento) no es autoexplicativo. Debería decir "Reglamento" o "Firmas de Reglamento".
- "Advertencias" en el sidebar pero "Apercibimientos" en la página y modales — terminología inconsistente.

### F5. `EmployeeClockInsModal` calcula horas de forma diferente a `useLaborHours`
El modal tiene su propio `calculateHours()` (L57-105) que empareja entries por `schedule_id` o secuencialmente. `useLaborHours` tiene una lógica completamente diferente (con `pairClockEntries`, francos, feriados, etc.). Los totales pueden diferir, confundiendo al encargado.

### F6. No hay confirmación al eliminar fichaje
`DeleteEntryDialog` existe y tiene confirmación, pero solo se accede desde el ícono de papelera en hover en la tabla principal. Correcto. Sin embargo, dentro de `RosterExpandedRow` L400-411, el delete también usa `onDeleteEntry` que delegará al dialog. Esto es correcto.

---

## 3. FLUJO DE FICHAJES DEL ENCARGADO — Análisis exacto

### AGREGAR un fichaje inexistente

**Ruta actual:**
1. Sidebar → Equipo → **Fichajes** (`/milocal/:id/equipo/fichajes`)
2. En la tabla, encontrar al empleado → clic en su fila para expandir
3. En el panel expandido ("Historial del mes"), encontrar la fecha correcta → clic para expandir
4. Clic **"+ Fichaje manual"** (botón dentro del expanded row)
5. Campos: Tipo (Entrada/Salida), Hora, Motivo
6. Clic "Guardar manual"
7. Feedback: toast "Fichaje manual agregado" (si éxito) o silencio (si error de validación)

**Problema:** 5 clics hasta llegar al formulario. No hay forma de agregar un fichaje sin antes expandir la fila y el día. No hay botón global.

**Campos faltantes:** No tiene `early_leave_authorized` checkbox. No tiene selector de empleado (ya está filtrado al expandir). No tiene campo de fecha (toma la fecha del día expandido).

### EDITAR un fichaje existente

**Ruta 1 (rápida, parcial):**
1. Sidebar → Equipo → Fichajes
2. Hover sobre la fila del empleado → aparece ícono lápiz (solo visible en hover, desktop only)
3. Clic lápiz → abre `EditEntryDialog` (modal)
4. Campos: Tipo, Fecha, Hora, Motivo, Early Leave (si salida)
5. Warning retroactivo si mes anterior
6. Guardar → toast "Fichaje corregido"

**Limitación:** Solo edita el ÚLTIMO entry del roster (puede ser la salida cuando querés editar la entrada).

**Ruta 2 (completa, buried):**
1. Sidebar → Equipo → Fichajes
2. Clic en fila para expandir historial
3. Encontrar día → expandir
4. Ver lista de entries del turno → clic lápiz en el entry específico
5. Se abre inline edit (dentro del expanded row, no modal)
6. Campos: Solo Tipo, Hora, Motivo. **SIN fecha, SIN early leave**.
7. Guardar → mutación directa, sin toast explícito (el `editMutation` en expanded row no tiene `onSuccess` toast)

---

## 4. BOTONERA Y NAVEGACIÓN — Inventario completo

### SIDEBAR (sección Equipo)

| Item Sidebar | Ruta | Qué muestra | Acciones | Duplicado en |
|---|---|---|---|---|
| Equipo | `/equipo` | Lista de empleados | Invitar, expandir fila → ver datos, editar, fichajes, horarios, apercibir, desactivar | Panel expandido replica acceso a fichajes/horarios/liquidación |
| Fichajes | `/equipo/fichajes` | Roster diario + QR + Ventana config | Editar/Eliminar/Agregar fichaje, Marcar licencia | — |
| Horarios | `/equipo/horarios` | Grilla Excel mensual | Asignar turnos, francos, vacaciones | Modal "Ver horarios" en EmployeeExpandedRow |
| Solicitudes | `/tiempo/solicitudes` | Lista de solicitudes por estado | Aprobar/Rechazar | Link erróneo desde Dashboard |
| Liquidación | `/tiempo/liquidacion` | Tabla resumen mensual + CSV | Solo lectura + exportar | Modal "Ver liquidación" en EmployeeExpandedRow (dice "próximamente") |
| Coaching | `/equipo/coaching` | Evaluaciones | Iniciar coaching | — |
| Reuniones | `/equipo/reuniones` | Actas | — | — |
| Adelantos | `/equipo/adelantos` | Lista de adelantos | Crear adelanto | — |
| Advertencias | `/equipo/apercibimientos` | Lista de warnings | Crear warning | Botón "Nuevo apercibimiento" en EmployeeExpandedRow |
| Firmas | `/equipo/reglamentos` | Estado de firma reglamento | Subir foto de firma | — |

### PANEL EXPANDIDO (EmployeeExpandedRow) al clic en un empleado en TeamPage

| Botón | Qué hace | Duplicado en |
|---|---|---|
| Ver fichajes | Abre `EmployeeClockInsModal` (solo lectura) | ClockInsPage (con edición) |
| Ver horarios | Abre `EmployeeScheduleModal` (solo lectura) | SchedulesPage (con edición) |
| Ver liquidación | Toast "próximamente" | LiquidacionPage ya funciona |
| Nuevo apercibimiento | Abre `WarningModal` | WarningsPage |
| Editar datos | Abre `EmployeeDataModal` | Único lugar |
| Desactivar empleado | AlertDialog + deactivate | Único lugar |

**Conclusión:** 3 de 6 botones del panel expandido abren modales de solo lectura que replican pantallas completas del sidebar. "Ver liquidación" ni siquiera funciona.

---

## 5. RIESGOS PRIORIZADOS

### P0 — Críticos (impacto alto + probabilidad alta)

**P0-1: Inline edit en RosterExpandedRow no tiene los fixes de BUG-012/BUG-003**
- Reproduce: Fichajes → expandir empleado → expandir día → clic editar en un entry → solo muestra Tipo/Hora/Motivo sin campo fecha ni early leave.
- Impacto: Si el encargado edita desde el expanded row, pierde la corrección de timezone y no puede marcar retiros autorizados.
- Fix: Eliminar el inline edit duplicado y reutilizar `EditEntryDialog` (que ya tiene todos los campos) para ambos flujos.

**P0-2: Dashboard "Solicitudes" linkea a Horarios en vez de Solicitudes**
- Reproduce: Dashboard → Pendientes → clic "Solicitudes de día libre" → lleva a `/equipo/horarios` en vez de `/tiempo/solicitudes`.
- Impacto: El encargado no encuentra dónde aprobar solicitudes pendientes.
- Fix: Cambiar link a `/tiempo/solicitudes`.

### P1 — Altos (impacto alto + probabilidad media)

**P1-1: No hay botón global "Agregar fichaje" en ClockInsPage**
- Impacto: Fricción operativa diaria, el encargado necesita muchos clics.
- Fix: Agregar botón `+ Fichaje manual` en el header de la página, abre `AddManualEntryForm` con selector de empleado + fecha.

**P1-2: EmployeeClockInsModal calcula horas distinto a Liquidación**
- Impacto: Confusión cuando el encargado ve un total en el modal y otro en Liquidación.
- Fix: Eliminar modal o reemplazar con deep link a ClockInsPage filtrado.

**P1-3: "Ver liquidación" en EmployeeExpandedRow muestra toast "próximamente"**
- Impacto: Feature que ya existe pero no está conectada.
- Fix: Navegar a `/tiempo/liquidacion` (la página ya funciona).

### P2 — Medios

**P2-1: Terminología inconsistente** — "Advertencias" (sidebar) vs "Apercibimientos" (todo el resto).

**P2-2: Íconos duplicados** — "Fichajes" y "Horarios" usan `Clock`. Cambiar uno (ej: `CalendarClock` para horarios).

**P2-3: AddManualEntryForm standalone** (`src/components/local/clockins/AddManualEntryForm.tsx`) tiene `early_leave_authorized` checkbox pero no se usa en ningún lugar visible. El inline form de `RosterExpandedRow` tiene su propia implementación sin ese campo.

---

## 6. PROPUESTA CONCRETA DE SIMPLIFICACIÓN

1. **Eliminar los 3 modales duplicados** de `EmployeeExpandedRow`: `EmployeeClockInsModal`, `EmployeeScheduleModal`, y el toast de liquidación. Reemplazarlos con links de navegación directa a las páginas del sidebar.

2. **Unificar edición de fichajes**: Eliminar el inline edit de `RosterExpandedRow` y siempre usar `EditEntryDialog` (que ya tiene fecha, early leave, y warning retroactivo).

3. **Agregar botón "Fichaje manual"** en el header de `ClockInsPage` que abra `AddManualEntryForm` con selector de empleado.

4. **Corregir link** del Dashboard pendientes: de `/equipo/horarios` a `/tiempo/solicitudes`.

5. **Normalizar terminología**: "Apercibimientos" en todos lados (sidebar incluido).

