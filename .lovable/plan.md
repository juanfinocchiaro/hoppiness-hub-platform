

# Auditoría DB vs prompt-9 — Residuos pendientes (solo DB, sin frontend)

## Estado general

prompt-9 fue escrito ANTES de las migraciones masivas. El 95%+ ya se ejecutó. Lo que queda son **residuos no cubiertos** en prompts anteriores.

Verificación contra DB real (queries directas):
- **Tablas en español:** 0 pendientes (65/65 done)
- **Enums PG:** 0 pendientes (3/3 done: `order_area`, `payment_method`, `work_position_type`)
- **`brand_role_type` / `local_role_type`:** No existen como enums PG (son TEXT en `user_role_assignments`) -- nada que migrar
- **Vistas:** Todas renombradas
- **Funciones principales:** Todas renombradas

---

## PENDIENTE: 10 etapas de migración

### Etapa 1: `shift_closures` — 14 columnas en español

| Columna actual | Nuevo nombre |
|---|---|
| `hamburguesas` | `burgers` |
| `ventas_local` | `local_sales` |
| `ventas_apps` | `app_sales` |
| `total_facturado` | `total_invoiced` |
| `total_hamburguesas` | `total_burgers` |
| `total_vendido` | `total_sold` |
| `total_efectivo` | `total_cash` |
| `tiene_alerta_facturacion` | `has_invoicing_alert` |
| `tiene_alerta_posnet` | `has_posnet_alert` |
| `tiene_alerta_apps` | `has_apps_alert` |
| `tiene_alerta_caja` | `has_register_alert` |
| `arqueo_caja` | `register_reconciliation` |
| `diferencia_posnet` | `posnet_difference` |
| `diferencia_apps` | `apps_difference` |

`total_digital` ya está en inglés -- no se toca.

### Etapa 2: `register_shifts_legacy` — 10 columnas en español

| Columna actual | Nuevo nombre |
|---|---|
| `cajero_id` | `cashier_id` |
| `apertura_at` | `opened_at` |
| `fondo_apertura` | `opening_fund` |
| `cierre_at` | `closed_at` |
| `total_efectivo` | `total_cash` |
| `total_tarjeta_debito` | `total_debit` |
| `total_tarjeta_credito` | `total_credit` |
| `total_mercadopago` | `total_mercadopago` (OK) |
| `total_transferencia` | `total_transfer` |
| `total_ventas` | `total_sales` |
| `diferencia` | `difference` |
| `diferencia_motivo` | `difference_reason` |
| `retiros_efectivo` | `cash_withdrawals` |

### Etapa 3: `cash_register_movements` — 2 columnas

| Columna actual | Nuevo nombre |
|---|---|
| `categoria_gasto` | `expense_category` |
| `notes_extra` | `extra_notes` |

### Etapa 4: `service_concepts` + `item_modifiers` — 2 columnas sueltas

| Tabla | Columna actual | Nuevo nombre |
|---|---|---|
| `service_concepts` | `categoria_gasto` | `expense_category` |
| `item_modifiers` | `diferencia_costo` | `cost_difference` |

### Etapa 5: Actualizar función `sync_expense_movement`

El body referencia `NEW.categoria_gasto` y `NEW.notes_extra` de `cash_register_movements`. Tras renombrar en etapa 3, hay que recrear la función con `NEW.expense_category` y `NEW.extra_notes`.

### Etapa 6: Verificar y actualizar funciones que referencien columnas renombradas

Verificar que `sync_expense_to_rdo`, `sync_consumption_to_rdo`, y otras funciones no referencien las columnas renombradas en etapas 1-4. (Ya verificado: `sync_expense_to_rdo` está limpia.)

### Etapa 7: Renombrar ~25 RLS policies con nombres en español

Políticas detectadas con nombres en español:

| Policy actual | Tabla | Sugerido |
|---|---|---|
| `gastos_select` | `expenses` | `expenses_select` |
| `gastos_insert` | `expenses` | `expenses_insert` |
| `gastos_update` | `expenses` | `expenses_update` |
| `gastos_delete_admin` | `expenses` | `expenses_delete_admin` |
| `items_factura_select` | `invoice_items` | `invoice_items_select` |
| `items_factura_insert` | `invoice_items` | `invoice_items_insert` |
| `items_factura_update` | `invoice_items` | `invoice_items_update` |
| `items_factura_delete` | `invoice_items` | `invoice_items_delete` |
| `pago_factura_select` | `invoice_payment_links` | `invoice_payment_links_select` |
| `pago_factura_insert` | `invoice_payment_links` | `invoice_payment_links_insert` |
| `pago_factura_delete` | `invoice_payment_links` | `invoice_payment_links_delete` |
| `franquiciado_afip_config` | `afip_config` | `franchisee_afip_config` |
| `franquiciado_insert_facturas` | `issued_invoices` | `franchisee_insert_invoices` |
| `movimientos_socio_insert` | `partner_movements` | `partner_movements_insert` |
| `movimientos_socio_select` | `partner_movements` | `partner_movements_select` |
| `socios_select` | `partners` | `partners_select` |
| `socios_update` | `partners` | `partners_update` |
| `socios_insert` | `partners` | `partners_insert` |
| `Staff can manage pedido_item_modificadores` | `order_item_modifiers` | `Staff can manage order_item_modifiers` |
| `Staff can manage pedido_items` | `order_items` | `Staff can manage order_items` |
| `Staff delete pedido_pagos` | `order_payments` | `Staff delete order_payments` |
| `Staff insert pedido_pagos_with_shift` | `order_payments` | `Staff insert order_payments_with_shift` |
| `Staff select pedido_pagos` | `order_payments` | `Staff select order_payments` |
| `Staff update pedido_pagos` | `order_payments` | `Staff update order_payments` |
| `Staff can manage stock_movimientos` | `stock_movements` | `Staff can manage stock_movements` |

Acción: DROP + CREATE de cada policy, preservando el USING/WITH CHECK exacto.

### Etapa 8: Actualizar RLS policies que referencian aliases legacy

Las 7 RLS policies que usan `is_franquiciado_or_contador_for_branch` y `is_socio_admin` deben actualizarse para usar directamente `is_franchisee_or_accountant_for_branch` y `is_partner_admin`.

### Etapa 9: Drop function aliases legacy

Una vez que ninguna RLS policy las referencie (tras etapa 8):
- `DROP FUNCTION is_franquiciado_or_contador_for_branch`
- `DROP FUNCTION is_socio_admin`

### Etapa 10: Actualizar `plan.md`

Documentar todo como completado. Marcar migración de idioma como **100% completada** (excluyendo FKs documentadas: `pedido_id`, `proveedor_id`, `item_carta_id`, `insumo_id`, `socio_id`, `categoria_carta_id`).

---

## Resumen ejecutivo

| Categoría | Pendiente |
|---|---|
| Columnas en español | ~28 (shift_closures 14, register_shifts_legacy 12, cash_register_movements 2, service_concepts 1, item_modifiers 1) |
| Funciones por actualizar body | 1 (`sync_expense_movement`) |
| RLS policies con nombre en español | ~25 |
| Function aliases legacy | 2 |
| Tablas | 0 |
| Vistas | 0 |
| Enums | 0 |

Todo es SQL puro. Sin tocar frontend.

