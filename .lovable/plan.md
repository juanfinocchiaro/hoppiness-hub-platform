

# Auditoría DB vs prompt-7 — Lo que falta (solo DB, sin frontend)

## Estado verificado contra la base de datos real

### ✅ Completado
- **Fase 0** (tablas muertas), **Fase 1** (booleanos), **Fase 3** (58 tablas renombradas), **Fase 4** (3 enums migrados), **Fase 5** (3 vistas renombradas), **Fase 6** (29 funciones renombradas)
- `brand_role_type` / `local_role_type` no existen como enums PG (son TEXT) -- nada que migrar

### CRITICO: 5 funciones ROTAS en runtime

Estas funciones referencian tablas y columnas que **ya no existen** (fueron renombradas en fases anteriores). Cualquier trigger que las invoque **fallará**:

| Función | Trigger | Tabla trigger | Problema |
|---------|---------|---------------|----------|
| `sync_canon_liquidacion` | `trg_sync_canon_liquidacion` | `branch_monthly_sales` | Refs `canon_liquidaciones`, `pagos_canon`, `periodo`, `saldo_pendiente`, `estado`, `monto`, `venta_total`, `efectivo`, `cargado_por` |
| `sync_factura_to_canon` | `trg_sync_factura_to_canon` | `supplier_invoices` | Refs `canon_liquidaciones`, `saldo_pendiente`, `estado`, `periodo` |
| `sync_item_factura_to_rdo` | `trg_sync_item_rdo` | `invoice_items` | Refs `facturas_proveedores`, `insumos`, `conceptos_servicio`, `items_factura`, `monto` |
| `update_canon_saldo` | (on `canon_payments`) | `canon_payments` | Refs `pagos_canon`, `canon_liquidaciones`, `monto`, `saldo_pendiente`, `estado` |
| `set_canon_payment_unverified` | `trg_canon_payment_unverified` | `supplier_payments` | Refs `facturas_proveedores`, `proveedor_id` |

### ~20 columnas no-FK aún en español (Fase 2 incompleta)

| Tabla | Columna actual | Sugerido |
|-------|---------------|----------|
| `orders` | `cliente_nombre` | `customer_name` |
| `orders` | `cliente_telefono` | `customer_phone` |
| `orders` | `cliente_direccion` | `customer_address` |
| `orders` | `origen` | `source` |
| `canon_settlements` | `canon_porcentaje` | `canon_percentage` |
| `canon_settlements` | `canon_monto` | `canon_amount` |
| `canon_settlements` | `marketing_porcentaje` | `marketing_percentage` |
| `canon_settlements` | `marketing_monto` | `marketing_amount` |
| `canon_settlements` | `pago_vt_sugerido` | `suggested_transfer_payment` |
| `canon_settlements` | `pago_ft_sugerido` | `suggested_cash_payment` |
| `canon_settlements` | `fc_total` | `online_total` |
| `canon_settlements` | `ft_total` | `cash_total` |
| `branch_monthly_sales` | `fc_total` | `online_total` |
| `branch_monthly_sales` | `ft_total` | `cash_total` |
| `rdo_movimientos` | `origen` | `source` |
| `rdo_movimientos` | `datos_extra` | `extra_data` |
| `invoice_items` | `categoria_pl` | `pl_category` |
| `invoice_items` | `descuento_monto` | `discount_amount` |
| `invoice_items` | `iva_monto` | `vat_amount` |
| `manual_consumptions` | `categoria_pl` | `pl_category` |
| `supplies` | `categoria_pl` | `pl_category` |
| `item_modifiers` | `diferencia_precio` | `price_difference` |
| `webapp_order_messages` | `sender_nombre` | `sender_name` |

### FK columns en español (excluidas intencionalmente)

Documentadas en plan.md como alto impacto cascading -- no se tocan:
`pedido_id` (~8 tablas), `proveedor_id` (~6), `item_carta_id` (~10), `insumo_id` (~10), `socio_id` (2), `categoria_carta_id` (3), `canon_liquidacion_id` (1), `concepto_servicio_id`

### Vistas con columnas en español (en views, no tablas)

- `rdo_multivista_items_base`: `categoria_nombre`, `producto_nombre`, `pedido_id`
- `rdo_multivista_ventas_base`: `pedido_id`

---

## Plan de ejecución (3 migraciones SQL, sin frontend)

**Migración A** -- Renombrar ~23 columnas pendientes en tablas reales

**Migración B** -- Recrear las 5 funciones rotas con nombres en inglés y referencias a tablas/columnas actuales:
- `sync_canon_liquidacion` → `sync_canon_settlement` (body actualizado a `canon_settlements`, `canon_payments`, `period`, `pending_balance`, `status`, `amount`, etc.)
- `sync_factura_to_canon` → `sync_invoice_to_canon`
- `sync_item_factura_to_rdo` → `sync_invoice_item_to_rdo`
- `update_canon_saldo` → `update_canon_balance`
- `set_canon_payment_unverified` → mantener nombre (ya inglés) pero actualizar body
- Drop `is_socio_admin` (alias `is_partner_admin` ya existe)

Actualizar los 4 triggers para apuntar a las nuevas funciones.

**Migración C** -- Recrear las 2 vistas RDO con columnas renombradas

Actualizar `plan.md` al final.

