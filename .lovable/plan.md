

## Plan: Reimpresion completa de tickets + Panel de pedidos pendientes en POS

### Resumen

Se implementan dos funcionalidades principales:
1. **Reimpresion de tickets desde el detalle del pedido**: Al expandir un pedido en el historial, se muestran botones individuales para reimprimir cada tipo de ticket que corresponda (Ticket cliente, Comanda cocina, Vale bebida, Ticket delivery, Factura electronica).
2. **Panel de pedidos pendientes sobre el POS**: Los cajeros ven los pedidos activos (pendientes/en preparacion/listos) en la parte superior del POS, pudiendo cambiar su estado sin necesidad de KDS ni pantalla adicional.

---

### Parte 1: Reimpresion de tickets desde historial

**Problema actual**: Solo existe un boton "Reimprimir" para la factura. No se puede reimprimir la comanda, el vale ni el ticket de delivery.

**Solucion**: Reemplazar el boton unico por una seccion de acciones de impresion con botones individuales:

- **Ticket cliente** (siempre disponible): Reimprime el ticket con precios.
- **Comanda cocina** (siempre disponible): Reimprime la comanda con items de tipo 'comanda'.
- **Vale bebida** (solo si hay items tipo 'vale'): Reimprime vales individuales.
- **Ticket delivery** (solo si `tipo_servicio === 'delivery'`): Reimprime el ticket con datos del cliente/direccion.
- **Factura electronica** (solo si tiene factura emitida): Reimprime el comprobante fiscal.

**Cambios**:

| Archivo | Cambio |
|---------|--------|
| `src/hooks/pos/usePosOrderHistory.ts` | Agregar `cliente_telefono`, `cliente_direccion`, `categoria_carta_id` a la query de pedidos e items |
| `src/components/pos/OrderHistoryTable.tsx` | Reemplazar `onReprintInvoice` por `onReprint(order, type)` con botones por tipo de ticket |
| `src/pages/local/SalesHistoryPage.tsx` | Actualizar la logica de reimpresion para soportar todos los tipos de ticket usando las funciones existentes de `escpos.ts` y `print-router.ts` |

---

### Parte 2: Panel de pedidos pendientes en el POS

**Problema actual**: Para ver y gestionar pedidos pendientes, el cajero necesita ir al KDS en otra pantalla. Algunos locales tienen una sola pantalla.

**Solucion**: Agregar una barra colapsable en la parte superior del POS que muestre pedidos activos (pendiente, en_preparacion, listo) con acciones rapidas.

**Diseno**:
- Barra horizontal arriba del grid del POS
- Chips/tarjetas compactas por pedido mostrando: numero, tiempo, estado, tipo servicio
- Tap en el chip permite cambiar estado: pendiente -> en_preparacion -> listo -> entregado
- Indicador con cantidad de pedidos pendientes
- Se usa la misma query realtime que usa el KDS

**Cambios**:

| Archivo | Cambio |
|---------|--------|
| `src/components/pos/PendingOrdersBar.tsx` | **Nuevo** - Componente barra de pedidos activos con chips interactivos |
| `src/pages/pos/POSPage.tsx` | Integrar `PendingOrdersBar` arriba del grid principal |
| `src/hooks/pos/useKitchen.ts` | Reutilizar el hook existente (ya tiene query realtime de pedidos) |

---

### Detalles tecnicos

**Reimpresion - flujo**:
1. El `OrderDetail` muestra una seccion "Reimprimir" con iconos por tipo
2. Al tocar un boton, se llama a `onReprint(order, 'comanda' | 'ticket' | 'vale' | 'delivery' | 'factura')`
3. En `SalesHistoryPage`, se reconstruye el `PrintableOrder` desde los datos del pedido y se llama a la funcion correspondiente de `escpos.ts` (`generateComandaCompleta`, `generateTicketCliente`, `generateValeBebida`, `generateComandaDelivery`, `generateTicketFiscal`)
4. El resultado base64 se envia al Print Bridge via `usePrinting`

**Pendientes en POS - flujo**:
1. Se usa `useKitchen(branchId)` para obtener pedidos activos en realtime
2. La barra muestra pedidos agrupados por estado con badges de color
3. Al tocar un pedido, un mini-modal o dropdown permite cambiar el estado
4. La mutacion reutiliza la logica de `updatePedidoEstado` del KDS

