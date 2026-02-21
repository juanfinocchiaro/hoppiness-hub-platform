# Data Source Audit

Mapeo de pantallas a fuentes de datos, con inconsistencias identificadas.

## Pantallas y Fuentes de Datos

### 1. Historial de Ventas (`SalesHistoryPage`)

| Modo | Hook | Tabla(s) |
|------|------|----------|
| POS habilitado | `usePosOrderHistory` | `pedidos` + `pedido_items` + `pedido_pagos` + `facturas_emitidas` |
| Sin POS | `useClosuresByDateRange` | `shift_closures` |

**Cálculos:** totalVendido, ticketPromedio, breakdown por canal y medio de pago (client-side).

---

### 2. Cierre de Turno (`CierreTurnoPage`)

| Hook | Tabla(s) |
|------|----------|
| Queries directas | `pedidos` + `pedido_items` + `pedido_pagos` + `cash_register_shifts` + `cash_registers` |

**Cálculos:** totalSales, avgTicket, paymentBreakdown, channelBreakdown, productBreakdown (todos client-side).

**Filtros:** Solo pedidos no cancelados. Turnos filtrados por `opened_at`.

---

### 3. Resultado Económico (`RdoDashboard` / `PLDashboardPage`)

| Hook | Tabla(s) | Condición |
|------|----------|-----------|
| `useVentasManual` | `ventas_mensuales_local` | Sin POS |
| `usePosVentasAgregadas` | `pedidos` + `pedido_pagos` | Con POS |
| `useRdoReport` | `rdo_report_data` view → `items_factura`, `facturas_proveedores`, `gastos`, `consumos_manuales` | Siempre |
| `usePromoDiscountData` | `pedidos` + `pedido_items` | Con POS |

**Cálculos:**
- Ventas = fc_total + ft_total (manual) o sum(pedido_pagos.monto) (POS)
- resultadoOperativo = totalVentas - totalCostos
- contribuciónMarginal = totalVentas - costosVariables

---

### 4. Resultado Financiero (`RdoFinancieroDashboard` / `RdoFinancieroPage`)

| Hook | Tabla(s) |
|------|----------|
| `useRdoFinanciero` | `pedido_pagos`, `pagos_proveedores`, `gastos` (pagados), `salary_advances`, `movimientos_socio`, `inversiones` |

**Cálculos:** Todos server-side en `get_rdo_financiero()`.

---

### 5. RDO Multivista (`RdoMultivistaPage`)

| Hook | Tabla(s) |
|------|----------|
| `useRdoMultivista` | `pedidos` + `pedido_items` + `pedido_pagos` + `facturas_emitidas` + `items_carta` + `menu_categorias` |

**Cálculos:** Server-side en `get_rdo_multivista()`. Food cost por categoría/producto.

---

### 6. Ventas Mensuales (`VentasMensualesLocalPage`)

| Modo | Hook | Tabla(s) |
|------|------|----------|
| Sin POS | `useVentasMensuales` | `ventas_mensuales_local` |
| Con POS | `usePosVentasAgregadas` | `pedidos` + `pedido_pagos` |

**Cálculos:** online = ventaTotal - efectivo, pctEf, canonTotal (client-side).

---

### 7. Consumos (`ConsumosPage`)

| Hook | Tabla(s) |
|------|----------|
| `useConsumosManuales` | `consumos_manuales` |

Alimenta `rdo_movimientos` para el RDO económico.

---

### 8. Compras (`ComprasPage`)

| Hook | Tabla(s) |
|------|----------|
| `useFacturas` | `facturas_proveedores` + `items_factura` + `proveedores` + `insumos` + `conceptos_servicio` |

Alimenta `rdo_report_data` para el RDO económico vía `rdo_category_code`.

---

### 9. Stock (`StockPage`)

| Hook | Tabla(s) |
|------|----------|
| `useStockCompleto` / `useStockResumen` | `insumos` + `stock_actual` + `stock_movimientos` + `categorias_insumo` |

**Cálculos:** Estado (ok/bajo/critico/sin_stock) basado en umbrales locales o de marca.

---

### 10. Caja (`RegisterPage`)

| Hook | Tabla(s) |
|------|----------|
| `useCashRegistersByType` | `cash_registers` |
| `useCashShifts` | `cash_register_shifts` |
| `useCashMovements` | `cash_register_movements` |

**Cálculos:** expectedCash = opening_amount + ingresos_efectivo - egresos_efectivo (client-side).

---

### 11. Socios (`SociosPage`)

| Hook | Tabla(s) |
|------|----------|
| `useSocios` | `socios` |
| `useMovimientosSocio` | `movimientos_socio` |

**Cálculos:** totalPorcentaje (client-side), saldo_acumulado (running balance).

---

### 12. Cuenta Corriente Proveedor (`CuentaCorrienteProveedorPage`)

| Hook | Tabla(s) |
|------|----------|
| `useResumenProveedor` | `facturas_proveedores` + `pagos_proveedores` + `pago_factura` |
| `useMovimientosProveedor` | `facturas_proveedores` + `pagos_proveedores` |

**Cálculos:** saldo_actual = total_facturado - total_pagado (client-side).

---

## Inconsistencias Identificadas

### 1. Filtrado de estados de pedidos
- `CierreTurnoPage`: excluye `cancelado`
- `usePosVentasAgregadas`: solo incluye `entregado` y `listo`
- `SalesHistoryPage`: muestra todos los estados con filtros opcionales
- **Impacto:** Los totales de ventas pueden diferir entre pantallas.
- **Recomendación:** Unificar criterio: usar `estado NOT IN ('cancelado')` consistentemente para reportes.

### 2. Fuente dual POS/Manual
- Varias pantallas (VentasMensuales, RdoDashboard) alternan entre POS y manual.
- **Impacto:** Si `posEnabled` cambia mid-period, los datos se pierden.
- **Recomendación:** Una vez activado POS, siempre usar datos POS.

### 3. Cálculos client-side vs server-side
- Cierre de turno, ventas mensuales, caja: cálculos en frontend.
- RDO, Multivista: cálculos en SQL functions.
- **Impacto:** Resultados inconsistentes por redondeo o lógica divergente.
- **Recomendación:** Migrar cálculos críticos a server-side (SQL functions).

### 4. Soft-deletes
- Tablas con `deleted_at`: facturas_proveedores, gastos, consumos_manuales, movimientos_socio, inversiones.
- **Impacto:** Queries sin filtro `deleted_at IS NULL` incluyen datos borrados.
- **Recomendación:** Auditar todos los queries para asegurar filtro de soft-delete.

### 5. Fechas UTC vs local
- Algunos queries usan `created_at` (UTC), otros usan `fecha` (date sin timezone).
- **Impacto:** Pedidos cerca de medianoche pueden aparecer en día incorrecto.
- **Recomendación:** Usar timezone-aware dates consistentemente.

### 6. RDO category codes
- Las `items_factura` y `gastos` requieren `rdo_category_code` para alimentar el RDO.
- **Impacto:** Registros sin code no aparecen en el RDO económico.
- **Recomendación:** Validar en la creación que el code sea requerido.
