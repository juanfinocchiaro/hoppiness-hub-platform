

# Fix: Imprimir directamente a la impresora termica sin preguntar

## Problema
Los 4 handlers de impresion (Reimprimir Comprobante, Informe X, Cierre Z, Auditoria) verifican si el Print Bridge esta conectado. Si no lo detectan, abren una ventana del navegador con `window.print()`, que muestra el dialogo nativo de Chrome "Guardar como PDF".

El usuario quiere que siempre se envie a la impresora termica configurada automaticamente.

## Solucion
Modificar los 4 `handlePrint` en `FiscalReportsPage.tsx`:

1. **Intentar siempre la impresora termica** sin verificar `bridgeStatus`
2. Si no hay impresora configurada (`ticket_printer_id` null o impresora inactiva), mostrar un toast de error claro: "No hay impresora de tickets configurada. Anda a Configuracion > Impresoras."
3. Si la impresion falla (bridge caido, impresora apagada), mostrar el error especifico del bridge
4. **Eliminar completamente** el fallback `window.open` + `window.print()` de los 4 handlers

## Detalle tecnico

En `FiscalReportsPage.tsx`, las 4 funciones afectadas:

| Funcion | Lineas | Seccion |
|---------|--------|---------|
| `InformeXCard.handlePrint` | 115-158 | Informe X |
| `CierreZCard.handlePrint` | 308-349 | Cierre Z |
| `AuditoriaCard.handlePrint` | 502-538 | Auditoria |
| `ReimprimirCard.handleReprint` | 662-808 | Reimprimir Comprobante |

Cada una se simplifica a:
```
const ticketPrinter = findConfiguredPrinter();
if (!ticketPrinter) {
  toast.error('No hay impresora de tickets configurada');
  return;
}
try {
  const base64 = generateXXX(...);
  await printRawBase64(ticketPrinter.ip_address, ticketPrinter.port, base64);
  toast.success('Impreso correctamente');
} catch (e) {
  toast.error('Error al imprimir: ' + e.message);
}
```

Se eliminan todos los bloques `else { window.open... window.print() }`.
