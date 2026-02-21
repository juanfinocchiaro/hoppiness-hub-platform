# SQL pendiente para Lovable (Supabase)

**⚠️ NO ejecutar este archivo (.md) en el SQL Editor.** Este es solo la guía. El código SQL está en **`supabase/SQL_PENDIENTE_LOVABLE.sql`** — abrí ese archivo, copiá su contenido y pegalo en Supabase Dashboard → SQL Editor.

Ejecutar en **Supabase Dashboard → SQL Editor**, en el orden indicado. Si alguna parte ya fue aplicada (por ejemplo vía migraciones), omitir ese bloque.

---

## Orden de ejecución

| # | Archivo / Bloque | Descripción |
|---|------------------|-------------|
| 1 | `RUN_POS_MIGRATIONS.sql` | Tablas POS: pedidos, pedido_items, pedido_pagos, turnos_caja, pos_config + RLS |
| 2 | `RUN_POS_MIGRATIONS_PART2.sql` | Stock (stock_actual, stock_movimientos), cadetes, llamadores, integración cierre, funciones |
| 3 | `20260218200000_pos_canal_llamador.sql` | Columnas en pedidos: canal_venta, tipo_servicio, canal_app |
| 4 | `20260218200100_cash_registers.sql` | Cajas (cash_registers, cash_register_shifts, cash_register_movements) |
| 5 | `20260218200200_pedidos_propina.sql` | Columna propina en pedidos |
| 6 | `20260218200300_operator_verification.sql` | operator_session_logs, validate_supervisor_pin (ver nota abajo) |
| 7 | `20260218200400_cashier_discrepancies.sql` | cashier_discrepancy_history, get_cashier_discrepancy_stats, trigger |
| 8 | `20260218210000_stock_from_compras.sql` | Trigger: compras suman stock (items_factura → stock_actual) |
| 9 | `20260218220000_stock_cierre_mensual.sql` | Tabla stock_cierre_mensual |

---

## Nota sobre operator_verification (bloque 6)

La función `validate_supervisor_pin` referencia la tabla `user_roles` (columnas `user_id`, `branch_id`, `role`, `is_active`). Si en el proyecto se usa **user_roles_v2** con otra estructura, hay que adaptar la función para leer de `user_roles_v2` y el rol desde `local_role` (o el campo que corresponda).

---

## Archivos SQL

Todo el SQL está en un solo archivo para copiar/pegar por bloques:

**→ `supabase/SQL_PENDIENTE_LOVABLE.sql`**

Ese archivo contiene los 9 bloques en orden, separados por comentarios `-- ===== BLOQUE N =====`. Se puede:

- Ejecutar **todo de una vez** si la base aún no tiene nada de POS, o  
- Ejecutar **solo los bloques que falten** (por número).

---

## Alternativa: solo el mínimo para el toggle POS

Si solo quieren habilitar el toggle “POS habilitado” por sucursal sin el resto del flujo:

**→ `supabase/RUN_POS_CONFIG_ONLY.sql`**  
Crea solo la tabla `pos_config` y sus políticas RLS.
