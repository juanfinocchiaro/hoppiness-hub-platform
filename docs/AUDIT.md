# AUDITORÍA EXHAUSTIVA DEL PROYECTO HOPPINESS HUB

**Fecha de generación:** 2026-01-21  
**Versión:** 1.0  
**Propósito:** Documentación completa para análisis con consultor externo

---

# ÍNDICE

1. [Base de Datos - Schema Completo](#sección-1-base-de-datos---schema-completo)
2. [Estructura de Archivos](#sección-2-estructura-de-archivos-completa)
3. [Sistema de Rutas](#sección-3-sistema-de-rutas)
4. [Autenticación y Autorización](#sección-4-autenticación-y-autorización)
5. [Estado Global y Contextos](#sección-5-estado-global-y-contextos)
6. [Queries y Mutations (React Query)](#sección-6-queries-y-mutations)
7. [Integraciones Externas](#sección-7-integraciones-externas)
8. [UI/UX - Componentes y Diseño](#sección-8-uiux---componentes-y-diseño)
9. [Funcionalidades - Estado Detallado](#sección-9-funcionalidades---estado-detallado)
10. [Código Muerto y Problemas](#sección-10-código-muerto-y-problemas)
11. [Variables de Entorno](#sección-11-variables-de-entorno)
12. [Scripts y Build](#sección-12-scripts-y-build)
13. [Resumen Ejecutivo](#sección-13-resumen-ejecutivo)

---

# SECCIÓN 1: BASE DE DATOS - SCHEMA COMPLETO

## 1.1 Lista de Todas las Tablas (107 tablas)

### Tablas de Autenticación y Usuarios
| Tabla | Descripción |
|-------|-------------|
| `profiles` | Perfiles de usuario extendidos (datos adicionales a auth.users) |
| `user_roles` | Roles de aplicación (sistema legacy) |
| `user_roles_v2` | Nuevo sistema de roles con brand_role y local_role |
| `user_panel_access` | Acceso a paneles (brand/local) |
| `user_branch_access` | Acceso por sucursal |
| `user_branch_permissions` | Permisos granulares por sucursal |
| `user_addresses` | Direcciones de usuarios |
| `user_cash_registers` | Asignación de cajas a usuarios |
| `user_invitations` | Invitaciones pendientes de usuarios |
| `staff_invitations` | Invitaciones de staff operativo |

### Tablas de Sucursales
| Tabla | Descripción |
|-------|-------------|
| `branches` | Sucursales/locales de la franquicia |
| `branch_schedules` | Horarios de apertura por sucursal y servicio |
| `branch_shifts` | Turnos de trabajo configurados |
| `branch_shift_settings` | Configuración de turnos extendidos |
| `branch_channels` | Canales de venta habilitados por sucursal |
| `branch_products` | Productos disponibles y precios por sucursal |
| `branch_ingredients` | Stock de ingredientes por sucursal |
| `branch_modifier_options` | Modificadores disponibles por sucursal |
| `branch_customer_accounts` | Cuentas corrientes de clientes por sucursal |
| `branch_permissions` | Permisos legacy por sucursal |
| `branch_product_channel_availability` | Disponibilidad de productos por canal y sucursal |
| `branch_suppliers` | Proveedores asociados a sucursales |

### Tablas de Productos y Catálogo
| Tabla | Descripción |
|-------|-------------|
| `products` | Catálogo maestro de productos |
| `product_categories` | Categorías de productos |
| `product_modifier_assignments` | Asignación de modificadores a productos |
| `product_modifier_options` | Opciones de modificadores específicas por producto |
| `product_recipes` | Recetas/ingredientes por producto |
| `product_station_assignments` | Estaciones KDS por producto |
| `product_allowed_channels` | Canales permitidos por producto |
| `product_branch_exclusions` | Exclusiones de productos por sucursal |
| `modifier_groups` | Grupos de modificadores |
| `modifier_options` | Opciones individuales de modificadores |

### Tablas de Pedidos
| Tabla | Descripción |
|-------|-------------|
| `orders` | Pedidos realizados |
| `order_items` | Items/líneas de cada pedido |
| `order_item_modifiers` | Modificadores aplicados a items |
| `order_item_stations` | Estaciones KDS asignadas a items |
| `order_payments` | Pagos de pedidos (para split payment) |
| `order_discounts` | Descuentos aplicados a pedidos |
| `order_cancellations` | Log de cancelaciones |

### Tablas de Clientes
| Tabla | Descripción |
|-------|-------------|
| `customers` | Clientes (por teléfono, sin login) |
| `customer_addresses` | Direcciones de clientes |
| `customer_preferences` | Preferencias/estadísticas por cliente y sucursal |
| `customer_discounts` | Descuentos especiales por cliente |
| `customer_account_movements` | Movimientos de cuenta corriente |

### Tablas de Caja y Finanzas
| Tabla | Descripción |
|-------|-------------|
| `cash_registers` | Cajas registradoras por sucursal |
| `cash_register_shifts` | Turnos de caja (apertura/cierre) |
| `cash_register_movements` | Movimientos de caja (ingresos/egresos) |
| `cashier_discrepancy_history` | Historial de diferencias de caja |
| `transactions` | Transacciones financieras |
| `transaction_categories` | Categorías de transacciones (para P&L) |
| `finance_accounts` | Cuentas financieras (efectivo, banco, etc.) |
| `coa_accounts` | Plan de cuentas contables |
| `tax_obligations` | Obligaciones fiscales |

### Tablas de Stock e Inventario
| Tabla | Descripción |
|-------|-------------|
| `ingredients` | Ingredientes/materias primas maestro |
| `ingredient_categories` | Categorías de ingredientes |
| `ingredient_approved_suppliers` | Proveedores aprobados por ingrediente |
| `ingredient_unit_conversions` | Conversiones de unidades |
| `stock_movements` | Movimientos de stock (compras, ventas, ajustes) |
| `inventory_counts` | Conteos de inventario |
| `inventory_count_lines` | Líneas de conteo de inventario |

### Tablas de Proveedores y Compras
| Tabla | Descripción |
|-------|-------------|
| `suppliers` | Proveedores maestro |
| `supplier_categories` | Categorías de proveedores |
| `supplier_invoices` | Facturas de proveedores |
| `supplier_invoice_items` | Items de facturas de proveedores |
| `supplier_payments` | Pagos a proveedores |
| `supplier_orders` | Pedidos a proveedores |
| `extracted_invoices` | Facturas escaneadas/procesadas |
| `extracted_invoice_items` | Items extraídos de facturas |
| `scanned_documents` | Documentos escaneados |

### Tablas de RRHH
| Tabla | Descripción |
|-------|-------------|
| `employees` | Empleados operativos |
| `employee_data` | Datos extendidos de empleados |
| `employee_private_details` | Datos sensibles de empleados |
| `employee_documents` | Documentos de empleados |
| `employee_schedules` | Horarios programados |
| `employee_warnings` | Advertencias/sanciones |
| `attendance_logs` | Logs de fichaje (IN/OUT) |
| `attendance_records` | Registros de asistencia |
| `attendance_tokens` | Tokens para fichaje por QR |
| `salary_advances` | Adelantos de sueldo |
| `payroll_periods` | Períodos de nómina |
| `payroll_entries` | Entradas de nómina |
| `payroll_payments` | Pagos de nómina |
| `payroll_adjustments` | Ajustes de nómina |
| `loans` | Préstamos a empleados |
| `loan_installments` | Cuotas de préstamos |
| `warnings` | Avisos/notificaciones |
| `shift_closures` | Cierres de turno |
| `shift_notes` | Notas de turno |

### Tablas de Configuración y Sistema
| Tabla | Descripción |
|-------|-------------|
| `brand_settings` | Configuración de marca |
| `brand_templates` | Plantillas de roles de marca |
| `brand_template_permissions` | Permisos por plantilla de marca |
| `local_templates` | Plantillas de roles locales |
| `local_template_permissions` | Permisos por plantilla local |
| `channels` | Canales de venta maestro |
| `discounts` | Descuentos/promociones |
| `payment_methods` | Métodos de pago |
| `payment_plans` | Planes de pago |
| `payment_plan_installments` | Cuotas de planes de pago |
| `permission_definitions` | Definiciones de permisos |
| `permission_audit_logs` | Logs de cambios de permisos |
| `role_default_permissions` | Permisos por defecto por rol |
| `delivery_zones` | Zonas de delivery |
| `printers` | Impresoras configuradas |
| `kds_settings` | Configuración de KDS |
| `kds_stations` | Estaciones de cocina |
| `kds_tokens` | Tokens de acceso KDS público |
| `operator_session_logs` | Logs de sesión de operadores |
| `contact_messages` | Mensajes de contacto |
| `availability_logs` | Logs de cambios de disponibilidad |
| `availability_schedules` | Programación de disponibilidad |

---

## 1.2 Detalle de Tablas Principales

### Tabla: `profiles`
**Descripción:** Perfil extendido de usuarios de auth.users

| Columna | Tipo | Nullable | Default | Descripción |
|---------|------|----------|---------|-------------|
| user_id | uuid | NO | - | PK, referencia a auth.users |
| full_name | text | YES | - | Nombre completo |
| email | text | YES | - | Email |
| phone | text | YES | - | Teléfono |
| avatar_url | text | YES | - | URL de avatar |
| is_active | boolean | YES | true | Usuario activo |
| pin_hash | text | YES | - | Hash del PIN de autorización |
| favorite_branch_id | uuid | YES | - | Sucursal favorita |
| total_orders | integer | YES | 0 | Total de pedidos |
| total_spent | numeric | YES | 0 | Total gastado |
| last_order_at | timestamptz | YES | - | Último pedido |
| created_at | timestamptz | NO | now() | Fecha creación |
| updated_at | timestamptz | NO | now() | Fecha actualización |

---

### Tabla: `user_roles_v2`
**Descripción:** Sistema de roles V2 con separación brand/local

| Columna | Tipo | Nullable | Default | Descripción |
|---------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | PK |
| user_id | uuid | NO | - | Usuario |
| brand_role | brand_role_type | YES | - | Rol de marca (superadmin, coordinador, informes, contador_marca) |
| local_role | local_role_type | YES | - | Rol local (franquiciado, encargado, contador_local, cajero, empleado) |
| branch_ids | uuid[] | YES | - | Array de sucursales accesibles |
| authorization_pin_hash | text | YES | - | PIN para autorizaciones |
| is_active | boolean | YES | true | Rol activo |
| created_at | timestamptz | NO | now() | Fecha creación |
| updated_at | timestamptz | NO | now() | Fecha actualización |

---

### Tabla: `branches`
**Descripción:** Sucursales de la franquicia

| Columna | Tipo | Nullable | Default | Descripción |
|---------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | PK |
| name | text | NO | - | Nombre de sucursal |
| slug | text | YES | - | URL slug único |
| address | text | YES | - | Dirección |
| city | text | YES | - | Ciudad |
| phone | text | YES | - | Teléfono |
| email | text | YES | - | Email |
| is_active | boolean | YES | true | Sucursal activa |
| local_open_state | boolean | YES | false | Estado abierto/cerrado local |
| admin_force_state | text | YES | - | Estado forzado por admin (force_open, force_closed, disabled) |
| opens_at | time | YES | '09:00:00' | Hora apertura |
| closes_at | time | YES | '23:00:00' | Hora cierre |
| delivery_enabled | boolean | YES | true | Delivery habilitado |
| takeaway_enabled | boolean | YES | true | Takeaway habilitado |
| dine_in_enabled | boolean | YES | true | Salón habilitado |
| rappi_enabled | boolean | YES | false | Integración Rappi |
| pedidosya_enabled | boolean | YES | false | Integración PedidosYa |
| mercadopago_delivery_enabled | boolean | YES | false | Integración MP Delivery |
| default_estimated_time | integer | YES | 30 | Tiempo estimado default (minutos) |
| minimum_order | numeric | YES | 0 | Pedido mínimo |
| delivery_fee | numeric | YES | 0 | Costo de envío |
| latitude | numeric | YES | - | Latitud |
| longitude | numeric | YES | - | Longitud |
| cuit | text | YES | - | CUIT fiscal |
| punto_venta | integer | YES | - | Punto de venta AFIP |
| created_at | timestamptz | NO | now() | Fecha creación |
| updated_at | timestamptz | NO | now() | Fecha actualización |

---

### Tabla: `products`
**Descripción:** Catálogo maestro de productos

| Columna | Tipo | Nullable | Default | Descripción |
|---------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | PK |
| name | text | NO | - | Nombre del producto |
| description | text | YES | - | Descripción |
| price | numeric | NO | - | Precio base |
| category_id | uuid | YES | - | Categoría |
| image_url | text | YES | - | URL de imagen |
| pos_image_url | text | YES | - | Imagen para POS |
| is_available | boolean | YES | true | Disponible globalmente |
| is_available_all_branches | boolean | YES | true | Disponible en todas las sucursales |
| has_modifiers | boolean | YES | false | Tiene modificadores |
| sku | text | YES | - | Código SKU |
| display_order | integer | YES | 0 | Orden de display |
| prep_time_minutes | integer | YES | - | Tiempo de preparación |
| cost | numeric | YES | - | Costo estimado |
| created_at | timestamptz | NO | now() | Fecha creación |
| updated_at | timestamptz | NO | now() | Fecha actualización |

---

### Tabla: `orders`
**Descripción:** Pedidos

| Columna | Tipo | Nullable | Default | Descripción |
|---------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | PK |
| branch_id | uuid | NO | - | Sucursal |
| user_id | uuid | YES | - | Usuario (si está logueado) |
| customer_id | uuid | YES | - | Cliente (por teléfono) |
| status | order_status | NO | 'pending' | Estado del pedido |
| order_type | order_type | NO | 'takeaway' | Tipo (delivery/takeaway/dine_in) |
| order_area | order_area | YES | 'mostrador' | Área (salon/mostrador/delivery) |
| sales_channel | sales_channel | YES | 'pos_local' | Canal de venta |
| subtotal | numeric | NO | 0 | Subtotal |
| delivery_fee | numeric | YES | 0 | Costo de envío |
| discount_amount | numeric | YES | 0 | Descuento |
| tip_amount | numeric | YES | 0 | Propina |
| total | numeric | NO | 0 | Total |
| payment_method | payment_method | YES | - | Método de pago |
| invoice_type | text | YES | - | Tipo de factura |
| customer_name | text | NO | - | Nombre del cliente |
| customer_phone | text | NO | - | Teléfono del cliente |
| customer_email | text | YES | - | Email del cliente |
| delivery_address | text | YES | - | Dirección de entrega |
| delivery_notes | text | YES | - | Notas de entrega |
| caller_number | integer | YES | - | Número de turno |
| estimated_time | integer | YES | - | Tiempo estimado (minutos) |
| tracking_token | uuid | YES | gen_random_uuid() | Token de seguimiento público |
| notes | text | YES | - | Notas internas |
| created_at | timestamptz | NO | now() | Fecha creación |
| updated_at | timestamptz | NO | now() | Fecha actualización |

---

### Tabla: `cash_register_shifts`
**Descripción:** Turnos de caja

| Columna | Tipo | Nullable | Default | Descripción |
|---------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | PK |
| branch_id | uuid | NO | - | Sucursal |
| cash_register_id | uuid | NO | - | Caja registradora |
| opened_by | uuid | NO | - | Usuario que abrió |
| closed_by | uuid | YES | - | Usuario que cerró |
| status | text | NO | 'open' | Estado (open/closed) |
| opening_amount | numeric | NO | 0 | Monto de apertura |
| closing_amount | numeric | YES | - | Monto de cierre |
| expected_amount | numeric | YES | - | Monto esperado |
| notes | text | YES | - | Notas |
| opened_at | timestamptz | NO | now() | Fecha apertura |
| closed_at | timestamptz | YES | - | Fecha cierre |
| shift_date | date | NO | CURRENT_DATE | Fecha del turno |

---

## 1.3 Relaciones Entre Tablas

```
auth.users
└── profiles (1:1)
└── user_roles (1:N)
└── user_roles_v2 (1:1)
└── user_panel_access (1:1)
└── user_branch_access (1:N)
└── user_branch_permissions (1:N)
└── orders (1:N) via user_id
└── attendance_records (1:N)

branches
├── branch_schedules (1:N)
├── branch_shifts (1:N)
├── branch_channels (1:N)
├── branch_products (1:N)
├── branch_ingredients (1:N)
├── branch_modifier_options (1:N)
├── branch_customer_accounts (1:N)
├── cash_registers (1:N)
│   └── cash_register_shifts (1:N)
│       └── cash_register_movements (1:N)
├── orders (1:N)
├── delivery_zones (1:N)
├── employees (1:N)
├── inventory_counts (1:N)
├── transactions (1:N)
└── kds_settings (1:1)

products
├── product_categories (N:1)
├── product_modifier_assignments (1:N)
├── product_recipes (1:N)
├── product_allowed_channels (1:N)
├── branch_products (1:N)
└── order_items (1:N)

orders
├── order_items (1:N)
│   └── order_item_modifiers (1:N)
├── order_payments (1:N)
├── order_discounts (1:N)
└── order_cancellations (1:1)

customers
├── customer_addresses (1:N)
├── customer_preferences (1:N per branch)
├── customer_discounts (1:N)
├── orders (1:N)
└── branch_customer_accounts (1:N per branch)

suppliers
├── supplier_categories (N:1)
├── supplier_invoices (1:N)
├── supplier_payments (1:N)
├── ingredient_approved_suppliers (N:M with ingredients)
└── branch_suppliers (1:N)

ingredients
├── ingredient_categories (N:1)
├── ingredient_approved_suppliers (N:M with suppliers)
├── product_recipes (N:M with products)
├── branch_ingredients (1:N per branch)
└── stock_movements (1:N)

employees
├── attendance_logs (1:N)
├── employee_schedules (1:N)
├── employee_documents (1:N)
├── employee_warnings (1:N)
└── salary_advances (1:N)
```

---

## 1.4 Enums Definidos

| Enum | Valores |
|------|---------|
| `app_role` | admin, gerente, empleado, franquiciado, socio, coordinador, encargado, cajero, kds |
| `brand_role_type` | superadmin, coordinador, informes, contador_marca |
| `local_role_type` | franquiciado, encargado, contador_local, cajero, empleado |
| `order_status` | draft, pending, confirmed, preparing, ready, waiting_pickup, in_transit, delivered, cancelled |
| `order_type` | takeaway, delivery, dine_in |
| `order_area` | salon, mostrador, delivery |
| `sales_channel` | atencion_presencial, whatsapp, mas_delivery, pedidos_ya, rappi, mercadopago_delivery, web_app, pos_local |
| `payment_method` | efectivo, tarjeta_debito, tarjeta_credito, mercadopago_qr, mercadopago_link, transferencia, vales |
| `payment_origin` | cash, mercadopago, bank_transfer, credit_card |
| `receipt_type` | OFFICIAL, INTERNAL |
| `stock_movement_type` | sale, purchase, adjustment, waste, transfer_in, transfer_out, count_adjust, production |
| `supplier_control_type` | brand_only, brand_preferred, free |
| `transaction_type` | income, expense |
| `permission_scope` | local, brand |

---

## 1.5 Views Definidas

### View: `supplier_balances`
**Descripción:** Saldos de proveedores por sucursal

```sql
SELECT 
  s.id AS supplier_id,
  s.name AS supplier_name,
  b.id AS branch_id,
  b.name AS branch_name,
  COALESCE(SUM(CASE WHEN t.type = 'expense' AND t.supplier_id = s.id AND NOT COALESCE(t.is_payment_to_supplier, false) THEN t.amount ELSE 0 END), 0) AS total_purchased,
  COALESCE(SUM(CASE WHEN sp.supplier_id = s.id THEN sp.amount ELSE 0 END), 0) AS total_paid,
  (total_purchased - total_paid) AS current_balance
FROM suppliers s
CROSS JOIN branches b
LEFT JOIN transactions t ON t.supplier_id = s.id AND t.branch_id = b.id
LEFT JOIN supplier_payments sp ON sp.supplier_id = s.id AND sp.branch_id = b.id
WHERE s.is_active = true
GROUP BY s.id, s.name, b.id, b.name
```

### View: `employees_basic`
**Descripción:** Vista pública de empleados (sin datos sensibles)

```sql
SELECT id, branch_id, full_name, position, photo_url, current_status, is_active
FROM employees
```

### View: `profiles_public`
**Descripción:** Vista pública de perfiles

```sql
SELECT id, user_id, full_name, avatar_url, is_active
FROM profiles
```

### View: `user_effective_permissions`
**Descripción:** Permisos efectivos combinando rol + overrides

```sql
-- Combina role_default_permissions con user_branch_permissions
-- Considera grants y revokes individuales
```

---

## 1.6 Funciones de Base de Datos Principales

### `is_admin(_user_id uuid) → boolean`
Verifica si el usuario tiene rol admin.

### `is_superadmin(_user_id uuid) → boolean`
Verifica si el usuario tiene brand_role = 'superadmin' en user_roles_v2.

### `has_branch_access(_user_id uuid, _branch_id uuid) → boolean`
Verifica si el usuario tiene acceso a una sucursal.

### `has_branch_access_v2(_user_id uuid, _branch_id uuid) → boolean`
Versión V2 usando user_roles_v2.branch_ids[].

### `has_branch_permission(_branch_id uuid, _permission text, _user_id uuid) → boolean`
Verifica permiso granular. Lógica:
1. Admins tienen todo
2. Coordinadores tienen todo
3. Socios/Franquiciados tienen todo en sus sucursales
4. Verificar user_branch_permissions
5. Fallback a branch_permissions legacy

### `verify_authorization_pin(_branch_id uuid, _pin text) → TABLE`
Valida PIN de autorización para encargados/franquiciados.

### `find_or_create_customer(p_phone text, p_name text, p_email text) → uuid`
Busca o crea cliente por teléfono.

### `get_cashier_discrepancy_stats(_user_id uuid, _branch_id uuid) → TABLE`
Estadísticas de diferencias de caja por cajero.

### `calculate_product_cost(p_product_id uuid) → numeric`
Calcula costo de producto basado en receta.

### `update_ingredient_stock_on_movement() → trigger`
Actualiza stock de ingredientes automáticamente.

### `deduct_stock_on_sale() → trigger`
Descuenta stock según receta al crear order_items.

### `create_sale_transaction_from_order() → trigger`
Crea transacción de venta cuando un pedido pasa a 'delivered'.

---

## 1.7 Triggers Activos

| Tabla | Trigger | Función |
|-------|---------|---------|
| `branches` | setup_new_branch | Crea branch_products para todos los productos |
| `branches` | setup_default_schedules | Crea horarios por defecto |
| `branches` | setup_default_cash_registers | Crea 3 cajas por defecto |
| `branches` | setup_branch_channels | Asocia canales activos |
| `branches` | setup_branch_modifier_options | Copia modificadores activos |
| `branches` | setup_default_finance_accounts | Crea cuentas financieras |
| `products` | sync_product_to_branches | Propaga producto a sucursales |
| `products` | sync_product_to_channels | Permite en canales directos |
| `modifier_options` | sync_modifier_option_to_branches | Propaga a sucursales |
| `channels` | sync_channel_to_all | Propaga canal a sucursales |
| `ingredients` | sync_ingredient_to_branches | Crea branch_ingredients |
| `attendance_logs` | update_employee_status | Actualiza estado del empleado |
| `order_items` | capture_product_snapshot | Guarda nombre del producto |
| `order_items` | deduct_stock_on_sale | Descuenta ingredientes |
| `orders` | validate_order_before_insert | Valida datos del pedido |
| `orders` | update_customer_order_stats | Actualiza estadísticas cliente |
| `orders` | create_sale_transaction_from_order | Crea transacción de venta |
| `cash_register_shifts` | record_shift_discrepancy | Registra diferencias de caja |
| `stock_movements` | update_ingredient_stock_on_movement | Actualiza stock |
| `user_roles_v2` | update_user_roles_v2_updated_at | Actualiza timestamp |

---

# SECCIÓN 2: ESTRUCTURA DE ARCHIVOS COMPLETA

## 2.1 Árbol de Directorios

```
/src
├── /assets (14 archivos - imágenes y logos)
├── /components (141 archivos)
│   ├── /admin (22 archivos)
│   │   └── /users (6 archivos)
│   ├── /attendance (2 archivos)
│   ├── /cash (7 archivos)
│   ├── /charts (1 archivo)
│   ├── /dashboard (4 archivos)
│   ├── /debug (1 archivo)
│   ├── /guards (4 archivos)
│   ├── /hr (6 archivos)
│   ├── /layout (2 archivos)
│   ├── /local (6 archivos)
│   │   └── /team (6 archivos)
│   ├── /maps (2 archivos)
│   ├── /orders (3 archivos)
│   ├── /pos (11 archivos)
│   ├── /reports (3 archivos)
│   ├── /schedules (2 archivos)
│   ├── /shared (6 archivos)
│   ├── /stock (1 archivo)
│   ├── /store (14 archivos)
│   │   ├── /BranchSelector (4 archivos)
│   │   ├── /Cart (4 archivos)
│   │   ├── /Menu (4 archivos)
│   │   ├── /Product (2 archivos)
│   │   └── /common (2 archivos)
│   └── /ui (53 archivos - shadcn components)
├── /contexts (2 archivos)
├── /hooks (26 archivos)
│   └── /store (1 archivo)
├── /integrations
│   └── /supabase (2 archivos)
├── /lib (3 archivos)
├── /pages (64 archivos)
│   ├── /admin (31 archivos)
│   ├── /cuenta (4 archivos)
│   ├── /local (43 archivos)
│   └── /pos (4 archivos)
├── /test (2 archivos)
└── /types (1 archivo)

/supabase
└── /functions (12 edge functions)

/docs (6 archivos de documentación)
/public
├── /images
│   ├── /modifiers (18 imágenes)
│   └── /products (60+ imágenes)
└── /sounds (1 archivo)
```

## 2.2 Componentes Principales

### Guards (Protección de Rutas)

| Archivo | Exporta | Descripción |
|---------|---------|-------------|
| `RequireAuth.tsx` | `RequireAuth` | Requiere usuario autenticado |
| `RequireAdmin.tsx` | `RequireAdmin`, `AdminRoute` | Requiere acceso a panel marca |
| `RequireLocal.tsx` | `RequireLocal`, `LocalRoute` | Requiere acceso a panel local |

### Contextos

| Archivo | Contexto | Descripción |
|---------|----------|-------------|
| `CartContext.tsx` | `CartProvider`, `useCart` | Carrito de compras con persistencia localStorage |
| `DashboardFilterContext.tsx` | `DashboardFilterProvider`, `useDashboardFilters` | Filtros de dashboard (período, canal) |

### Hooks Principales

| Hook | Archivo | Descripción |
|------|---------|-------------|
| `useAuth` | `useAuth.tsx` | Autenticación Supabase |
| `usePermissionsV2` | `usePermissionsV2.ts` | Sistema de permisos V2 completo |
| `useRoleLandingV2` | `useRoleLandingV2.ts` | Determina landing según rol |
| `useUserRole` | `useUserRole.tsx` | Sistema de roles legacy |
| `usePanelAccess` | `usePanelAccess.ts` | Acceso a paneles |
| `usePermission` | `usePermission.ts` | Verificación de permiso individual |
| `useShiftStatus` | `useShiftStatus.ts` | Estado de turno de caja |
| `useCashRegister` | `useCashRegister.ts` | Operaciones de caja |
| `usePendingOrdersCount` | `usePendingOrdersCount.ts` | Contador de pedidos pendientes |
| `useChannels` | `useChannels.ts` | CRUD de canales |
| `useProductModifiers` | `useProductModifiers.ts` | Modificadores de productos |
| `useEmbedMode` | `useEmbedMode.ts` | Detecta modo embebido |
| `useExportToExcel` | `useExportToExcel.ts` | Exportación a Excel |

---

# SECCIÓN 3: SISTEMA DE RUTAS

## 3.1 Configuración del Router

**Archivo principal:** `src/App.tsx`

**Estructura de Layouts:**
- `PublicLayout` - Páginas públicas (landing, menú, etc.)
- `AdminDashboard` - Panel Mi Marca (`/admin/*`)
- `LocalLayout` - Panel Mi Local (`/local/:branchId/*`)
- Sin layout - Páginas standalone (login, etc.)

## 3.2 Tabla Completa de Rutas

### Rutas Públicas

| Ruta | Componente | Protección | Descripción |
|------|------------|------------|-------------|
| `/` | `Index` | Ninguna | Landing page |
| `/ingresar` | `Ingresar` | Ninguna | Login/Registro |
| `/pedir` | `Pedir` | Ninguna | Selector de sucursal |
| `/pedir/:branchSlug` | `PedirBranch` | Ninguna | Menú de sucursal |
| `/checkout` | `Checkout` | Ninguna | Checkout de pedido |
| `/pedido/:trackingToken` | `PedidoTracking` | Ninguna | Tracking de pedido |
| `/menu/:branchSlug` | `MenuPublic` | Ninguna | Menú público |
| `/franquicias` | `Franquicias` | Ninguna | Info franquicias |
| `/nosotros` | `Nosotros` | Ninguna | Sobre nosotros |
| `/contacto` | `Contacto` | Ninguna | Formulario contacto |
| `/clock-in` | `ClockIn` | Ninguna | Fichaje QR |
| `/registro-staff` | `RegistroStaff` | Ninguna | Registro de staff |
| `/invitacion/:token` | `AceptarInvitacion` | Ninguna | Aceptar invitación |
| `/kds/public` | `KDSPublic` | Token | KDS público |

### Rutas Mi Cuenta (Autenticadas)

| Ruta | Componente | Protección | Descripción |
|------|------------|------------|-------------|
| `/cuenta` | `CuentaDashboard` | RequireAuth | Dashboard usuario |
| `/cuenta/pedidos` | `CuentaPedidos` | RequireAuth | Mis pedidos |
| `/cuenta/perfil` | `CuentaPerfil` | RequireAuth | Mi perfil |
| `/cuenta/direcciones` | `CuentaDirecciones` | RequireAuth | Mis direcciones |

### Rutas Panel Mi Local

| Ruta | Componente | Protección | Descripción |
|------|------------|------------|-------------|
| `/local/:branchId` | `LocalDashboard` | LocalRoute | Dashboard local |
| `/local/:branchId/integrador` | `LocalIntegrador` | LocalRoute | Integrador pedidos |
| `/local/:branchId/pos` | `LocalPOS` | LocalRoute | Punto de venta |
| `/local/:branchId/kds` | `LocalKDS` | LocalRoute | Cocina |
| `/local/:branchId/pedidos` | `LocalPedidos` | LocalRoute | Pedidos activos |
| `/local/:branchId/historial` | `LocalHistorial` | LocalRoute | Historial |
| `/local/:branchId/caja` | `LocalCaja` | LocalRoute | Caja del día |
| `/local/:branchId/cierre` | `LocalCierreTurno` | LocalRoute | Cierre de turno |
| `/local/:branchId/cuenta-corriente` | `LocalCustomers` | LocalRoute | CC Clientes |
| `/local/:branchId/stock` | `LocalStock` | LocalRoute | Stock actual |
| `/local/:branchId/stock/pedir` | `LocalStockPedir` | LocalRoute | Pedir a proveedor |
| `/local/:branchId/stock/conteo` | `LocalInventory` | LocalRoute | Conteo inventario |
| `/local/:branchId/compras/factura` | `LocalStockFactura` | LocalRoute | Cargar factura |
| `/local/:branchId/compras/proveedores` | `LocalComprasProveedores` | LocalRoute | Proveedores |
| `/local/:branchId/compras/cuentas` | `LocalComprasCuentas` | LocalRoute | CC Proveedores |
| `/local/:branchId/compras/historial` | `LocalComprasHistorial` | LocalRoute | Historial compras |
| `/local/:branchId/menu/productos` | `LocalProductos` | LocalRoute | Productos local |
| `/local/:branchId/menu/combos` | `LocalMenuCombos` | LocalRoute | Combos |
| `/local/:branchId/menu/extras` | `LocalExtras` | LocalRoute | Extras |
| `/local/:branchId/equipo/mi-equipo` | `LocalTeam` | LocalRoute | Mi equipo |
| `/local/:branchId/equipo/fichar` | `LocalRRHHFichajes` | LocalRoute | Fichajes |
| `/local/:branchId/equipo/horarios` | `LocalRRHHHorarios` | LocalRoute | Horarios |
| `/local/:branchId/equipo/horas` | `LocalRRHHHoras` | LocalRoute | Horas del mes |
| `/local/:branchId/equipo/liquidacion` | `LocalRRHHLiquidacion` | LocalRoute | Liquidación |
| `/local/:branchId/reportes/ventas` | `LocalReportesVentas` | LocalRoute | Reporte ventas |
| `/local/:branchId/reportes/resultados` | `LocalFinanceReports` | LocalRoute | P&L |
| `/local/:branchId/reportes/cmv` | `LocalCMVReport` | LocalRoute | CMV |
| `/local/:branchId/finanzas/movimientos` | `LocalTransactions` | LocalRoute | Movimientos |
| `/local/:branchId/finanzas/facturas` | `LocalFacturas` | LocalRoute | Facturas emitidas |
| `/local/:branchId/finanzas/obligaciones` | `LocalObligaciones` | LocalRoute | Obligaciones |
| `/local/:branchId/config/datos` | `LocalConfig` | LocalRoute | Config local |
| `/local/:branchId/config/turnos` | `LocalShiftConfig` | LocalRoute | Config turnos |
| `/local/:branchId/config/zonas` | `LocalDeliveryZones` | LocalRoute | Zonas delivery |
| `/local/:branchId/config/integraciones` | `LocalIntegraciones` | LocalRoute | Integraciones |
| `/local/:branchId/config/impresoras` | `LocalImpresoras` | LocalRoute | Impresoras |
| `/local/:branchId/config/kds` | `LocalKDSSettings` | LocalRoute | Config KDS |

### Rutas Panel Mi Marca

| Ruta | Componente | Protección | Descripción |
|------|------------|------------|-------------|
| `/admin` | `AdminHome` | AdminRoute | Dashboard marca |
| `/admin/resultados` | `ProfitLossReport` | AdminRoute | P&L consolidado |
| `/admin/comparativa` | `BranchPerformance` | AdminRoute | Comparativa locales |
| `/admin/sucursales` | `Branches` | AdminRoute | Gestión sucursales |
| `/admin/locales/:slug` | `BranchDetail` | AdminRoute | Detalle sucursal |
| `/admin/catalogo/productos` | `Products` | AdminRoute | Productos |
| `/admin/catalogo/productos/:id` | `ProductForm` | AdminRoute | Editar producto |
| `/admin/catalogo/modificadores` | `Modifiers` | AdminRoute | Modificadores |
| `/admin/catalogo/ingredientes` | `Ingredients` | AdminRoute | Ingredientes |
| `/admin/catalogo/descuentos` | `Discounts` | AdminRoute | Descuentos |
| `/admin/abastecimiento/proveedores` | `Suppliers` | AdminRoute | Proveedores |
| `/admin/abastecimiento/asignacion` | `IngredientSuppliers` | AdminRoute | Asignación |
| `/admin/personas/equipo-central` | `CentralTeam` | AdminRoute | Equipo central |
| `/admin/personas/usuarios` | `UsersPage` | AdminRoute | Usuarios |
| `/admin/personas/roles` | `RoleTemplates` | AdminRoute | Plantillas roles |
| `/admin/mensajes` | `Messages` | AdminRoute | Mensajes |
| `/admin/configuracion/marca` | `BrandSettings` | AdminRoute | Config marca |
| `/admin/configuracion/canales` | `Channels` | AdminRoute | Canales |
| `/admin/configuracion/integraciones` | `Integrations` | AdminRoute | Integraciones |
| `/admin/clientes` | `Customers` | AdminRoute | Clientes |
| `/admin/escaner-comprobantes` | `InvoiceScanner` | AdminRoute | Escáner facturas |

---

# SECCIÓN 4: AUTENTICACIÓN Y AUTORIZACIÓN

## 4.1 Flujo de Autenticación

### Login
1. Usuario ingresa email/password en `/ingresar`
2. `supabase.auth.signInWithPassword()` valida credenciales
3. Si éxito, se obtiene session con JWT
4. `onAuthStateChange` actualiza estado en `useAuth`
5. Usuario es redirigido a su landing según rol

### Registro
1. Usuario completa formulario en `/ingresar` (tab registro)
2. `supabase.auth.signUp()` crea usuario
3. Trigger `handle_new_user` crea perfil en `profiles`
4. Auto-confirm está habilitado (no requiere verificar email)
5. Usuario queda logueado automáticamente

### Logout
1. `signOut()` llama `supabase.auth.signOut()`
2. Session se invalida
3. Usuario redirigido a `/`

### Sesión Persistente
- JWT almacenado en localStorage por Supabase
- Refresh automático antes de expirar
- `getSession()` recupera sesión existente al cargar app

## 4.2 Sistema de Roles Actual

### Roles V2 (Nuevo Sistema)

**Brand Roles:**
| Rol | Slug | Descripción |
|-----|------|-------------|
| Superadmin | `superadmin` | Control total de marca y locales |
| Coordinador | `coordinador` | Gestión catálogo y marketing |
| Informes | `informes` | Solo visualización de reportes |
| Contador Marca | `contador_marca` | Finanzas consolidadas |

**Local Roles:**
| Rol | Slug | Descripción |
|-----|------|-------------|
| Franquiciado | `franquiciado` | Dueño del local, todo acceso |
| Encargado | `encargado` | Gestión día a día |
| Contador Local | `contador_local` | Finanzas del local |
| Cajero | `cajero` | Operación POS |
| Empleado | `empleado` | Solo KDS y fichaje |

### Asignación de Roles
- Se asigna en tabla `user_roles_v2`
- `brand_role` define acceso a panel marca
- `local_role` define acceso a panel local
- `branch_ids[]` define sucursales accesibles

### Verificación de Permisos
1. `usePermissionsV2(branchId)` calcula permisos
2. Consulta `user_roles_v2` para roles activos
3. Consulta `branches` para sucursales accesibles
4. Genera objeto `permissions.local.*` y `permissions.brand.*`
5. Componentes usan flags como `lp.canOperatePOS`

## 4.3 Hooks de Auth

### `useAuth()`
```typescript
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email, password) => Promise<{ error }>;
  signUp: (email, password, fullName) => Promise<{ error }>;
  signOut: () => Promise<void>;
}
```

### `usePermissionsV2(branchId?)`
```typescript
interface PermissionsV2 {
  loading: boolean;
  brandRole: BrandRole;
  localRole: LocalRole;
  accessibleBranches: Branch[];
  isSuperadmin: boolean;
  isCoordinador: boolean;
  // ... más flags
  brand: BrandPermissions;  // Permisos de panel marca
  local: LocalPermissions;  // Permisos de panel local
  hasAccessToBranch: (branchId) => boolean;
  canApproveWithPin: boolean;
  refetch: () => void;
}
```

---

# SECCIÓN 5: ESTADO GLOBAL Y CONTEXTOS

## 5.1 CartContext

**Archivo:** `src/contexts/CartContext.tsx`

**Propósito:** Gestión del carrito de compras para e-commerce

**Estado que mantiene:**
| Variable | Tipo | Descripción |
|----------|------|-------------|
| `branch` | `Branch | null` | Sucursal seleccionada |
| `orderMode` | `'delivery' | 'takeaway'` | Modo de orden |
| `deliveryAddress` | `string` | Dirección de entrega |
| `items` | `CartItem[]` | Items del carrito |
| `pendingBranchChange` | `Branch | null` | Sucursal pendiente de cambio |
| `showBranchChangeModal` | `boolean` | Modal de confirmación |

**Funciones expuestas:**
| Función | Descripción |
|---------|-------------|
| `setBranch(branch)` | Cambia sucursal (con confirmación si hay items) |
| `setOrderMode(mode)` | Cambia modo delivery/takeaway |
| `addItem(item)` | Agrega item al carrito |
| `updateItemQuantity(id, qty)` | Actualiza cantidad |
| `removeItem(id)` | Elimina item |
| `clearCart()` | Vacía carrito |
| `confirmBranchChange(branch)` | Confirma cambio de sucursal |
| `cancelBranchChange()` | Cancela cambio |

**Persistencia:** localStorage con key `hoppiness_cart`, expira en 24h

**Consumidores:**
- `PedirBranch.tsx`
- `ProductSheet.tsx`
- `CartSummary.tsx`
- `FloatingCartButton.tsx`
- `Checkout.tsx`

## 5.2 DashboardFilterContext

**Archivo:** `src/contexts/DashboardFilterContext.tsx`

**Propósito:** Filtros compartidos para dashboards

**Estado que mantiene:**
| Variable | Tipo | Descripción |
|----------|------|-------------|
| `channel` | `SalesChannelFilter` | Filtro de canal |
| `period` | `PeriodPreset` | Período (today, week, month, etc.) |
| `customRange` | `DateRange` | Rango personalizado |

**Funciones expuestas:**
| Función | Descripción |
|---------|-------------|
| `setChannel(channel)` | Cambia filtro de canal |
| `setPeriod(period)` | Cambia período |
| `setCustomRange(range)` | Establece rango custom |

**Valores computados:**
- `dateRange` - Rango de fechas efectivo
- `channelLabel` - Label legible del canal
- `periodLabel` - Label legible del período
- `isFiltered` - Si hay algún filtro activo

---

# SECCIÓN 6: QUERIES Y MUTATIONS

## 6.1 Configuración de React Query

**Archivo:** `src/App.tsx`

```typescript
const queryClient = new QueryClient();
// Usa configuración por defecto de TanStack Query v5
```

**Defaults implícitos:**
- `staleTime`: 0 (datos se marcan stale inmediatamente)
- `gcTime`: 5 minutos
- `retry`: 3
- `refetchOnWindowFocus`: true

## 6.2 Queries Principales (por archivo)

| Query Key | Archivo | Tabla/Endpoint | Descripción |
|-----------|---------|----------------|-------------|
| `['branch', id]` | Varios | `branches` | Detalle de sucursal |
| `['branches']` | `Branches.tsx` | `branches` | Lista de sucursales |
| `['products']` | `Products.tsx` | `products` | Lista de productos |
| `['product', id]` | `ProductForm.tsx` | `products` | Detalle producto |
| `['modifiers']` | `Modifiers.tsx` | `modifier_groups` + `modifier_options` | Modificadores |
| `['ingredients']` | `Ingredients.tsx` | `ingredients` | Ingredientes |
| `['suppliers']` | `Suppliers.tsx` | `suppliers` | Proveedores |
| `['orders', branchId]` | `LocalPedidos.tsx` | `orders` | Pedidos activos |
| `['order-history', branchId]` | `LocalHistorial.tsx` | `orders` | Historial |
| `['cash-shift', branchId]` | `useShiftStatus.ts` | `cash_register_shifts` | Turno activo |
| `['channels']` | `useChannels.ts` | `channels` | Canales de venta |
| `['user-roles']` | `useUserRole.tsx` | `user_roles` | Roles del usuario |
| `['user-role-v2']` | `usePermissionsV2.ts` | `user_roles_v2` | Roles V2 |
| `['permission', key, branchId]` | `usePermission.ts` | RPC `has_branch_permission` | Permiso específico |
| `['employees', branchId]` | `LocalTeam.tsx` | `employees` | Empleados |
| `['transactions', branchId]` | `LocalTransactions.tsx` | `transactions` | Transacciones |
| `['stock', branchId]` | `LocalStock.tsx` | `branch_ingredients` | Stock actual |

## 6.3 Mutations Principales

| Mutation | Archivo | Operación | Invalida |
|----------|---------|-----------|----------|
| `createProduct` | `ProductForm.tsx` | INSERT products | `['products']` |
| `updateProduct` | `ProductForm.tsx` | UPDATE products | `['products']`, `['product', id]` |
| `deleteProduct` | `Products.tsx` | DELETE products | `['products']` |
| `updateOrderStatus` | `LocalPedidos.tsx` | UPDATE orders.status | `['orders']` |
| `createOrder` | `POSView.tsx` | INSERT orders + order_items | `['orders']` |
| `openCashShift` | `OpenCashModal.tsx` | INSERT cash_register_shifts | `['cash-shift']` |
| `closeCashShift` | `LocalCierreTurno.tsx` | UPDATE cash_register_shifts | `['cash-shift']` |
| `createTransaction` | `LocalTransactions.tsx` | INSERT transactions | `['transactions']` |
| `updateBranch` | `BranchEditPanel.tsx` | UPDATE branches | `['branch']`, `['branches']` |
| `clockIn/Out` | `ClockInModal.tsx` | INSERT attendance_logs | `['attendance']` |

---

# SECCIÓN 7: INTEGRACIONES EXTERNAS

## 7.1 Supabase Auth

**Estado:** ✅ Implementada

**Configuración:**
- URL: Variable de entorno `VITE_SUPABASE_URL`
- Anon Key: Variable de entorno `VITE_SUPABASE_PUBLISHABLE_KEY`
- Auto-confirm habilitado

**Archivos:**
- `src/integrations/supabase/client.ts`
- `src/hooks/useAuth.tsx`

## 7.2 Supabase Storage

**Estado:** ✅ Implementada

**Buckets:**
| Bucket | Público | Uso |
|--------|---------|-----|
| `product-images` | Sí | Imágenes de productos |
| `employee-documents` | No | Documentos de empleados |
| `staff-documents` | No | Documentos de staff |
| `invoices` | Sí | Facturas escaneadas |

**Archivos:**
- `src/pages/admin/ProductForm.tsx` (upload imágenes)
- `src/pages/local/LocalStockFactura.tsx` (upload facturas)

## 7.3 Google Maps

**Estado:** 🟡 Parcial

**Uso:** Selector de direcciones, zonas de delivery

**Archivos:**
- `src/components/maps/DeliveryZoneMap.tsx`
- `src/components/maps/BranchLocationMap.tsx`
- `supabase/functions/google-maps-key/index.ts`

**Secretos:** `GOOGLE_MAPS_API_KEY`

## 7.4 Resend (Email)

**Estado:** ✅ Implementada

**Uso:** Notificaciones de contacto, invitaciones

**Edge Functions:**
- `contact-notification` - Envía email al recibir formulario de contacto
- `send-staff-invitation` - Envía invitación a nuevo staff

**Secretos:** `RESEND_API_KEY`, `CONTACT_NOTIFICATION_EMAIL`

## 7.5 Facturante (Facturación AFIP)

**Estado:** 🟡 Parcial

**Uso:** Generación de facturas electrónicas

**Edge Functions:**
- `facturante-invoice` - Genera factura vía API Facturante
- `generate-invoice` - Wrapper para generación

**Problemas conocidos:**
- No hay UI completa para gestionar facturas
- Falta integración con POS

## 7.6 Procesamiento de Facturas (AI)

**Estado:** ✅ Implementada

**Uso:** Extracción de datos de facturas escaneadas

**Edge Functions:**
- `process-invoice` - Usa AI para extraer datos de factura

**Archivos:**
- `src/pages/admin/InvoiceScanner.tsx`
- `src/components/admin/InvoiceReviewDialog.tsx`

## 7.7 Integraciones de Delivery (Rappi, PedidosYa, MP Delivery)

**Estado:** 🔴 Solo UI

**Descripción:** Existen flags en `branches` pero no hay integración real con APIs

**Campos en branches:**
- `rappi_enabled`
- `pedidosya_enabled`
- `mercadopago_delivery_enabled`

**Webhook preparado:** `webhook-orders/index.ts` (estructura base)

---

# SECCIÓN 8: UI/UX - COMPONENTES Y DISEÑO

## 8.1 Sistema de Diseño

### Colores (HSL)

| Variable | Valor Light | Valor Dark | Uso |
|----------|-------------|------------|-----|
| `--primary` | 234 100% 30% | 234 100% 50% | Hoppiness Blue (#00139b) |
| `--accent` | 17 100% 56% | 17 100% 60% | Hoppiness Orange (#ff521d) |
| `--warning` | 48 100% 56% | 48 100% 56% | Hoppiness Yellow (#ffd41f) |
| `--success` | 142 70% 45% | 142 70% 40% | Verde éxito |
| `--destructive` | 0 84% 60% | 0 70% 45% | Rojo error |
| `--background` | 0 0% 100% | 234 50% 5% | Fondo |
| `--foreground` | 234 100% 15% | 0 0% 98% | Texto principal |
| `--muted` | 234 15% 94% | 234 30% 12% | Fondo secundario |
| `--muted-foreground` | 234 10% 40% | 0 0% 60% | Texto secundario |
| `--sidebar-background` | 234 100% 10% | 234 50% 4% | Sidebar oscuro |

### Tipografía

| Clase | Fuente | Uso |
|-------|--------|-----|
| `font-brand` | Space Mono | Títulos de marca |
| Default | System fonts | Texto general |

### Spacing

- Base: 4px (0.25rem)
- Padding cards: `p-4` (1rem)
- Gap grids: `gap-4` (1rem)
- Secciones: `space-y-6` (1.5rem)

### Breakpoints

| Nombre | Valor | Uso |
|--------|-------|-----|
| `sm` | 640px | Mobile landscape |
| `md` | 768px | Tablet |
| `lg` | 1024px | Desktop |
| `xl` | 1280px | Desktop grande |
| `2xl` | 1400px | Container max-width |

## 8.2 Componentes UI Base (shadcn)

**Total:** 53 componentes en `/src/components/ui/`

### Componentes más usados:
| Componente | Descripción |
|------------|-------------|
| `Button` | Botones con variants (default, destructive, outline, secondary, ghost, link) |
| `Card` | Cards con Header, Title, Description, Content, Footer |
| `Dialog` | Modales |
| `Sheet` | Paneles deslizantes (sidebar mobile) |
| `Table` | Tablas con Header, Body, Row, Cell |
| `Tabs` | Tabs con List, Trigger, Content |
| `Select` | Dropdowns |
| `Input` | Inputs de texto |
| `Badge` | Badges/Pills |
| `Skeleton` | Loading placeholders |
| `Tooltip` | Tooltips |
| `Collapsible` | Secciones colapsables |

### Componentes custom:
| Componente | Descripción |
|------------|-------------|
| `HoppinessLoader` | Loader con logo Hoppiness animado |
| `ExternalLink` | Link que abre en nueva pestaña (para iframe) |
| `RestrictedField` | Input que requiere autorización |

## 8.3 Patrones de UI

### Tablas
- Usa `Table` de shadcn
- Headers fijos con `sticky`
- Scroll horizontal en mobile
- Acciones en columna final

### Formularios
- React Hook Form + Zod
- Componentes `Form*` de shadcn
- Validación en submit
- Toast de éxito/error con Sonner

### Modales
- `Dialog` para modales centrados
- `Sheet` para paneles laterales
- `AlertDialog` para confirmaciones

### Loading States
- `Skeleton` para loading inicial
- `HoppinessLoader` para página completa
- Spinner en botones

### Empty States
- Componente `EmptyState` con icono, mensaje, descripción
- Acción opcional

### Toasts
- Sonner para notificaciones
- `toast.success()`, `toast.error()`, `toast.info()`

---

# SECCIÓN 9: FUNCIONALIDADES - ESTADO DETALLADO

## Autenticación

| Funcionalidad | Estado | Notas |
|---------------|--------|-------|
| Login con email/password | ✅ Completa | |
| Registro de usuarios | ✅ Completa | Auto-confirm habilitado |
| Logout | ✅ Completa | |
| Recuperar contraseña | ⚪ No existe | No implementado |
| Perfil de usuario | 🟡 Parcial | Solo visualización |

## Mi Marca - Visión General

| Funcionalidad | Estado | Notas |
|---------------|--------|-------|
| Dashboard | ✅ Completa | KPIs, alertas, métricas |
| Resultados (P&L) | 🟡 Parcial | Falta granularidad |
| Comparativa de Locales | ✅ Completa | |

## Mi Marca - Catálogo

| Funcionalidad | Estado | Notas |
|---------------|--------|-------|
| Productos CRUD | ✅ Completa | Con imágenes y modificadores |
| Modificadores CRUD | ✅ Completa | Grupos y opciones |
| Ingredientes CRUD | ✅ Completa | Con recetas |
| Descuentos CRUD | 🟡 Parcial | UI básica |
| Categorías CRUD | ✅ Completa | |

## Mi Marca - Abastecimiento

| Funcionalidad | Estado | Notas |
|---------------|--------|-------|
| Proveedores Autorizados | ✅ Completa | |
| Asignación de Proveedores | ✅ Completa | Control brand_only/preferred/free |

## Mi Marca - Personas

| Funcionalidad | Estado | Notas |
|---------------|--------|-------|
| Equipo Central | ✅ Completa | Invitar por email |
| Usuarios | ✅ Completa | Lista con filtros |
| Plantillas de Roles | ✅ Completa | Brand y Local |

## Mi Local - Operación

| Funcionalidad | Estado | Notas |
|---------------|--------|-------|
| Dashboard | ✅ Completa | Con filtros de período |
| Integrador | ✅ Completa | Pedidos de todos los canales |
| POS | ✅ Completa | Completo con modificadores |
| KDS | ✅ Completa | Con estaciones |
| Pedidos Activos | ✅ Completa | |
| Historial | ✅ Completa | |
| Cierre de Turno | ✅ Completa | |

## Mi Local - Caja

| Funcionalidad | Estado | Notas |
|---------------|--------|-------|
| Caja del Día | ✅ Completa | Apertura/cierre |
| Movimientos | ✅ Completa | Ingresos/egresos |
| CC Clientes | 🟡 Parcial | UI básica |

## Mi Local - Stock

| Funcionalidad | Estado | Notas |
|---------------|--------|-------|
| Stock Actual | ✅ Completa | |
| Pedir a Proveedor | 🟡 Parcial | Solo UI |
| Conteo Inventario | ✅ Completa | |
| Ajustes | 🟡 Parcial | Via movimientos |

## Mi Local - Compras

| Funcionalidad | Estado | Notas |
|---------------|--------|-------|
| Cargar Factura | ✅ Completa | Con AI |
| Proveedores | ✅ Completa | |
| CC Proveedores | ✅ Completa | |
| Historial | ✅ Completa | |

## Mi Local - Menú

| Funcionalidad | Estado | Notas |
|---------------|--------|-------|
| Productos (disponibilidad) | ✅ Completa | Toggle por producto |
| Combos | 🔴 Rota | Página vacía |
| Extras | ✅ Completa | Modificadores |

## Mi Local - Equipo

| Funcionalidad | Estado | Notas |
|---------------|--------|-------|
| Mi Equipo | ✅ Completa | Lista con invitaciones |
| Fichajes | ✅ Completa | Con QR |
| Horarios | ✅ Completa | Calendario mensual |
| Horas del Mes | ✅ Completa | |
| Liquidación | 🟡 Parcial | UI básica |

## Mi Local - Reportes

| Funcionalidad | Estado | Notas |
|---------------|--------|-------|
| Ventas | ✅ Completa | |
| Resultados (P&L) | 🟡 Parcial | |
| CMV | 🟡 Parcial | |
| Movimientos Stock | ✅ Completa | |

## Mi Local - Finanzas

| Funcionalidad | Estado | Notas |
|---------------|--------|-------|
| Movimientos | ✅ Completa | |
| Facturas Emitidas | 🟡 Parcial | Solo visualización |
| Obligaciones | 🟡 Parcial | UI básica |

## Mi Local - Configuración

| Funcionalidad | Estado | Notas |
|---------------|--------|-------|
| Datos del Local | ✅ Completa | |
| Turnos | ✅ Completa | |
| Zonas Delivery | ✅ Completa | Con mapa |
| Integraciones | 🟡 Parcial | Solo flags, no APIs reales |
| Impresoras | 🔴 Solo UI | No funciona |
| Config KDS | ✅ Completa | Estaciones |

---

# SECCIÓN 10: CÓDIGO MUERTO Y PROBLEMAS

## 10.1 Archivos que No Se Usan

| Archivo | Razón |
|---------|-------|
| `src/pages/admin/UsersV2.tsx` | Reemplazado por `UsersPage.tsx` |
| `src/pages/admin/Users.tsx` | Versión legacy |
| `src/hooks/useRoleLanding.ts` | Reemplazado por `useRoleLandingV2.ts` |
| `src/pages/admin/Dashboard.tsx` | Solo layout, `AdminHome.tsx` es el contenido |

## 10.2 Tablas Sin UI Completa

| Tabla | Estado UI |
|-------|-----------|
| `coa_accounts` | Sin UI |
| `loans` / `loan_installments` | Sin UI |
| `payment_plans` / `payment_plan_installments` | Sin UI |
| `payroll_*` | UI básica |
| `operator_session_logs` | Solo escritura |

## 10.3 TODOs y FIXMEs Encontrados

| Archivo | Línea | Comentario |
|---------|-------|------------|
| `CartContext.tsx` | 244 | `// TODO: Calculate from branch/zone` (delivery fee) |
| `Contacto.tsx` | 250 | `// TODO: Estos son datos placeholder` |
| `Notifications.tsx` | 82 | `// TODO: Save to database` |
| `LocalDeliveryZones.tsx` | 72 | `// TODO: Add lat/lng columns to branches table` |

## 10.4 Inconsistencias de Naming

| Patrón 1 | Patrón 2 | Archivos |
|----------|----------|----------|
| `useUserRole` | `useUserRoles` | Hooks duplicados |
| `Local*` | `LocalRRHH*` | Páginas de equipo |
| `camelCase` | `snake_case` | Nombres de tablas vs columnas |

## 10.5 Problemas de Performance Detectados

| Problema | Archivo | Descripción |
|----------|---------|-------------|
| Query sin cache | Varios | Queries sin `staleTime` causan refetch |
| Re-renders | `LocalLayout.tsx` | Recalcula navegación en cada render |
| N+1 queries | `LocalPedidos.tsx` | Fetch separado por cada pedido |

## 10.6 Duplicaciones Funcionales

| Duplicación | Archivos | Severidad |
|-------------|----------|-----------|
| Gestión de usuarios | `Users.tsx`, `UsersV2.tsx`, `UsersPage.tsx` | Alta |
| Config integraciones | `LocalConfig.tsx`, `LocalIntegraciones.tsx` | Media |
| POS standalone vs embedded | `/pos/*`, `/local/:id/pos` | Media |

---

# SECCIÓN 11: VARIABLES DE ENTORNO

## Variables Requeridas

| Variable | Descripción | Dónde se usa |
|----------|-------------|--------------|
| `VITE_SUPABASE_URL` | URL de Supabase | Cliente Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Anon key | Cliente Supabase |
| `VITE_SUPABASE_PROJECT_ID` | Project ID | Edge functions |

## Secretos de Edge Functions

| Secreto | Descripción |
|---------|-------------|
| `SUPABASE_URL` | URL interna |
| `SUPABASE_ANON_KEY` | Anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key |
| `SUPABASE_DB_URL` | Connection string DB |
| `GOOGLE_MAPS_API_KEY` | API key Google Maps |
| `RESEND_API_KEY` | API key Resend |
| `CONTACT_NOTIFICATION_EMAIL` | Email para notificaciones |
| `LOVABLE_API_KEY` | API key Lovable AI |

---

# SECCIÓN 12: SCRIPTS Y BUILD

## package.json Scripts

| Script | Comando | Descripción |
|--------|---------|-------------|
| `dev` | `vite` | Desarrollo local |
| `build` | `vite build` | Build producción |
| `preview` | `vite preview` | Preview del build |
| `lint` | `eslint .` | Linting |
| `test` | `vitest` | Tests |

## Dependencias Principales

| Package | Versión | Uso |
|---------|---------|-----|
| `react` | ^18.3.1 | Framework UI |
| `react-router-dom` | ^6.30.1 | Routing |
| `@tanstack/react-query` | ^5.83.0 | Data fetching |
| `@supabase/supabase-js` | ^2.90.1 | Cliente Supabase |
| `tailwindcss` | (peer) | Estilos |
| `lucide-react` | ^0.462.0 | Iconos |
| `recharts` | ^2.15.4 | Gráficos |
| `react-hook-form` | ^7.61.1 | Formularios |
| `zod` | ^3.25.76 | Validación |
| `date-fns` | ^3.6.0 | Manejo de fechas |
| `sonner` | ^1.7.4 | Toasts |
| `@dnd-kit/*` | ^6-10 | Drag and drop |
| `@react-google-maps/api` | ^2.19.3 | Google Maps |
| `xlsx` | ^0.18.5 | Exportar Excel |
| `jspdf` | ^4.0.0 | Generar PDFs |
| `qrcode.react` | ^4.2.0 | Generar QR |

---

# SECCIÓN 13: RESUMEN EJECUTIVO

## Estadísticas del Proyecto

| Métrica | Valor |
|---------|-------|
| Total de tablas en BD | 107 |
| Total de views | 4 |
| Total de funciones SQL | 50+ |
| Total de triggers | 20+ |
| Total de archivos .tsx | ~200 |
| Total de archivos .ts | ~50 |
| Total de rutas | 80+ |
| Total de hooks custom | 26 |
| Total de contextos | 2 |
| Total de edge functions | 12 |

## Funcionalidades por Estado

| Estado | Cantidad | Porcentaje |
|--------|----------|------------|
| ✅ Completa | ~60 | 65% |
| 🟡 Parcial | ~25 | 27% |
| 🔴 Rota | 3 | 3% |
| ⚪ No existe | 5 | 5% |

## Problemas Críticos

1. **Sistema de roles duplicado** - `user_roles` legacy + `user_roles_v2` coexisten
2. **Integraciones de delivery solo UI** - Rappi/PedidosYa/MP sin conexión real
3. **Facturación AFIP incompleta** - Edge function existe pero sin UI completa
4. **Combos no funciona** - Página vacía
5. **Impresoras solo UI** - No hay integración real

## Deuda Técnica Identificada

1. **Migrar completamente a roles V2** - Eliminar `user_roles` legacy
2. **Consolidar usuarios** - 3 archivos para la misma funcionalidad
3. **Cache de queries** - Agregar `staleTime` a todas las queries
4. **Tests** - Solo existe archivo de setup, sin tests reales
5. **Código muerto** - Varios archivos no usados
6. **Documentación inline** - Faltan JSDoc en mayoría de componentes

## Recomendaciones Inmediatas

1. **Eliminar código duplicado** - Unificar archivos de usuarios
2. **Completar migración V2** - Deprecar sistema de roles legacy
3. **Agregar staleTime** - Mejorar performance de queries
4. **Implementar tests** - Al menos para flows críticos (POS, órdenes)
5. **Documentar hooks** - JSDoc para los 26 hooks custom
6. **Completar facturación** - UI para flujo AFIP completo
7. **Decidir sobre integraciones** - Implementar o remover flags de delivery apps

---

*Documento generado automáticamente. Última actualización: 2026-01-21*
