-- =====================================================
-- DROP LEGACY TABLES - MASSIVE CLEANUP
-- Ejecutar en orden por dependencias FK
-- =====================================================

-- Primero eliminar triggers de tablas que vamos a eliminar
DROP TRIGGER IF EXISTS update_employee_status_trigger ON attendance_logs;
DROP TRIGGER IF EXISTS record_shift_discrepancy_trigger ON cash_register_shifts;
DROP TRIGGER IF EXISTS update_customer_order_stats_trigger ON orders;
DROP TRIGGER IF EXISTS update_profile_order_stats_trigger ON orders;
DROP TRIGGER IF EXISTS update_customer_preferences_on_order_trigger ON orders;
DROP TRIGGER IF EXISTS create_sale_transaction_from_order_trigger ON orders;
DROP TRIGGER IF EXISTS deduct_stock_on_sale_trigger ON order_items;
DROP TRIGGER IF EXISTS validate_order_before_insert_trigger ON orders;
DROP TRIGGER IF EXISTS validate_order_item_before_insert_trigger ON order_items;
DROP TRIGGER IF EXISTS sync_customer_to_profile_trigger ON customers;
DROP TRIGGER IF EXISTS update_ingredient_stock_on_movement_trigger ON stock_movements;
DROP TRIGGER IF EXISTS sync_modifier_option_to_branches_trigger ON modifier_options;
DROP TRIGGER IF EXISTS sync_ingredient_to_branches_trigger ON ingredients;
DROP TRIGGER IF EXISTS sync_channel_to_all_trigger ON channels;
DROP TRIGGER IF EXISTS sync_product_to_channels_trigger ON products;
DROP TRIGGER IF EXISTS setup_branch_channels_trigger ON branches;
DROP TRIGGER IF EXISTS setup_default_schedules_trigger ON branches;
DROP TRIGGER IF EXISTS setup_default_cash_registers_trigger ON branches;
DROP TRIGGER IF EXISTS setup_branch_modifier_options_trigger ON branches;
DROP TRIGGER IF EXISTS setup_default_finance_accounts_trigger ON branches;
DROP TRIGGER IF EXISTS update_customer_account_balance_trigger ON customer_account_movements;

-- Grupo: Order-related (con FK a orders)
DROP TABLE IF EXISTS order_item_modifiers CASCADE;
DROP TABLE IF EXISTS order_item_stations CASCADE;
DROP TABLE IF EXISTS order_payments CASCADE;
DROP TABLE IF EXISTS order_cancellations CASCADE;
DROP TABLE IF EXISTS order_discounts CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;

-- Grupo: Productos/Catálogo
DROP TABLE IF EXISTS product_allowed_channels CASCADE;
DROP TABLE IF EXISTS product_modifier_options CASCADE;
DROP TABLE IF EXISTS product_modifier_assignments CASCADE;
DROP TABLE IF EXISTS product_station_assignments CASCADE;
DROP TABLE IF EXISTS product_recipes CASCADE;
DROP TABLE IF EXISTS branch_product_channel_availability CASCADE;
DROP TABLE IF EXISTS branch_products CASCADE;
DROP TABLE IF EXISTS branch_modifier_options CASCADE;
DROP TABLE IF EXISTS combo_items CASCADE;
DROP TABLE IF EXISTS combos CASCADE;
DROP TABLE IF EXISTS modifier_options CASCADE;
DROP TABLE IF EXISTS modifier_groups CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS product_categories CASCADE;

-- Grupo: Inventario
DROP TABLE IF EXISTS inventory_count_lines CASCADE;
DROP TABLE IF EXISTS inventory_counts CASCADE;
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS ingredient_conversions CASCADE;
DROP TABLE IF EXISTS ingredient_unit_conversions CASCADE;
DROP TABLE IF EXISTS ingredient_approved_suppliers CASCADE;
DROP TABLE IF EXISTS ingredient_suppliers CASCADE;
DROP TABLE IF EXISTS branch_ingredients CASCADE;
DROP TABLE IF EXISTS ingredients CASCADE;
DROP TABLE IF EXISTS ingredient_categories CASCADE;

-- Grupo: Caja Registradora
DROP TABLE IF EXISTS cash_register_movements CASCADE;
DROP TABLE IF EXISTS cashier_discrepancy_history CASCADE;
DROP TABLE IF EXISTS user_cash_registers CASCADE;
DROP TABLE IF EXISTS cash_register_shifts CASCADE;
DROP TABLE IF EXISTS cash_registers CASCADE;

-- Grupo: Clientes
DROP TABLE IF EXISTS customer_account_movements CASCADE;
DROP TABLE IF EXISTS branch_customer_accounts CASCADE;
DROP TABLE IF EXISTS customer_discounts CASCADE;
DROP TABLE IF EXISTS customer_preferences CASCADE;
DROP TABLE IF EXISTS customer_addresses CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS user_addresses CASCADE;
DROP TABLE IF EXISTS discounts CASCADE;

-- Grupo: Finanzas
DROP TABLE IF EXISTS loan_installments CASCADE;
DROP TABLE IF EXISTS loans CASCADE;
DROP TABLE IF EXISTS payment_plan_installments CASCADE;
DROP TABLE IF EXISTS payment_plans CASCADE;
DROP TABLE IF EXISTS payroll_payments CASCADE;
DROP TABLE IF EXISTS payroll_adjustments CASCADE;
DROP TABLE IF EXISTS payroll_entries CASCADE;
DROP TABLE IF EXISTS payroll_periods CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS transaction_categories CASCADE;
DROP TABLE IF EXISTS finance_accounts CASCADE;
DROP TABLE IF EXISTS tax_obligations CASCADE;
DROP TABLE IF EXISTS coa_accounts CASCADE;

-- Grupo: Proveedores
DROP TABLE IF EXISTS extracted_invoice_items CASCADE;
DROP TABLE IF EXISTS extracted_invoices CASCADE;
DROP TABLE IF EXISTS scanned_documents CASCADE;
DROP TABLE IF EXISTS supplier_invoice_items CASCADE;
DROP TABLE IF EXISTS supplier_invoices CASCADE;
DROP TABLE IF EXISTS supplier_payments CASCADE;
DROP TABLE IF EXISTS supplier_order_rules CASCADE;
DROP TABLE IF EXISTS supplier_orders CASCADE;
DROP TABLE IF EXISTS brand_purchase_alerts CASCADE;
DROP TABLE IF EXISTS brand_mandatory_products CASCADE;
DROP TABLE IF EXISTS brand_mandatory_categories CASCADE;
DROP TABLE IF EXISTS branch_suppliers CASCADE;
DROP TABLE IF EXISTS supplier_categories CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;

-- Grupo: Canales/Delivery
DROP TABLE IF EXISTS branch_channels CASCADE;
DROP TABLE IF EXISTS delivery_zones CASCADE;
DROP TABLE IF EXISTS channels CASCADE;
DROP TABLE IF EXISTS payment_methods CASCADE;
DROP TABLE IF EXISTS printers CASCADE;

-- Grupo: KDS
DROP TABLE IF EXISTS kds_tokens CASCADE;
DROP TABLE IF EXISTS kds_stations CASCADE;
DROP TABLE IF EXISTS kds_settings CASCADE;

-- Grupo: Attendance Legacy
DROP TABLE IF EXISTS attendance_tokens CASCADE;
DROP TABLE IF EXISTS attendance_records CASCADE;
DROP TABLE IF EXISTS attendance_logs CASCADE;

-- Grupo: Roles Legacy
DROP TABLE IF EXISTS permission_audit_logs CASCADE;
DROP TABLE IF EXISTS role_default_permissions CASCADE;
DROP TABLE IF EXISTS brand_template_permissions CASCADE;
DROP TABLE IF EXISTS brand_templates CASCADE;
DROP TABLE IF EXISTS local_template_permissions CASCADE;
DROP TABLE IF EXISTS local_templates CASCADE;
DROP TABLE IF EXISTS user_branch_permissions CASCADE;
DROP TABLE IF EXISTS permission_definitions CASCADE;
DROP TABLE IF EXISTS branch_permissions CASCADE;
DROP TABLE IF EXISTS user_panel_access CASCADE;
DROP TABLE IF EXISTS user_branch_access CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;

-- Grupo: Otros Legacy
DROP TABLE IF EXISTS employee_warnings CASCADE;
DROP TABLE IF EXISTS employee_documents CASCADE;
DROP TABLE IF EXISTS employee_private_details CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS availability_logs CASCADE;
DROP TABLE IF EXISTS availability_schedules CASCADE;
DROP TABLE IF EXISTS nucleo_product_mappings CASCADE;
DROP TABLE IF EXISTS operator_session_logs CASCADE;
DROP TABLE IF EXISTS sales_import_details CASCADE;
DROP TABLE IF EXISTS sales_imports CASCADE;
DROP TABLE IF EXISTS shift_notes CASCADE;
DROP TABLE IF EXISTS daily_sales CASCADE;
DROP TABLE IF EXISTS branch_schedules CASCADE;
DROP TABLE IF EXISTS branch_shift_settings CASCADE;
DROP TABLE IF EXISTS brand_settings CASCADE;
DROP TABLE IF EXISTS user_invitations CASCADE;

-- Drop deprecated enum types if exist
DROP TYPE IF EXISTS app_role CASCADE;
DROP TYPE IF EXISTS payment_type CASCADE;
DROP TYPE IF EXISTS order_status CASCADE;
DROP TYPE IF EXISTS sales_channel CASCADE;
DROP TYPE IF EXISTS invoice_type CASCADE;

-- Drop legacy functions that reference deleted tables
DROP FUNCTION IF EXISTS public.validate_order_before_insert() CASCADE;
DROP FUNCTION IF EXISTS public.validate_order_item_before_insert() CASCADE;
DROP FUNCTION IF EXISTS public.update_customer_order_stats() CASCADE;
DROP FUNCTION IF EXISTS public.update_profile_order_stats() CASCADE;
DROP FUNCTION IF EXISTS public.update_customer_preferences_on_order() CASCADE;
DROP FUNCTION IF EXISTS public.create_sale_transaction_from_order() CASCADE;
DROP FUNCTION IF EXISTS public.deduct_stock_on_sale() CASCADE;
DROP FUNCTION IF EXISTS public.sync_customer_to_profile() CASCADE;
DROP FUNCTION IF EXISTS public.update_ingredient_stock_on_movement() CASCADE;
DROP FUNCTION IF EXISTS public.sync_modifier_option_to_branches() CASCADE;
DROP FUNCTION IF EXISTS public.sync_ingredient_to_branches() CASCADE;
DROP FUNCTION IF EXISTS public.sync_channel_to_all() CASCADE;
DROP FUNCTION IF EXISTS public.sync_product_to_channels() CASCADE;
DROP FUNCTION IF EXISTS public.setup_branch_channels() CASCADE;
DROP FUNCTION IF EXISTS public.setup_default_schedules() CASCADE;
DROP FUNCTION IF EXISTS public.setup_default_cash_registers() CASCADE;
DROP FUNCTION IF EXISTS public.setup_branch_modifier_options() CASCADE;
DROP FUNCTION IF EXISTS public.setup_default_finance_accounts() CASCADE;
DROP FUNCTION IF EXISTS public.update_customer_account_balance() CASCADE;
DROP FUNCTION IF EXISTS public.update_employee_status() CASCADE;
DROP FUNCTION IF EXISTS public.record_shift_discrepancy() CASCADE;
DROP FUNCTION IF EXISTS public.find_or_create_customer(text, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.toggle_product_channel_availability(uuid, uuid, uuid, boolean, text) CASCADE;
DROP FUNCTION IF EXISTS public.get_branch_active_channels(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_available_products_for_channel(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.is_item_available_now(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.calculate_product_cost(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.execute_ingredient_conversion(uuid, uuid, uuid, numeric, uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.get_cashier_discrepancy_stats(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_shift_expenses(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_shift_advances(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.validate_kds_token(text) CASCADE;
DROP FUNCTION IF EXISTS public.validate_supervisor_pin(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.grant_role_defaults(uuid, uuid, app_role) CASCADE;
DROP FUNCTION IF EXISTS public.has_role(app_role, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.has_role_in_branch(uuid, text, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.can_use_local_panel_v2(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.can_use_brand_panel_v2(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_branch_roles(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.check_is_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.check_is_franquiciado_for_branch(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_admin_v2(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.has_branch_permission(uuid, text, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.has_branch_permission(uuid, uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.has_branch_access(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.can_view_employee_private_details(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_branch_effective_state(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_branch_sensitive_data(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.log_sensitive_access() CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_expired_tokens() CASCADE;