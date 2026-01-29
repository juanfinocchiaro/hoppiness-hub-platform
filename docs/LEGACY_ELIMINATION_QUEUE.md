# Cola de Eliminación de Código Legacy

Este documento lista elementos pendientes de eliminación que requieren coordinación o migración manual.

## Edge Functions a Eliminar

| Función | Razón | Dependencias |
|---------|-------|--------------|
| `attendance-token` | Escribe a attendance_records (legacy) | Ninguna activa |
| `create-web-order` | POS/WebApp no implementados | - |
| `webhook-orders` | POS/WebApp no implementados | - |
| `order-tracking` | POS/WebApp no implementados | - |
| `generate-invoice` | Facturación automática no implementada | - |
| `facturante-invoice` | Facturación automática no implementada | - |
| `generate-pos-thumbnail` | POS no implementado | - |
| `process-invoice` | No usado en código | - |

## Tablas a Eliminar

### Grupo: KDS (Kitchen Display System)
- `kds_settings`
- `kds_stations`
- `kds_tokens`

### Grupo: Productos (POS/WebApp no usados)
- `products`
- `product_categories`
- `modifier_groups`
- `modifier_options`
- `product_modifiers`
- `product_recipes`
- `product_allowed_channels`
- `branch_products`
- `branch_modifier_options`
- `branch_product_channel_availability`

### Grupo: Cash Registers (Sistema de caja automático)
- `cash_registers`
- `cash_register_movements`
- `cash_register_shifts`
- `cashier_discrepancy_history`

### Grupo: Attendance Legacy
- `attendance_records` (reemplazado por `clock_entries`)
- `attendance_tokens`
- `attendance_logs`

### Grupo: Orders (POS/WebApp no usados)
- `orders`
- `order_items`
- `order_status_history`

### Grupo: Otros
- `printers` (impresoras de cocina, no usadas)
- `channels` (canales de venta, no usados)
- `branch_channels`
- `daily_sales` (reemplazado por `shift_closures`)

## Imágenes a Eliminar

### Carpeta: `public/images/products/`
39 imágenes de productos del POS no usado.

### Carpeta: `public/images/modifiers/`
17 imágenes de modificadores del POS no usado.

## Notas

- **NO eliminar hasta confirmar** que ningún código activo depende de estos elementos
- Las tablas con datos históricos pueden requerir backup antes de eliminar
- Las Edge Functions deben eliminarse desde el panel de Lovable Cloud

---

*Última actualización: 2026-01-29*
