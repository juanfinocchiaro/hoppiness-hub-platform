

# Auditoría de Idioma y Convenciones de Nombres — Schema Completo

## 7. AUDITORÍA DE IDIOMA

Se revisaron 127 tablas, ~1200 columnas, 17 enums y 151 políticas RLS. A continuación cada caso de español, spanglish o inconsistencia.

---

### 7.1 TABLAS EN ESPAÑOL

| # | Nombre actual | Sugerido (inglés) | Breaking change |
|---|---|---|---|
| 1 | `canales_venta` | `sales_channels` | Sí — frontend + DB fns |
| 2 | `canon_liquidaciones` | `canon_settlements` | Sí — triggers + frontend |
| 3 | `categorias_insumo` | `supply_categories` | Sí |
| 4 | `categorias_preparacion` | `recipe_categories` | Sí |
| 5 | `cliente_direcciones` | `customer_addresses` | Sí |
| 6 | `codigos_descuento` | `discount_codes` | Sí |
| 7 | `codigos_descuento_usos` | `discount_code_uses` | Sí |
| 8 | `conceptos_servicio` | `service_concepts` | Sí |
| 9 | `configuracion_impuestos` | `tax_config` | Sí — DB fn `get_iibb_alicuota` |
| 10 | `consumos_manuales` | `manual_consumptions` | Sí |
| 11 | `devoluciones` | `returns` | Bajo — solo types.ts |
| 12 | `distribuciones_utilidades` | `profit_distributions` | Bajo — solo trigger |
| 13 | `facturas_emitidas` | `issued_invoices` | Sí — edge fn + fiscal |
| 14 | `facturas_proveedores` | `supplier_invoices` | Sí — heavy use |
| 15 | `gastos` | `expenses` | Sí — trigger + RDO |
| 16 | `insumos` | `supplies` | Sí — core |
| 17 | `insumos_costos_historial` | `supply_cost_history` | Bajo — trigger only |
| 18 | `inversiones` | `investments` | Sí |
| 19 | `items_carta` | `menu_items` | Sí — core |
| 20 | `item_carta_composicion` | `menu_item_compositions` | Sí |
| 21 | `item_carta_extras` | `menu_item_extras` | Sí |
| 22 | `item_carta_grupo_opcional` | `menu_item_option_groups` | Sí |
| 23 | `item_carta_grupo_opcional_items` | `menu_item_option_group_items` | Sí |
| 24 | `item_carta_precios_historial` | `menu_item_price_history` | Sí |
| 25 | `item_extra_asignaciones` | `extra_assignments` | Sí |
| 26 | `item_modificadores` | `item_modifiers` | Sí |
| 27 | `item_removibles` | `removable_items` | Sí |
| 28 | `items_factura` | `invoice_items` | Sí |
| 29 | `llamadores` | `pagers` | Bajo |
| 30 | `cadetes` | `delivery_drivers` | Bajo |
| 31 | `menu_categorias` | `menu_categories` | Sí |
| 32 | `menu_combos` | `menu_combos` | No — orphaned |
| 33 | `menu_fichas_tecnicas` | `menu_tech_sheets` | Bajo — legacy |
| 34 | `menu_precios` | `menu_prices` | Bajo — legacy |
| 35 | `menu_precios_historial` | `menu_price_history` | No — orphaned |
| 36 | `menu_productos` | `menu_products` | Bajo — legacy |
| 37 | `movimientos_socio` | `partner_movements` | Bajo |
| 38 | `pago_factura` | `invoice_payments` | Bajo |
| 39 | `pagos_canon` | `canon_payments` | Sí |
| 40 | `pagos_proveedores` | `supplier_payments` | Sí |
| 41 | `pedido_item_modificadores` | `order_item_modifiers` | Bajo |
| 42 | `pedido_items` | `order_items` | Sí |
| 43 | `pedido_pagos` | `order_payments` | Sí |
| 44 | `pedido_payment_edits` | `order_payment_edits` | Bajo |
| 45 | `pedidos` | `orders` | Sí — heavy use |
| 46 | `periodos` | `periods` | Sí |
| 47 | `preparacion_ingredientes` | `recipe_ingredients` | Sí |
| 48 | `preparacion_opciones` | `recipe_options` | Bajo |
| 49 | `preparaciones` | `recipes` | Sí — core |
| 50 | `promocion_item_extras` | `promotion_item_extras` | Sí |
| 51 | `promocion_items` | `promotion_items` | Sí |
| 52 | `promociones` | `promotions` | Sí |
| 53 | `proveedor_condiciones_local` | `supplier_branch_terms` | Bajo |
| 54 | `proveedores` | `suppliers` | Sí |
| 55 | `socios` | `partners` | Sí |
| 56 | `turnos_caja` | `register_shifts_legacy` | Bajo — legacy |
| 57 | `ventas_mensuales_local` | `branch_monthly_sales` | Sí |
| 58 | `webapp_pedido_mensajes` | `webapp_order_messages` | Bajo |
| 59 | `webapp_customers` | OK (inglés) | — |

**Total tablas en español o spanglish: 58 de 127**

---

### 7.2 COLUMNAS EN ESPAÑOL (selección representativa por tabla)

| Tabla | Columna actual | Sugerido |
|---|---|---|
| `afip_config` | `razon_social` | `business_name` |
| `afip_config` | `direccion_fiscal` | `fiscal_address` |
| `afip_config` | `inicio_actividades` | `activity_start_date` |
| `afip_config` | `clave_privada_enc` | `encrypted_private_key` |
| `afip_config` | `estado_conexion` | `connection_status` |
| `afip_config` | `ultimo_error` | `last_error` |
| `afip_config` | `ultima_verificacion` | `last_verified_at` |
| `afip_config` | `ultimo_nro_factura_a/b/c` | `last_invoice_number_a/b/c` |
| `afip_config` | `es_produccion` | `is_production` |
| `afip_config` | `estado_certificado` | `certificate_status` |
| `afip_config` | `reglas_facturacion` | `billing_rules` |
| `afip_errores_log` | `tipo_error` | `error_type` |
| `afip_errores_log` | `codigo_afip` | `afip_code` |
| `afip_errores_log` | `mensaje` | `message` |
| `canales_venta` | `codigo` | `code` |
| `canales_venta` | `nombre` | `name` |
| `canales_venta` | `es_base` | `is_base` |
| `canales_venta` | `activo` | `is_active` |
| `canales_venta` | `orden` | `sort_order` |
| `canon_liquidaciones` | `periodo` | `period` |
| `canon_liquidaciones` | `porcentaje_ft` | `cash_percentage` |
| `canon_liquidaciones` | `saldo_pendiente` | `pending_balance` |
| `canon_liquidaciones` | `fecha_vencimiento` | `due_date` |
| `canon_liquidaciones` | `observaciones` | `notes` |
| `categorias_insumo` | `nombre` | `name` |
| `categorias_insumo` | `descripcion` | `description` |
| `categorias_insumo` | `activo` | `is_active` |
| `categorias_insumo` | `orden` | `sort_order` |
| `cliente_direcciones` | `etiqueta` | `label` |
| `cliente_direcciones` | `direccion` | `address` |
| `cliente_direcciones` | `piso` | `floor` |
| `cliente_direcciones` | `referencia` | `reference` |
| `cliente_direcciones` | `ciudad` | `city` |
| `cliente_direcciones` | `latitud` | `latitude` |
| `cliente_direcciones` | `longitud` | `longitude` |
| `cliente_direcciones` | `es_principal` | `is_primary` |
| `codigos_descuento` | `codigo` | `code` |
| `codigos_descuento` | `activo` | `is_active` |
| `items_carta` | `nombre` | `name` |
| `items_carta` | `nombre_corto` | `short_name` |
| `items_carta` | `descripcion` | `description` |
| `items_carta` | `imagen_url` | `image_url` |
| `items_carta` | `precio_base` | `base_price` |
| `items_carta` | `activo` | `is_active` |
| `items_carta` | `visible_carta` | `is_visible_menu` |
| `items_carta` | `visible_pos` | `is_visible_pos` |
| `items_carta` | `visible_webapp` | `is_visible_webapp` |
| `insumos` | `nombre` | `name` |
| `insumos` | `unidad_base` | `base_unit` |
| `insumos` | `costo_por_unidad_base` | `base_unit_cost` |
| `pedidos` | `numero_dia` | `daily_number` |
| `pedidos` | `nombre_cliente` | `customer_name` |
| `pedidos` | `telefono_cliente` | `customer_phone` |
| `pedidos` | `direccion_entrega` | `delivery_address` |
| `pedidos` | `tiempo_estimado` | `estimated_time` |
| `pedidos` | `notas` | `notes` |
| `pedido_items` | `nombre_item` | `item_name` |
| `pedido_items` | `cantidad` | `quantity` |
| `pedido_items` | `precio_unitario` | `unit_price` |
| `pedido_pagos` | `metodo` | `method` |
| `pedido_pagos` | `monto` | `amount` |
| `preparaciones` | `nombre` | `name` |
| `preparaciones` | `rendimiento` | `yield` |
| `preparaciones` | `costo_calculado` | `calculated_cost` |
| `preparaciones` | `costo_manual` | `manual_cost` |
| `proveedores` | `nombre` | `name` |
| `proveedores` | `telefono` | `phone` |
| `proveedores` | `direccion` | `address` |
| `proveedores` | `condicion_iva` | `tax_status` |
| `promociones` | `nombre` | `name` |
| `promociones` | `activa` | `is_active` |
| `socios` | `nombre` | `name` |
| `socios` | `porcentaje_participacion` | `ownership_percentage` |
| `socios` | `activo` | `is_active` |
| `gastos` | `concepto` | `concept` |
| `gastos` | `monto` | `amount` |
| `gastos` | `fecha` | `date` |
| `gastos` | `medio_pago` | `payment_method` |
| `gastos` | `observaciones` | `notes` |
| `cadetes` | `nombre` | `name` |
| `cadetes` | `telefono` | `phone` |
| `cadetes` | `activo` | `is_active` |
| `cadetes` | `disponible` | `is_available` |
| `cadetes` | `pedidos_hoy` | `orders_today` |
| `item_carta_precios_historial` | `precio_anterior` | `previous_price` |
| `item_carta_precios_historial` | `precio_nuevo` | `new_price` |
| `item_carta_precios_historial` | `motivo` | `reason` |
| `item_carta_precios_historial` | `usuario_id` | `user_id` |
| `item_modificadores` | `nombre` | `name` |
| `item_modificadores` | `cantidad_ahorro` | `savings_quantity` |
| `item_modificadores` | `unidad_ahorro` | `savings_unit` |
| `item_modificadores` | `costo_ahorro` | `savings_cost` |
| `item_modificadores` | `cantidad_extra` | `extra_quantity` |
| `item_modificadores` | `unidad_extra` | `extra_unit` |
| `item_modificadores` | `precio_extra` | `extra_price` |
| `item_modificadores` | `costo_extra` | `extra_cost` |
| `item_modificadores` | `activo` | `is_active` |
| `item_modificadores` | `orden` | `sort_order` |
| `item_removibles` | `nombre_display` | `display_name` |
| `item_removibles` | `activo` | `is_active` |
| `facturas_proveedores` | `factura_tipo` | `invoice_type` |
| `facturas_proveedores` | `factura_numero` | `invoice_number` |
| `facturas_proveedores` | `factura_fecha` | `invoice_date` |
| `facturas_proveedores` | `condicion_pago` | `payment_terms` |
| `facturas_proveedores` | `saldo_pendiente` | `pending_balance` |
| `facturas_proveedores` | `motivo_extraordinaria` | `extraordinary_reason` |
| `facturas_proveedores` | `observaciones` | `notes` |
| `items_factura` | `cantidad` | `quantity` |
| `items_factura` | `unidad` | `unit` |
| `items_factura` | `precio_unitario` | `unit_price` |
| `pagos_proveedores` | `fecha_pago` | `payment_date` |
| `pagos_proveedores` | `monto` | `amount` |
| `pagos_proveedores` | `medio_pago` | `payment_method` |
| `pagos_proveedores` | `observaciones` | `notes` |
| `pagos_proveedores` | `verificado` | `is_verified` |
| `pagos_proveedores` | `fecha_vencimiento_pago` | `payment_due_date` |
| `pagos_canon` | `fecha_pago` | `payment_date` |
| `pagos_canon` | `monto` | `amount` |
| `pagos_canon` | `medio_pago` | `payment_method` |
| `pagos_canon` | `observaciones` | `notes` |
| `pagos_canon` | `verificado` | `is_verified` |
| `movimientos_socio` | `fecha` | `date` |
| `movimientos_socio` | `monto` | `amount` |
| `movimientos_socio` | `detalle` | `details` |
| `movimientos_socio` | `saldo_acumulado` | `cumulative_balance` |
| `ventas_mensuales_local` | `periodo` | `period` |
| `ventas_mensuales_local` | `venta_total` | `total_sales` |
| `ventas_mensuales_local` | `efectivo` | `cash` |
| `ventas_mensuales_local` | `cargado_por` | `loaded_by` |
| `shift_closures` | `fecha` | `date` |
| `shift_closures` | `turno` | `shift` |
| `shift_closures` | `notas` | `notes` |
| `shift_closures` | `cerrado_por` | `closed_by` |
| `shift_closures` | `fuente` | `source` |

**(~150+ columnas en español en total — listado parcial por brevedad)**

---

### 7.3 ENUMS EN ESPAÑOL / SPANGLISH

| Enum type | Valores en español | Sugerido |
|---|---|---|
| `brand_role_type` | `superadmin, coordinador, informes, contador_marca, community_manager` | `superadmin, coordinator, reports, brand_accountant, community_manager` |
| `local_role_type` | `franquiciado, encargado, contador_local, cajero, empleado` | `franchisee, manager, local_accountant, cashier, employee` |
| `payment_method` | `efectivo, tarjeta_debito, tarjeta_credito, mercadopago_qr, mercadopago_link, transferencia, vales` | `cash, debit_card, credit_card, mercadopago_qr, mercadopago_link, transfer, vouchers` |
| `work_position_type` | `cajero, cocinero, barista, runner, lavacopas` | `cashier, cook, barista, runner, dishwasher` |
| `stock_movement_type` | OK (inglés) | — |
| `order_type` | OK (inglés) | — |
| `order_area` | `salon, mostrador, delivery` | `dine_in, counter, delivery` |
| `communication_type` | OK (inglés) | — |
| `permission_scope` | OK (inglés) | — |

---

## 8. VIOLACIONES DE CONVENCIONES DE NOMBRES

### 8.1 Tablas — Violaciones

| Regla violada | Tabla | Problema |
|---|---|---|
| Idioma | 58 tablas listadas arriba | Nombres en español |
| Singular vs plural | `pago_factura` | Singular, debería ser `invoice_payments` |
| Sufijo `_v2` | `user_roles_v2` | Versioning en nombre de tabla |
| Inconsistencia prefijo | `item_carta_*` vs `items_carta` | Singular/plural mezclados para mismo concepto |
| Spanglish | `pedido_payment_edits` | Mezcla español (`pedido`) + inglés (`payment_edits`) |
| Spanglish | `webapp_pedido_mensajes` | Mezcla inglés + español |

### 8.2 Columnas — Violaciones recurrentes

| Regla | Violación | Tablas afectadas | Corrección |
|---|---|---|---|
| Booleanos sin `is_`/`has_` | `activo` | ~15 tablas | `is_active` |
| Booleanos sin `is_`/`has_` | `disponible` | `cadetes` | `is_available` |
| Booleanos sin `is_`/`has_` | `verificado` | `pagos_proveedores`, `pagos_canon` | `is_verified` |
| Booleanos sin `is_`/`has_` | `es_produccion` | `afip_config` | `is_production` |
| Booleanos sin `is_`/`has_` | `es_base` | `canales_venta` | `is_base` |
| Booleanos sin `is_`/`has_` | `es_principal` | `cliente_direcciones` | `is_primary` |
| Booleanos sin `is_`/`has_` | `es_removible` | `item_carta_composicion` | `is_removable` |
| Booleanos sin `is_`/`has_` | `es_obligatorio` | `item_carta_grupo_opcional` | `is_required` |
| Booleanos sin `is_`/`has_` | `es_intercambiable` | `preparaciones` | `is_interchangeable` |
| FK naming | `usuario_id` | `item_carta_precios_historial` | `user_id` |
| FK naming | `cerrado_por` | `shift_closures` | `closed_by_user_id` |
| FK naming | `cargado_por` | `ventas_mensuales_local` | `loaded_by_user_id` |
| FK naming | `created_by` | Multiple | OK (convention accepted) |
| Date suffix | `fecha` | `gastos`, `movimientos_socio` | `date` (or `expense_date`) |
| Date suffix | `fecha_pago` | `pagos_*` | `paid_at` (timestamp) or `payment_date` |
| Date suffix | `fecha_vencimiento` | Multiple | `due_date` |
| Abreviación | `nro` | `afip_config` (`ultimo_nro_factura_*`) | `number` |
| Abreviación | `desc` | Not found | — |
| Column `orden` | Multiple tables | `sort_order` (descriptive) |
| Column `metodo` | `pedido_pagos` | `payment_method` |
| Column `monto` | ~10 tablas | `amount` |
| Column `nombre` | ~20 tablas | `name` |
| Column `telefono` | ~5 tablas | `phone` |
| Column `direccion` | ~5 tablas | `address` |
| Column `cantidad` | ~8 tablas | `quantity` |

### 8.3 Enum values — Violaciones

| Enum | Valor | Problema | Sugerido |
|---|---|---|---|
| `brand_role_type` | `coordinador` | Español | `coordinator` |
| `brand_role_type` | `informes` | Español | `reports` |
| `brand_role_type` | `contador_marca` | Español | `brand_accountant` |
| `local_role_type` | `franquiciado` | Español | `franchisee` |
| `local_role_type` | `encargado` | Español | `manager` |
| `local_role_type` | `contador_local` | Español | `local_accountant` |
| `local_role_type` | `cajero` | Español | `cashier` |
| `local_role_type` | `empleado` | Español | `employee` |
| `payment_method` | `efectivo` | Español | `cash` |
| `payment_method` | `tarjeta_debito` | Español | `debit_card` |
| `payment_method` | `tarjeta_credito` | Español | `credit_card` |
| `payment_method` | `transferencia` | Español | `transfer` |
| `payment_method` | `vales` | Español | `vouchers` |
| `order_area` | `salon` | Español | `dine_in` |
| `order_area` | `mostrador` | Español | `counter` |
| `work_position_type` | `cajero` | Español | `cashier` |
| `work_position_type` | `cocinero` | Español | `cook` |
| `work_position_type` | `lavacopas` | Español | `dishwasher` |

---

## 9. PLAN DE MIGRACIÓN

### ⚠️ ADVERTENCIA CRÍTICA

Esta migración es **masiva y de alto riesgo**. Renombrar 58 tablas, ~150 columnas y 18 enum values afectaría:
- **Todas** las queries `.from('tabla')` en el frontend (~200+ archivos)
- **Todas** las DB functions (~50 funciones)
- **Todos** los triggers (~20 triggers)
- **Todas** las RLS policies (~150 políticas)
- **Todas** las Edge Functions (~15 funciones)
- **Todos** los tipos generados en `types.ts`
- **Todas** las vistas (~10 views)

### Recomendación: NO migrar todo de golpe

En lugar de ejecutar esto como una migración atómica, recomiendo:

1. **Fase 0 — Limpiar tablas muertas** (bajo riesgo): DROP de `webapp_customers`, `menu_combos`, `menu_precios_historial`, `devoluciones`
2. **Fase 1 — Booleanos** (medio riesgo): Renombrar `activo` → `is_active`, `verificado` → `is_verified`, etc. (~30 columnas, ~60 archivos frontend)
3. **Fase 2 — Columnas comunes** (medio riesgo): `nombre` → `name`, `monto` → `amount`, `cantidad` → `quantity`, `orden` → `sort_order`
4. **Fase 3 — Tablas core** (alto riesgo): `pedidos` → `orders`, `items_carta` → `menu_items`, `preparaciones` → `recipes`, `insumos` → `supplies`
5. **Fase 4 — Enums** (muy alto riesgo): Requiere recrear tipos enum con valores nuevos, actualizar toda la lógica de roles

### SQL de Migración — Fase 0 (Tablas muertas)

```sql
DROP TABLE IF EXISTS public.webapp_customers;
DROP TABLE IF EXISTS public.menu_combos;
DROP TABLE IF EXISTS public.menu_precios_historial;
DROP TABLE IF EXISTS public.devoluciones;
DROP VIEW IF EXISTS public.v_menu_costos;
```

### SQL de Migración — Fase 1 (Booleanos, ejemplo parcial)

```sql
-- canales_venta
ALTER TABLE canales_venta RENAME COLUMN activo TO is_active;
ALTER TABLE canales_venta RENAME COLUMN es_base TO is_base;

-- items_carta
ALTER TABLE items_carta RENAME COLUMN activo TO is_active;

-- item_modificadores
ALTER TABLE item_modificadores RENAME COLUMN activo TO is_active;

-- item_removibles
ALTER TABLE item_removibles RENAME COLUMN activo TO is_active;

-- cadetes
ALTER TABLE cadetes RENAME COLUMN activo TO is_active;
ALTER TABLE cadetes RENAME COLUMN disponible TO is_available;

-- preparaciones
ALTER TABLE preparaciones RENAME COLUMN es_intercambiable TO is_interchangeable;

-- pagos_proveedores
ALTER TABLE pagos_proveedores RENAME COLUMN verificado TO is_verified;

-- pagos_canon
ALTER TABLE pagos_canon RENAME COLUMN verificado TO is_verified;

-- afip_config
ALTER TABLE afip_config RENAME COLUMN es_produccion TO is_production;

-- cliente_direcciones
ALTER TABLE cliente_direcciones RENAME COLUMN es_principal TO is_primary;

-- item_carta_composicion
ALTER TABLE item_carta_composicion RENAME COLUMN es_removible TO is_removable;

-- item_carta_grupo_opcional
ALTER TABLE item_carta_grupo_opcional RENAME COLUMN es_obligatorio TO is_required;
```

**Breaking changes de Fase 1:** Cada rename requiere actualizar:
- Frontend queries que referencien la columna
- DB functions que usen la columna
- RLS policies que filtren por esa columna
- Triggers que lean/escriban la columna

### Fases 2-4: No incluyo el SQL completo aquí porque cada fase requiere un análisis de impacto archivo-por-archivo antes de ejecutar. Cada rename de tabla implica actualizar entre 5 y 50 archivos de código.

---

### RESUMEN EJECUTIVO

| Dimensión | Cantidad de violaciones |
|---|---|
| Tablas en español | 58 / 127 |
| Columnas en español | ~150+ |
| Enum values en español | 18 / 53 |
| Booleanos sin `is_`/`has_` | ~15 columnas |
| FKs con naming inconsistente | ~5 columnas |
| Tablas spanglish | 2 (`pedido_payment_edits`, `webapp_pedido_mensajes`) |
| Archivos frontend impactados | ~200+ |
| DB functions impactadas | ~50 |
| Edge functions impactadas | ~15 |

**La migración completa es un proyecto de varias semanas. Recomiendo fuertemente hacerlo por fases, empezando por la limpieza de tablas muertas (Fase 0) que no tiene breaking changes.**

