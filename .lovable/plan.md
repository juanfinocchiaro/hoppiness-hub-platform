

# Auditoría DB vs prompt-8 -- Estado actual y lo que falta (solo DB, sin frontend)

## Estado general

La migración masiva está **~95% completada**. Fases 0-6 del plan.md están marcadas como done. Sin embargo, quedan residuos: 2 tablas sin renombrar, ~18 columnas en español, 2 funciones alias legacy, y 2 enums que no existen como PG types.

---

## ✅ YA COMPLETADO -- Verificado contra DB real

| Item | Estado |
|------|--------|
| 58+ tablas renombradas (Fase 3) | Done |
| ~140 columnas renombradas (Fase 2) | Done (95%) |
| Booleanos `is_`/`has_` (Fase 1) | Done |
| Tablas muertas DROP (Fase 0) | Done |
| 3 enums migrados: `order_area`, `payment_method`, `work_position_type` | Done |
| 3 vistas renombradas: `partner_balance`, `brand_current_account`, `supplier_current_account` | Done |
| ~29 funciones renombradas (Fase 6) | Done |
| 5 funciones rotas corregidas (sync_canon_settlement, etc.) | Done |
| `brand_role_type` / `local_role_type` | NO existen como enums PG (son TEXT) -- nada que migrar |
| afip_config columnas | Todas en inglés (business_name, fiscal_address, etc.) |
| afip_errores_log columnas | Todas en inglés (error_type, afip_code, message) |

---

## ⚠️ PENDIENTE -- 10 etapas de migración

### Etapa 1: Renombrar tabla `stock_movimientos` → `stock_movements`
Tabla con nombre en español que no fue incluida en Fase 3.
- Columnas ya en inglés: `type`, `quantity`, `quantity_before`, `quantity_after`, `reason`
- Columnas FK en español (excluidas): `insumo_id`, `pedido_id`
- Columna `nota` → `note` (ver etapa 3)

### Etapa 2: Renombrar tabla `rdo_movimientos` → `rdo_movements`
Tabla con nombre en español. Columnas ya migradas (`source`, `extra_data`, `amount`, `period`, `description`).

### Etapa 3: Columnas sueltas en español (~12 columnas)
| Tabla | Columna actual | Nuevo |
|-------|---------------|-------|
| `stock_movimientos` | `nota` | `note` |
| `discount_codes` | `valor` | `value` |
| `discount_codes` | `usos_maximos` | `max_uses` |
| `discount_codes` | `usos_actuales` | `current_uses` |
| `discount_codes` | `uso_unico_por_usuario` | `single_use_per_user` |
| `promotions` | `valor` | `value` |
| `expenses` | `adjuntos` | `attachments` |
| `expenses` | `afecta_caja` | `affects_register` |
| `expenses` | `categoria_principal` | `main_category` |
| `expenses` | `subcategoria` | `subcategory` |
| `expenses` | `gasto_relacionado_id` | `related_expense_id` |
| `service_concepts` | `subcategoria` | `subcategory` |

### Etapa 4: Columnas sueltas en español - financieras (~6 columnas)
| Tabla | Columna actual | Nuevo |
|-------|---------------|-------|
| `investments` | `cuotas_pagadas` | `installments_paid` |
| `investments` | `cuotas_total` | `total_installments` |
| `canon_payments` | `datos_pago` | `payment_data` |
| `supplier_payments` | `datos_pago` | `payment_data` |
| `afip_config` | `punto_venta` | `point_of_sale` |
| `issued_invoices` | `punto_venta` | `point_of_sale` |

### Etapa 5: Columna FK-like en español `canon_liquidacion_id`
| Tabla | Columna actual | Nuevo |
|-------|---------------|-------|
| `canon_payments` | `canon_liquidacion_id` | `canon_settlement_id` |

Nota: Está documentada como excluida en plan.md por alto impacto, pero es solo 1 tabla con 1 FK constraint. Impacto real: bajo. Requiere DROP + re-CREATE del FK constraint.

### Etapa 6: Columna `ventas_id` en `canon_settlements`
| Tabla | Columna actual | Nuevo |
|-------|---------------|-------|
| `canon_settlements` | `ventas_id` | `monthly_sales_id` |

Similar a etapa 5: es un FK reference, pero solo 1 tabla.

### Etapa 7: Columnas boolean sin prefijo `is_`
| Tabla | Columna actual | Nuevo |
|-------|---------------|-------|
| `sales_channels` | `is_base` | OK (ya tiene prefijo) |
| `recipes` | `puede_ser_extra` | `can_be_extra` |
| `recipes` | `fc_objetivo_extra` | `extra_target_fc` |
| `supplies` | `puede_ser_extra` | `can_be_extra` |
| `supplies` | `fc_objetivo_extra` | `extra_target_fc` |
| `invoice_items` | `afecta_costo_base` | `affects_base_cost` |
| `register_shifts_legacy` | `efectivo_contado` | `cash_counted` |

### Etapa 8: Funciones alias legacy -- cleanup
2 funciones legacy siguen existiendo como alias:
- `is_franquiciado_or_contador_for_branch` → alias de `is_franchisee_or_accountant_for_branch`
- `is_socio_admin` → alias de `is_partner_admin`

Acción: Verificar si alguna RLS policy las referencia directamente. Si no, DROP. Si sí, actualizar la RLS policy primero.

Funciones con nombres en español parcial que sobrevivieron:
- `sync_consumo_to_rdo` → `sync_consumption_to_rdo`
- `sync_gasto_to_rdo` → `sync_expense_to_rdo`
- `sync_expense_movement_to_gastos` → `sync_expense_movement` (la tabla destino ya se llama `expenses`)
- `sync_stock_sale_to_rdo` → OK (inglés)

### Etapa 9: Recrear vistas afectadas
Tras renombrar las tablas `stock_movimientos` y `rdo_movimientos`, verificar si alguna vista las referencia y recrearla.
- `rdo_report_data`: probablemente referencia `rdo_movimientos`
- Verificar y actualizar body de la vista.

### Etapa 10: Actualizar `plan.md`
Documentar todos los cambios ejecutados. Marcar la migración de idioma como **100% completada** (excluyendo FKs documentadas).

---

## ❌ EXCLUIDO INTENCIONALMENTE (sin cambio)

- **FK columns en español:** `pedido_id` (~8 tablas), `proveedor_id` (~6), `item_carta_id` (~10), `insumo_id` (~10), `socio_id` (2), `categoria_carta_id` (3)
- **`user_roles_v2`** -- mantiene sufijo `_v2`
- **`brand_role_type` / `local_role_type`** -- no existen como enums PG, son TEXT en `user_roles_v2`

---

## Resumen ejecutivo

| Categoría | Pendiente |
|-----------|-----------|
| Tablas por renombrar | 2 (`stock_movimientos`, `rdo_movimientos`) |
| Columnas en español | ~25 |
| Funciones con nombre parcial español | 3 + 2 alias |
| Vistas por actualizar | 1-2 |
| Enums | 0 |

Todo es SQL puro. Sin tocar frontend.

