-- =============================================
-- PERMISSION KEYS SYSTEM IMPLEMENTATION
-- =============================================

-- 1. Create permission definitions table (reference/catalog)
CREATE TABLE public.permission_definitions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key text UNIQUE NOT NULL,
    name text NOT NULL,
    description text,
    module text NOT NULL,
    min_role app_role NOT NULL DEFAULT 'empleado',
    created_at timestamptz DEFAULT now()
);

-- 2. Create user_branch_permissions junction table for granular permissions
CREATE TABLE public.user_branch_permissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    permission_key text NOT NULL,
    granted_at timestamptz DEFAULT now(),
    granted_by uuid,
    UNIQUE(user_id, branch_id, permission_key)
);

-- 3. Enable RLS
ALTER TABLE public.permission_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_branch_permissions ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for permission_definitions (read-only for all authenticated)
CREATE POLICY "Anyone can view permission definitions"
ON public.permission_definitions FOR SELECT
USING (true);

CREATE POLICY "Only admins can manage permission definitions"
ON public.permission_definitions FOR ALL
USING (is_admin(auth.uid()));

-- 5. RLS Policies for user_branch_permissions
CREATE POLICY "Users can view own permissions"
ON public.user_branch_permissions FOR SELECT
USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Admins can manage all permissions"
ON public.user_branch_permissions FOR ALL
USING (is_admin(auth.uid()));

-- 6. Insert all permission definitions
INSERT INTO public.permission_definitions (key, name, description, module, min_role) VALUES
-- ORDERS MODULE
('orders.view', 'Ver pedidos', 'Ver listado de pedidos', 'orders', 'empleado'),
('orders.create', 'Crear pedidos', 'Crear nuevos pedidos', 'orders', 'empleado'),
('orders.update_status', 'Cambiar estado', 'Cambiar estado de pedidos', 'orders', 'empleado'),
('orders.cancel', 'Cancelar pedidos', 'Cancelar pedidos pendientes', 'orders', 'gerente'),
('orders.modify', 'Modificar pedidos', 'Modificar pedidos existentes', 'orders', 'gerente'),
('orders.void', 'Anular pedidos', 'Anular pedidos cobrados', 'orders', 'gerente'),
('orders.export', 'Exportar historial', 'Exportar historial de pedidos', 'orders', 'franquiciado'),

-- POS & KDS MODULE
('pos.sell', 'Operar POS', 'Operar punto de venta', 'pos', 'empleado'),
('pos.discount', 'Aplicar descuentos', 'Aplicar descuentos en ventas', 'pos', 'gerente'),
('pos.price_override', 'Modificar precios', 'Modificar precios en venta', 'pos', 'gerente'),
('kds.view', 'Ver KDS', 'Ver pantalla de cocina', 'kds', 'empleado'),
('kds.manage', 'Gestionar KDS', 'Gestionar estados en KDS', 'kds', 'empleado'),

-- CASH MODULE
('cash.view', 'Ver caja', 'Ver estado de caja', 'cash', 'gerente'),
('cash.open_shift', 'Abrir turno', 'Abrir turno de caja', 'cash', 'gerente'),
('cash.close_shift', 'Cerrar turno', 'Cerrar turno de caja', 'cash', 'gerente'),
('cash.movement_add', 'Registrar movimientos', 'Registrar ingresos/egresos', 'cash', 'gerente'),
('cash.adjustment', 'Ajustes de caja', 'Realizar ajustes de caja', 'cash', 'franquiciado'),

-- FINANCE MODULE
('finance.transactions_view', 'Ver transacciones', 'Ver transacciones financieras', 'finance', 'franquiciado'),
('finance.transactions_create', 'Registrar gastos', 'Registrar gastos/ingresos', 'finance', 'franquiciado'),
('finance.transactions_edit', 'Editar transacciones', 'Editar transacciones', 'finance', 'franquiciado'),
('finance.transactions_delete', 'Eliminar transacciones', 'Eliminar transacciones', 'finance', 'admin'),
('finance.pl_view', 'Ver P&L', 'Ver reporte de pérdidas y ganancias', 'finance', 'franquiciado'),
('finance.pl_export', 'Exportar P&L', 'Exportar reporte P&L', 'finance', 'franquiciado'),

-- SUPPLIERS MODULE
('suppliers.view', 'Ver proveedores', 'Ver proveedores y saldos', 'suppliers', 'franquiciado'),
('suppliers.manage', 'Gestionar proveedores', 'Agregar/editar proveedores', 'suppliers', 'franquiciado'),
('suppliers.pay', 'Pagar proveedores', 'Registrar pagos a proveedores', 'suppliers', 'franquiciado'),

-- INVENTORY MODULE
('inventory.view', 'Ver disponibilidad', 'Ver disponibilidad de productos', 'inventory', 'empleado'),
('inventory.toggle', 'Pausar productos', 'Pausar/activar productos', 'inventory', 'gerente'),
('inventory.price_local', 'Precio local', 'Modificar precio local', 'inventory', 'franquiciado'),
('menu.view', 'Ver menú', 'Ver menú del local', 'inventory', 'empleado'),
('menu.edit_local', 'Editar menú local', 'Editar disponibilidad local', 'inventory', 'gerente'),

-- HR MODULE
('hr.employees_view', 'Ver empleados', 'Ver lista de empleados', 'hr', 'gerente'),
('hr.employees_manage', 'Gestionar empleados', 'Alta/baja/edición de empleados', 'hr', 'franquiciado'),
('hr.employees_private', 'Datos sensibles', 'Ver datos sensibles (DNI, CBU)', 'hr', 'franquiciado'),
('hr.attendance_view', 'Ver fichajes', 'Ver registros de fichajes', 'hr', 'gerente'),
('hr.attendance_manage', 'Corregir fichajes', 'Corregir fichajes', 'hr', 'franquiciado'),
('hr.schedules_view', 'Ver horarios', 'Ver horarios de empleados', 'hr', 'gerente'),
('hr.schedules_edit', 'Editar horarios', 'Editar horarios de empleados', 'hr', 'franquiciado'),
('hr.hours_view', 'Ver horas', 'Ver resumen de horas', 'hr', 'gerente'),
('hr.salaries_view', 'Ver sueldos', 'Ver cálculo de sueldos', 'hr', 'franquiciado'),
('hr.salaries_export', 'Exportar sueldos', 'Exportar sueldos', 'hr', 'franquiciado'),
('hr.warnings_manage', 'Apercibimientos', 'Gestionar apercibimientos', 'hr', 'franquiciado'),
('hr.documents_manage', 'Documentos', 'Subir/ver documentos', 'hr', 'franquiciado'),

-- CONFIG MODULE
('config.branch_view', 'Ver configuración', 'Ver configuración de sucursal', 'config', 'gerente'),
('config.branch_edit', 'Editar configuración', 'Editar configuración de sucursal', 'config', 'franquiciado'),
('config.schedules_edit', 'Horarios atención', 'Editar horarios de atención', 'config', 'franquiciado'),
('config.printers_manage', 'Impresoras', 'Configurar impresoras', 'config', 'gerente'),
('config.delivery_zones', 'Zonas delivery', 'Gestionar zonas de delivery', 'config', 'franquiciado'),
('config.payment_methods', 'Métodos de pago', 'Configurar métodos de pago', 'config', 'franquiciado'),

-- REPORTS MODULE
('reports.sales_view', 'Ver reportes', 'Ver reportes de ventas', 'reports', 'gerente'),
('reports.sales_export', 'Exportar reportes', 'Exportar reportes', 'reports', 'franquiciado'),
('reports.dashboard', 'Dashboard', 'Ver dashboard analítico', 'reports', 'gerente');

-- 7. Migrate existing branch_permissions to new system
-- Map old boolean columns to new permission keys
INSERT INTO public.user_branch_permissions (user_id, branch_id, permission_key, granted_at)
SELECT bp.user_id, bp.branch_id, pd.key, bp.created_at
FROM public.branch_permissions bp
CROSS JOIN public.permission_definitions pd
WHERE 
    (bp.can_manage_orders = true AND pd.key IN ('orders.view', 'orders.create', 'orders.update_status', 'orders.cancel', 'orders.modify'))
    OR (bp.can_manage_products = true AND pd.key IN ('inventory.view', 'inventory.toggle', 'menu.view', 'menu.edit_local'))
    OR (bp.can_manage_inventory = true AND pd.key IN ('inventory.view', 'inventory.toggle', 'inventory.price_local'))
    OR (bp.can_manage_staff = true AND pd.key IN ('hr.employees_view', 'hr.employees_manage', 'hr.attendance_view', 'hr.schedules_view', 'hr.schedules_edit', 'config.branch_view', 'config.branch_edit', 'config.printers_manage'))
    OR (bp.can_view_reports = true AND pd.key IN ('reports.sales_view', 'reports.dashboard', 'finance.pl_view'))
ON CONFLICT (user_id, branch_id, permission_key) DO NOTHING;

-- 8. Add default permissions for all users with branch access (basic permissions)
INSERT INTO public.user_branch_permissions (user_id, branch_id, permission_key)
SELECT DISTINCT bp.user_id, bp.branch_id, pd.key
FROM public.branch_permissions bp
CROSS JOIN public.permission_definitions pd
WHERE pd.key IN ('orders.view', 'orders.create', 'orders.update_status', 'pos.sell', 'kds.view', 'kds.manage', 'inventory.view', 'menu.view')
ON CONFLICT (user_id, branch_id, permission_key) DO NOTHING;

-- 9. Update has_branch_permission function to use new system
CREATE OR REPLACE FUNCTION public.has_branch_permission(_user_id uuid, _branch_id uuid, _permission text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    has_perm BOOLEAN := false;
BEGIN
    -- Admins have all permissions
    IF public.is_admin(_user_id) THEN
        RETURN true;
    END IF;
    
    -- Check new granular permission system first
    SELECT EXISTS (
        SELECT 1 FROM public.user_branch_permissions
        WHERE user_id = _user_id 
        AND branch_id = _branch_id 
        AND permission_key = _permission
    ) INTO has_perm;
    
    IF has_perm THEN
        RETURN true;
    END IF;
    
    -- Fallback: Check old boolean columns for backward compatibility
    -- Map old column names to permission patterns
    IF _permission LIKE 'orders.%' OR _permission = 'can_manage_orders' THEN
        SELECT COALESCE(can_manage_orders, false) INTO has_perm
        FROM public.branch_permissions 
        WHERE user_id = _user_id AND branch_id = _branch_id;
    ELSIF _permission LIKE 'inventory.%' OR _permission LIKE 'menu.%' OR _permission = 'can_manage_products' THEN
        SELECT COALESCE(can_manage_products, false) OR COALESCE(can_manage_inventory, false) INTO has_perm
        FROM public.branch_permissions 
        WHERE user_id = _user_id AND branch_id = _branch_id;
    ELSIF _permission LIKE 'hr.%' OR _permission LIKE 'config.%' OR _permission = 'can_manage_staff' THEN
        SELECT COALESCE(can_manage_staff, false) INTO has_perm
        FROM public.branch_permissions 
        WHERE user_id = _user_id AND branch_id = _branch_id;
    ELSIF _permission LIKE 'reports.%' OR _permission LIKE 'finance.%' OR _permission = 'can_view_reports' THEN
        SELECT COALESCE(can_view_reports, false) INTO has_perm
        FROM public.branch_permissions 
        WHERE user_id = _user_id AND branch_id = _branch_id;
    ELSIF _permission = 'can_manage_inventory' THEN
        SELECT COALESCE(can_manage_inventory, false) INTO has_perm
        FROM public.branch_permissions 
        WHERE user_id = _user_id AND branch_id = _branch_id;
    END IF;
    
    RETURN COALESCE(has_perm, false);
END;
$$;

-- 10. Create helper function to grant default permissions by role
CREATE OR REPLACE FUNCTION public.grant_role_defaults(_user_id uuid, _branch_id uuid, _role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Grant permissions based on role
    INSERT INTO public.user_branch_permissions (user_id, branch_id, permission_key)
    SELECT _user_id, _branch_id, pd.key
    FROM public.permission_definitions pd
    WHERE 
        CASE _role
            WHEN 'empleado' THEN pd.min_role = 'empleado'
            WHEN 'gerente' THEN pd.min_role IN ('empleado', 'gerente')
            WHEN 'franquiciado' THEN pd.min_role IN ('empleado', 'gerente', 'franquiciado')
            WHEN 'admin' THEN true
            ELSE false
        END
    ON CONFLICT (user_id, branch_id, permission_key) DO NOTHING;
END;
$$;

-- 11. Create indexes for performance
CREATE INDEX idx_user_branch_permissions_user ON public.user_branch_permissions(user_id);
CREATE INDEX idx_user_branch_permissions_branch ON public.user_branch_permissions(branch_id);
CREATE INDEX idx_user_branch_permissions_key ON public.user_branch_permissions(permission_key);
CREATE INDEX idx_permission_definitions_module ON public.permission_definitions(module);