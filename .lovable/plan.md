

# Historial de Ventas POS con Mapa de Calor

## Resumen

Cuando el local tiene POS habilitado, la pagina Historial de Ventas se transforma completamente. Se organiza en **2 solapas (Tabs)**:

1. **Pedidos** -- Historial individual con filtros avanzados
2. **Mapa de calor** -- Visualizacion por dia/hora del volumen de pedidos

Los locales sin POS siguen viendo la vista actual de cierres de turno.

---

## Parte 1: Hook `usePosOrderHistory`

Archivo: `src/hooks/pos/usePosOrderHistory.ts`

Query principal:
```
pedidos (branch_id, rango de fechas, con pedido_items y pedido_pagos)
```

Campos disponibles en `pedidos` para filtrar:
- `canal_venta`: mostrador / apps
- `tipo_servicio`: takeaway / comer_aca / delivery
- `canal_app`: rappi / pedidos_ya / mp_delivery
- `estado`: pendiente / en_preparacion / listo / entregado / cancelado
- `cliente_nombre`, `numero_pedido` (busqueda texto)
- `created_at` (timestamps para el heatmap)

Campos en `pedido_pagos`:
- `metodo`: efectivo / tarjeta_debito / tarjeta_credito / mercadopago_qr / transferencia

Parametros del hook:
- `branchId`, `daysBack`
- Filtros opcionales: `canalVenta`, `tipoServicio`, `canalApp`, `metodoPago`, `estado`, `searchQuery`

Retorna:
- `orders` -- lista de pedidos con items y pagos anidados
- `totals` -- vendido total, cantidad pedidos, ticket promedio
- `isLoading`

Los filtros de metodo de pago se aplican client-side (un pedido puede tener pagos divididos).

---

## Parte 2: Hook `useOrderHeatmap`

Archivo: `src/hooks/pos/useOrderHeatmap.ts`

Query ligera que trae solo `created_at` y `total` de pedidos entregados en el rango de fechas.

Procesa los datos en una matriz de 7 dias x 24 horas (o franjas de 30 min si hay suficiente volumen). Cada celda tiene:
- Cantidad de pedidos
- Monto total
- Intensidad relativa (para el color)

---

## Parte 3: SalesHistoryPage (reescritura condicional)

La pagina detecta `usePosEnabled(branchId)`:

### Si POS habilitado:

Estructura con Tabs:

```
[Pedidos] [Mapa de calor]
```

**Tab Pedidos:**

Barra de filtros (componente `OrderHistoryFilters`):
- Rango (7/15/30 dias)
- Canal de venta: Todos / Mostrador / Apps
- Tipo de servicio: Todos / Takeaway / Comer aca / Delivery (visible si canal = mostrador o todos)
- Forma de pago: Todos / Efectivo / Debito / Credito / QR / Transferencia
- Estado: Todos / Entregado / Cancelado
- Busqueda libre (numero pedido o nombre cliente)
- Boton Excel

KPIs (inline, como los totales actuales):
- Total vendido (periodo filtrado)
- Cantidad de pedidos
- Ticket promedio

Tabla (componente `OrderHistoryTable`):
| # | Fecha/Hora | Canal | Servicio | Cliente | Items | Total | Pago | Estado |
Fila expandible al click con:
- Lista de items (nombre x cant = subtotal)
- Lista de pagos (metodo + monto)
- Descuento si aplica

**Tab Mapa de calor:**

Componente `OrderHeatmapChart`:
- Grilla visual: eje X = horas del dia (11-23), eje Y = dias de la semana (Lun-Dom)
- Cada celda coloreada por intensidad (verde claro a verde oscuro, o blanco a naranja)
- Tooltip al hover: "Martes 14hs: 12 pedidos, $180.000"
- Construido con divs + CSS grid (no requiere libreria extra, recharts no tiene heatmap nativo)
- Selector de metrica: Cantidad de pedidos / Monto vendido
- Mismo rango de fechas que la solapa de pedidos

### Si POS NO habilitado:

Se mantiene la vista actual de cierres (sin tabs, sin cambios).

---

## Parte 4: Componentes nuevos

| Archivo | Descripcion |
|---|---|
| `src/hooks/pos/usePosOrderHistory.ts` | Hook con query de pedidos y filtros |
| `src/hooks/pos/useOrderHeatmap.ts` | Hook para datos del mapa de calor |
| `src/components/pos/OrderHistoryFilters.tsx` | Barra de filtros responsiva |
| `src/components/pos/OrderHistoryTable.tsx` | Tabla con filas expandibles |
| `src/components/pos/OrderHeatmapChart.tsx` | Grilla de mapa de calor con CSS Grid |

## Parte 5: Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/pages/local/SalesHistoryPage.tsx` | Reescritura: detectar POS, tabs, renderizar vista POS o cierres |

---

## Parte 6: Detalle del Mapa de Calor

El mapa de calor usa CSS Grid puro (no libreria externa):

- 13 columnas (horas 11 a 23, el rango operativo de Hoppiness)
- 7 filas (Lunes a Domingo)
- Celda: div con `background-color` interpolado segun intensidad
- Tooltip nativo (Radix Tooltip) al hover
- Esquina superior izquierda: etiquetas de dias
- Parte superior: etiquetas de horas
- Debajo del grid: leyenda de color (Bajo -> Alto)

La intensidad se calcula como porcentaje del maximo: `valor / max * 100`, mapeado a una escala de opacidad o HSL.

---

## Parte 7: Mobile

- Filtros en filas wrap (2 por fila)
- Tabla de pedidos: columnas reducidas (# + Total + Estado), detalle al expandir
- Mapa de calor: scroll horizontal si no cabe, celdas mas pequenas
- KPIs en fila horizontal con scroll

