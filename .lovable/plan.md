

# Plan: Migración DB — Columnas frecuentes + específicas (solo SQL)

Dos migraciones SQL que renombran todas las columnas pendientes de la Fase 2. No se toca ningún archivo frontend. Solo SQL + regeneración de `types.ts`.

---

## Migración 1 — Columnas frecuentes (~30 ALTER)

```sql
-- telefono → phone
ALTER TABLE profiles RENAME COLUMN telefono TO phone;
ALTER TABLE suppliers RENAME COLUMN telefono TO phone;
ALTER TABLE suppliers RENAME COLUMN telefono_secundario TO secondary_phone;
ALTER TABLE delivery_drivers RENAME COLUMN telefono TO phone;
-- (+ otras tablas que tengan telefono)

-- direccion → address
ALTER TABLE suppliers RENAME COLUMN direccion TO address;
-- (+ otras tablas)

-- fecha → date
ALTER TABLE expenses RENAME COLUMN fecha TO date;
ALTER TABLE supplier_invoices RENAME COLUMN fecha TO date;
ALTER TABLE investments RENAME COLUMN fecha TO date;
ALTER TABLE profit_distributions RENAME COLUMN fecha TO date;
ALTER TABLE manual_consumptions RENAME COLUMN fecha TO date;

-- periodo → period
ALTER TABLE branch_monthly_sales RENAME COLUMN periodo TO period;
ALTER TABLE canon_settlements RENAME COLUMN periodo TO period;
ALTER TABLE rdo_movimientos RENAME COLUMN periodo TO period;

-- concepto → concept
ALTER TABLE rdo_movimientos RENAME COLUMN concepto TO concept;
ALTER TABLE service_concepts RENAME COLUMN concepto TO concept;

-- precio_unitario → unit_price
ALTER TABLE order_items RENAME COLUMN precio_unitario TO unit_price;
ALTER TABLE invoice_items RENAME COLUMN precio_unitario TO unit_price;
ALTER TABLE promotion_items RENAME COLUMN precio_unitario TO unit_price;

-- precio_base → base_price
ALTER TABLE menu_items RENAME COLUMN precio_base TO base_price;
ALTER TABLE menu_prices RENAME COLUMN precio_base TO base_price;

-- imagen_url → image_url
ALTER TABLE menu_items RENAME COLUMN imagen_url TO image_url;
ALTER TABLE menu_categories RENAME COLUMN imagen_url TO image_url;
ALTER TABLE menu_products RENAME COLUMN imagen_url TO image_url;
```

Antes de ejecutar: verificar con `read-query` qué tablas realmente tienen cada columna, para no fallar en ALTER inexistentes.

Recrear vistas afectadas (`webapp_menu_items`, `rdo_multivista_items_base`, `rdo_report_data`, `cuenta_corriente_proveedores`, `cuenta_corriente_marca`, `balance_socios`) con los nuevos nombres.

Actualizar funciones/triggers que referencien estas columnas (`calcular_saldo_socio`, `sync_expense_movement_to_gastos`, etc.).

---

## Migración 2 — Columnas específicas por tabla (~80 ALTER)

**Orders/POS:**
- `orders`: numero_dia→daily_number, nombre_cliente→customer_name, telefono_cliente→customer_phone, direccion_entrega→delivery_address, tiempo_estimado→estimated_time
- `order_items`: nombre_item→item_name
- `order_payments`: metodo→method

**Menu:**
- `menu_items`: nombre_corto→short_name, visible_carta→is_visible_menu, visible_pos→is_visible_pos, visible_webapp→is_visible_webapp
- `removable_items`: nombre_display→display_name
- `menu_item_price_history`: precio_anterior→previous_price, precio_nuevo→new_price, motivo→reason, usuario_id→user_id
- `item_modifiers`: cantidad_ahorro→saving_quantity, unidad_ahorro→saving_unit, costo_ahorro→saving_cost, cantidad_extra→extra_quantity, unidad_extra→extra_unit, precio_extra→extra_price, costo_extra→extra_cost, orden→sort_order

**Recetas/Insumos:**
- `recipes`: rendimiento→yield, costo_calculado→calculated_cost, costo_manual→manual_cost
- `supplies`: unidad_base→base_unit, costo_por_unidad_base→base_unit_cost

**Finanzas:**
- `suppliers`: condicion_iva→tax_status, contacto_secundario→secondary_contact
- `supplier_invoices`: factura_tipo→invoice_type, factura_numero→invoice_number, factura_fecha→invoice_date, condicion_pago→payment_terms, saldo_pendiente→pending_balance, motivo_extraordinaria→extraordinary_reason
- `invoice_items`: unidad→unit
- `supplier_payments`: fecha_pago→payment_date, fecha_vencimiento_pago→payment_due_date
- `canon_payments`: fecha_pago→payment_date
- `canon_settlements`: porcentaje_ft→cash_percentage, saldo_pendiente→pending_balance, fecha_vencimiento→due_date

**Socios:**
- `partners`: porcentaje_participacion→ownership_percentage
- `partner_movements`: detalle→details, saldo_acumulado→cumulative_balance

**Ventas/RRHH:**
- `branch_monthly_sales`: venta_total→total_sales, efectivo→cash, cargado_por→loaded_by
- `shift_closures`: turno→shift, cerrado_por→closed_by, fuente→source
- `delivery_drivers`: disponible→is_available, pedidos_hoy→orders_today
- `sales_channels`: codigo→code, es_base→is_base, orden→sort_order
- `customer_addresses`: etiqueta→label, piso→floor, referencia→reference, ciudad→city, latitud→latitude, longitud→longitude

**AFIP:**
- `afip_config`: razon_social→business_name, direccion_fiscal→fiscal_address, inicio_actividades→activity_start_date, clave_privada_enc→private_key_enc, estado_conexion→connection_status, ultimo_error→last_error, ultima_verificacion→last_verification, ultimo_nro_factura_a→last_invoice_number_a, ultimo_nro_factura_b→last_invoice_number_b, ultimo_nro_factura_c→last_invoice_number_c, estado_certificado→certificate_status, reglas_facturacion→invoicing_rules

Recrear todas las vistas y funciones afectadas con los nombres nuevos.

---

## Proceso de ejecución

1. Query de verificación: consultar `information_schema.columns` para confirmar que cada columna existe antes de renombrar.
2. Ejecutar Migración 1 en un solo bloque SQL.
3. Ejecutar Migración 2 en un solo bloque SQL.
4. `types.ts` se regenera automáticamente tras cada migración.
5. Actualizar `plan.md` con el estado final.

No se modifica ningún archivo `.ts`/`.tsx` del frontend.

