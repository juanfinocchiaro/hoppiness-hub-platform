

## Separar Pedidos por Origen: Mostrador vs WebApp (Ciclo Completo)

### Problema actual

Cuando un pedido WebApp se acepta, desaparece del panel WebApp (que solo muestra `estado = 'pendiente'`) y pasa al `PendingOrdersBar` generico donde no hay chat ni contexto de cliente remoto. El cajero pierde la comunicacion con el cliente.

### Solucion

Dos paneles independientes, cada uno con su ciclo de vida completo separados por origen:

```text
+--------------------------------------------------+
| ShoppingBag  Pedidos Mostrador  2 prep   [Ocultar] |
|  PREPARANDO: #60 3m  #61 1m                        |
|  LISTOS:     #57 8m  [Entregar]                     |
+--------------------------------------------------+
+--------------------------------------------------+
| Globe  Pedidos WebApp            1 nuevo  [Ocultar] |
|                                                      |
|  NUEVO (pendiente)                                   |
|  #62 Retiro 1min Maria $11.600 [Aceptar][Rechazar][Chat] |
|                                                      |
|  PREPARANDO                                          |
|  #58 Retiro 8min Juan $15.500 [Marcar listo][Chat 1] |
|                                                      |
|  LISTO                                               |
|  #55 Delivery 15min Carlos $22.800 [Entregar][Chat]  |
|                                                      |
|  -- Ultimos entregados --                            |
|  #54 Ana $10.900 entregado  #53 Pedro $11.600        |
+--------------------------------------------------+
```

---

### Cambios por archivo

**1. `src/hooks/pos/useKitchen.ts`**
- Agregar `origen` al tipo `KitchenPedido` y al SELECT del query
- Cambio minimo: una linea en la interfaz, una en el select string

**2. `src/components/pos/PendingOrdersBar.tsx`**
- Filtrar pedidos: solo mostrar `origen !== 'webapp'` (y null, que son los del POS)
- Renombrar titulo: "Pedidos Mostrador" con icono `ShoppingBag`
- Envolver en `Card` con `CardHeader`/`CardContent` (mismo estilo rectangular que WebappOrdersPanel)
- Agregar estado `expanded` con boton "Mostrar/Ocultar"
- Auto-expandir cuando hay pedidos activos
- Mantener toda la logica existente de chips, estados, tickets, push, contador de hamburguesas
- Sin chat (el cliente esta fisicamente en el local)

**3. `src/components/pos/WebappOrdersPanel.tsx` -- CAMBIO PRINCIPAL**
- Agregar un segundo query `webapp-active-orders` para pedidos en curso:
  - estados: `confirmado`, `en_preparacion`, `listo`, `listo_retiro`, `listo_mesa`, `listo_envio`, `en_camino`
  - mismos campos que el query actual + `pedido_items`
  - `refetchInterval: 15000`
- Agregar mutation `updateEstado` con la misma logica que tiene PendingOrdersBar:
  - Timestamps: `tiempo_inicio_prep` al preparar, `tiempo_listo` al marcar listo
  - Impresion de tickets (delivery ticket + on_ready ticket)
  - Push notifications al cliente
  - Invalidar queries relevantes
- Renderizar 3 secciones dentro del CardContent:
  - **Nuevos** (pendientes): cards actuales con Aceptar/Rechazar + Chat (sin cambios)
  - **En curso** (confirmado/preparando/listo): cards con boton de avanzar estado + Chat
  - **Recientes** (entregados/cancelados): lista compacta sin chat (como esta hoy)
- Agregar hooks `usePrintConfig`, `useBranchPrinters`, `useAfipConfig` para la logica de tickets
- Agregar Realtime: suscripcion a cambios en pedidos webapp para invalidar queries instantaneamente

**4. `src/pages/pos/POSPage.tsx`**
- Filtrar pedidos antes de pasarlos a PendingOrdersBar:
  ```
  pedidos={(kitchenPedidos ?? []).filter(p => p.origen !== 'webapp')}
  ```
- Sin otros cambios, el orden de renderizado se mantiene igual

### Resumen de acciones por grupo en WebappOrdersPanel

| Grupo | Estados | Acciones | Chat |
|-------|---------|----------|------|
| Nuevos | pendiente | Aceptar / Rechazar | Si |
| En curso | confirmado, en_preparacion, listo, en_camino | Avanzar estado (Preparar, Listo, Entregar) | Si |
| Recientes | entregado, cancelado | Solo info | No |

### Dependencia de impresion

La logica de impresion de tickets se extraera de PendingOrdersBar y se replicara en WebappOrdersPanel (mismas llamadas a `printReadyTicketByPedidoId` y `printDeliveryTicketByPedidoId`). Ambos paneles usan los mismos hooks de configuracion (`usePrintConfig`, `useBranchPrinters`, `useAfipConfig`).

