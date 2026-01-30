
# Plan: Limpieza Legacy + Actualización de Código + Políticas de Seguridad

## Resumen Ejecutivo

Se realizará una limpieza profunda del sistema, eliminando +90 tablas y funciones legacy que ya no se usan, actualizando el código para que solo trabaje con el sistema activo, e implementando políticas de seguridad coherentes con la arquitectura simplificada actual.

---

## Análisis: Tablas Activas vs Legacy

### Tablas que se MANTIENEN (24 tablas)

| Tabla | Uso | Registros |
|-------|-----|-----------|
| `profiles` | Datos de usuarios | 19 |
| `user_roles_v2` | Roles (brand_role, local_role) | 2 |
| `branches` | Sucursales | 6 |
| `branch_shifts` | Turnos por local | 20 |
| `clock_entries` | Fichajes (entrada/salida) | 0 |
| `shift_closures` | Cierres de turno detallados | 0 |
| `salary_advances` | Adelantos de sueldo | 0 |
| `regulations` | Reglamentos (PDFs) | 1 |
| `regulation_signatures` | Firmas de reglamento | 0 |
| `communications` | Mensajes | 0 |
| `communication_reads` | Lecturas de mensajes | 0 |
| `employee_schedules` | Horarios programados | 0 |
| `schedule_requests` | Solicitudes de días libres | 0 |
| `special_days` | Feriados | 0 |
| `employee_data` | Datos laborales (fecha ingreso, horas) | 0 |
| `warnings` | Apercibimientos | 0 |
| `contact_messages` | Formularios de contacto | 1 |
| `user_invitations` | Invitaciones pendientes | 1 |
| `staff_invitations` | Invitaciones de staff | 0 |
| `branch_closure_config` | Config cierre por sucursal | 0 |
| `brand_closure_config` | Config cierre global | 0 |
| `audit_logs` | Logs de auditoría | 0 |

### Tablas que se ELIMINAN (100+ tablas)

**Grupo: Pedidos/POS (sin uso)**
- orders, order_items, order_cancellations, order_discounts
- order_item_modifiers, order_item_stations, order_payments

**Grupo: Productos/Catálogo (sin uso)**
- products, product_categories, product_recipes
- product_allowed_channels, product_modifier_options
- product_modifier_assignments, product_station_assignments
- modifier_groups, modifier_options
- branch_products, branch_modifier_options
- branch_product_channel_availability, combos, combo_items

**Grupo: Inventario (sin uso)**
- ingredients, ingredient_categories, ingredient_suppliers
- ingredient_approved_suppliers, ingredient_conversions
- ingredient_unit_conversions
- branch_ingredients, stock_movements
- inventory_counts, inventory_count_lines

**Grupo: Caja Registradora (sin uso)**
- cash_registers, cash_register_shifts, cash_register_movements
- cashier_discrepancy_history, user_cash_registers

**Grupo: Clientes (sin uso)**
- customers, customer_addresses, customer_preferences
- customer_discounts, branch_customer_accounts, customer_account_movements
- user_addresses, discounts

**Grupo: Finanzas (sin uso)**
- transactions, transaction_categories, finance_accounts
- payroll_entries, payroll_periods, payroll_adjustments, payroll_payments
- loans, loan_installments, payment_plans, payment_plan_installments
- tax_obligations, coa_accounts

**Grupo: Proveedores (sin uso)**
- suppliers, supplier_categories, supplier_orders, supplier_payments
- supplier_invoices, supplier_invoice_items, supplier_order_rules
- branch_suppliers, brand_purchase_alerts
- extracted_invoices, extracted_invoice_items, scanned_documents

**Grupo: Canales/Delivery (sin uso)**
- channels, branch_channels, delivery_zones
- payment_methods, printers

**Grupo: KDS (sin uso)**
- kds_settings, kds_stations, kds_tokens

**Grupo: Attendance Legacy (reemplazado por clock_entries)**
- attendance_records, attendance_tokens, attendance_logs

**Grupo: Roles Legacy (reemplazado por user_roles_v2)**
- user_roles, user_panel_access, user_branch_access
- branch_permissions, user_branch_permissions
- permission_definitions, permission_audit_logs, role_default_permissions
- brand_templates, brand_template_permissions
- local_templates, local_template_permissions

**Grupo: Otros Legacy**
- employees (vacío, migrado a user_roles_v2 + employee_data)
- employee_private_details, employee_documents, employee_warnings
- availability_schedules, availability_logs
- nucleo_product_mappings, operator_session_logs
- sales_imports, sales_import_details, shift_notes
- branch_schedules, branch_shift_settings
- brand_settings, brand_mandatory_categories, brand_mandatory_products

---

## Cambios de Código

### 1. `src/components/cuenta/MySalaryAdvancesCard.tsx`
**Problema**: Usa tabla `employees` para buscar por teléfono
**Solución**: Usar `user_roles_v2` + `salary_advances.user_id` directamente

```tsx
// ANTES: Busca employee_id por phone
const { data } = await supabase
  .from('employees')
  .select('id')
  .eq('phone', profile.phone);

// DESPUÉS: Usa user_id directamente
const { data, error } = await supabase
  .from('salary_advances')
  .select('id, amount, status, ...')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false });
```

### 2. `src/pages/RegistroStaff.tsx`
**Problema**: Escribe a tabla `user_roles` legacy
**Solución**: Escribir a `user_roles_v2` con estructura V2

```tsx
// ANTES
await supabase.from('user_roles').insert({
  user_id: userId,
  role: invitation.role,
});

// DESPUÉS
await supabase.from('user_roles_v2').upsert({
  user_id: userId,
  local_role: invitation.role, // 'encargado' | 'cajero' | 'empleado'
  branch_ids: [invitation.branch_id],
  is_active: true,
});
```

### 3. `src/pages/admin/BrandHome.tsx`
**Problema**: Lee de `orders`, `order_items`, `attendance_logs` (todas legacy/vacías)
**Solución**: Usar `shift_closures` y `clock_entries`

```tsx
// ANTES: Calcula métricas de tablas vacías
const ordersRes = await supabase.from('orders')...
const orderItemsRes = await supabase.from('order_items')...
const attendanceRes = await supabase.from('attendance_logs')...

// DESPUÉS: Usa datos reales
const closuresRes = await supabase.from('shift_closures')
  .select('total_facturado, total_hamburguesas, branch_id')
  .gte('fecha', firstDayOfMonth);

const clockRes = await supabase.from('clock_entries')
  .select('user_id, entry_type, created_at, branch_id')
  .gte('created_at', firstDayOfMonth);
```

### 4. `src/components/admin/users/useUsersData.ts`
**Problema**: Lee `orders` para calcular total_orders/total_spent
**Solución**: Eliminar estas métricas (no hay pedidos en el sistema actual)

### 5. `src/components/admin/users/UserExpandedRow.tsx`
**Problema**: Lee `user_addresses` y `orders`
**Solución**: Eliminar estas secciones que muestran datos inexistentes

### 6. `src/hooks/useSalaryAdvances.ts`
**Problema**: Usa `employee_id` (legacy) y `cash_register_movements`
**Solución**: Eliminar referencia a employee_id y cash_register_movements

---

## Edge Functions a ELIMINAR

| Función | Motivo |
|---------|--------|
| `attendance-token` | Usa `attendance_records` y `attendance_tokens` legacy |
| `create-web-order` | Sistema de pedidos no implementado |
| `webhook-orders` | Sistema de pedidos no implementado |
| `order-tracking` | Sistema de pedidos no implementado |
| `generate-invoice` | Facturación automática no implementada |
| `facturante-invoice` | Facturación automática no implementada |
| `generate-pos-thumbnail` | POS no implementado |
| `process-invoice` | Sin uso en código |

### Edge Functions que se MANTIENEN

| Función | Uso |
|---------|-----|
| `contact-notification` | Emails de contacto (activo) |
| `send-staff-invitation` | Invitaciones de empleados (activo) |
| `google-maps-key` | Mapa en landing (activo) |
| `send-schedule-notification` | Notificaciones de horarios |
| `seed-test-users` | Testing (opcional) |

---

## Políticas de Seguridad (RLS) Simplificadas

Solo para las 24 tablas activas, sin funciones complicadas de permisos legacy:

### Funciones Helper Core

```sql
-- Superadmin check
CREATE OR REPLACE FUNCTION public.is_superadmin(_user_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles_v2
    WHERE user_id = _user_id AND brand_role = 'superadmin' AND is_active = true
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Branch access check
CREATE OR REPLACE FUNCTION public.can_access_branch(_user_id uuid, _branch_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles_v2
    WHERE user_id = _user_id AND is_active = true
    AND (brand_role = 'superadmin' OR _branch_id = ANY(branch_ids))
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- HR role check (franquiciado/encargado)
CREATE OR REPLACE FUNCTION public.is_hr_role(_user_id uuid, _branch_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles_v2
    WHERE user_id = _user_id AND is_active = true
    AND (
      brand_role = 'superadmin'
      OR (local_role IN ('franquiciado', 'encargado') AND _branch_id = ANY(branch_ids))
    )
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;
```

### Políticas por Tabla

| Tabla | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `profiles` | Autenticado: propio perfil + HR ve su equipo | Trigger auth.users | Propio perfil | Admin |
| `user_roles_v2` | Admin | Admin | Admin | Admin |
| `branches` | Público (activas) + Staff (asignadas) | Admin | Admin | Admin |
| `branch_shifts` | Staff de la sucursal | Admin | Encargado+ | Admin |
| `clock_entries` | Propio + HR de la sucursal | Público (fichaje) | Admin | Admin |
| `shift_closures` | Staff de la sucursal | Encargado+ | Encargado+ | Admin |
| `salary_advances` | Propio + HR de la sucursal | HR de la sucursal | HR | Admin |
| `regulations` | Staff (activo) | Admin | Admin | Admin |
| `regulation_signatures` | Propio + HR | Encargado (sube firma) | Admin | Admin |
| `communications` | Staff (destinatario) | Admin/Encargado | Admin | Admin |
| `communication_reads` | Propio | Autenticado | - | - |
| `employee_schedules` | Propio + HR de la sucursal | HR | HR | HR |
| `schedule_requests` | Propio + HR | Autenticado | HR | HR |
| `warnings` | Propio + HR | HR | HR | Admin |
| `contact_messages` | Admin | Público | - | - |
| `user_invitations` | Admin | Admin | Admin | Admin |

---

## Orden de Ejecución

### Fase 1: Actualizar Código (sin romper nada)
1. Actualizar `MySalaryAdvancesCard.tsx` para usar `user_id`
2. Actualizar `RegistroStaff.tsx` para escribir a `user_roles_v2`
3. Actualizar `BrandHome.tsx` para usar `shift_closures` + `clock_entries`
4. Limpiar `useUsersData.ts` y `UserExpandedRow.tsx` de queries legacy

### Fase 2: Crear Políticas de Seguridad
1. Crear funciones helper simplificadas
2. Habilitar RLS en las 24 tablas activas
3. Crear políticas coherentes

### Fase 3: Eliminar Legacy
1. Eliminar Edge Functions no usadas
2. Drop todas las tablas legacy
3. Drop funciones SQL legacy

### Fase 4: Verificación
1. Test fichaje
2. Test cierre de turno
3. Test panel Mi Cuenta
4. Test panel Mi Local
5. Test panel Mi Marca

---

## Beneficios

- Base de datos limpia con solo 24 tablas en lugar de 120+
- Código sin referencias a sistemas inexistentes
- Políticas de seguridad coherentes y auditables
- Menor complejidad de mantenimiento
- Menor tamaño de respaldo
- Queries más rápidas (menos índices/triggers)
