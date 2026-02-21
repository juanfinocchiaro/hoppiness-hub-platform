

# Correcciones en Reportes Fiscales

## Problema 1: Informe X sin selector de fecha

El Informe X siempre consulta el dia actual. No hay forma de elegir otra fecha.

### Solucion
Agregar un selector de fecha en la card de Informe X. Al hacer clic, en vez de generar directamente, abrir un mini dialog que permita elegir la fecha y luego generar. Por defecto se precarga la fecha de hoy.

### Cambios en `FiscalReportsPage.tsx`
- En `InformeXCard`: agregar state `selectedDate` y un dialog previo con input date
- Pasar la fecha seleccionada a `xReport.mutateAsync(selectedDate)`

---

## Problema 2: Botones "Imprimir" deshabilitados sin Print Bridge

Los botones de imprimir en X, Z y Auditoria estan condicionados a `printing.bridgeStatus !== 'connected'`. Como el bridge solo funciona en localhost, desde el preview nunca se puede imprimir.

### Solucion
Aplicar el mismo patron de fallback (window.print con HTML formateado) que ya se implemento en Reimprimir. Quitar el `disabled` de todos los botones de impresion y agregar fallback a window.print cuando el bridge no esta conectado.

### Cambios en `FiscalReportsPage.tsx`
- `InformeXCard.handlePrint`: quitar disabled, agregar fallback window.print
- `CierreZCard.handlePrint`: quitar disabled, agregar fallback window.print
- `AuditoriaCard.handlePrint`: quitar disabled, agregar fallback window.print
- Lineas afectadas: 148, 315, 334, 506

---

## Problema 3: Cierre Z automatico por turno

Actualmente el Z es manual y se genera por dia completo. El usuario quiere que sea automatico al cerrar cada turno.

### Solucion
Integrar la generacion del Z con el cierre de turno (shift_closures). Cuando se guarda el ultimo turno activo del dia, ofrecer automaticamente generar el Cierre Z.

**Enfoque:** No hacer el Z completamente automatico (requiere confirmacion por razones fiscales/legales). En su lugar:
- Cuando se cierra el ultimo turno del dia, mostrar un prompt: "Todos los turnos del dia estan cerrados. Generar Cierre Z?"
- Si acepta, se genera el Z automaticamente
- Esto se implementa en el `ManagerDashboard` o en el modal de cierre de turno

### Cambios
- En `ManagerDashboard.tsx`: detectar cuando todos los turnos activos del dia tienen cierre. Mostrar banner/boton "Generar Cierre Z del dia"
- Reutilizar `useGenerateZClosing` existente

---

## Resumen tecnico de cambios

| Archivo | Cambio |
|---------|--------|
| `FiscalReportsPage.tsx` | Selector de fecha para X, quitar disabled de botones, agregar fallback window.print en X/Z/Auditoria |
| `ManagerDashboard.tsx` | Banner "Generar Cierre Z" cuando todos los turnos estan cerrados |

No se requieren migraciones SQL. Las funciones `get_fiscal_x_report` y `generate_z_closing` ya aceptan parametro de fecha.

