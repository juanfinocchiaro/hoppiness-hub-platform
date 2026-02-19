-- Second migration: Add permission definitions and update functions
INSERT INTO public.permission_definitions (key, name, description, module, min_role) VALUES
('admin.users_view', 'Ver usuarios', 'Ver lista de usuarios del sistema', 'admin', 'coordinador'),
('admin.branches_view', 'Ver sucursales', 'Ver información de sucursales', 'admin', 'coordinador'),
('admin.create_branch_users', 'Crear usuarios de sucursal', 'Crear empleados y encargados para su sucursal', 'admin', 'franquiciado')
ON CONFLICT (key) DO NOTHING;

-- Update grant_role_defaults to handle new roles
CREATE OR REPLACE FUNCTION public.grant_role_defaults(_user_id uuid, _branch_id uuid, _role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    INSERT INTO public.user_branch_permissions (user_id, branch_id, permission_key)
    SELECT _user_id, _branch_id, pd.key
    FROM public.permission_definitions pd
    WHERE 
        CASE _role
            WHEN 'empleado' THEN pd.min_role = 'empleado'
            WHEN 'gerente' THEN pd.min_role IN ('empleado', 'gerente')
            WHEN 'coordinador' THEN pd.min_role IN ('empleado', 'gerente', 'coordinador')
            WHEN 'franquiciado' THEN pd.min_role IN ('empleado', 'gerente', 'coordinador', 'franquiciado')
            WHEN 'socio' THEN pd.key IN (
                'reports.sales', 'reports.products', 'reports.financial',
                'finance.view', 'finance.pl_report'
            )
            WHEN 'admin' THEN true
            ELSE false
        END
    ON CONFLICT (user_id, branch_id, permission_key) DO NOTHING;
END;
$$;

-- Update has_branch_permission to handle socio role
CREATE OR REPLACE FUNCTION public.has_branch_permission(_branch_id uuid, _permission text, _user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    has_perm BOOLEAN := false;
    user_role app_role;
BEGIN
    IF public.is_admin(_user_id) THEN
        RETURN true;
    END IF;
    
    SELECT role INTO user_role FROM public.user_roles WHERE user_id = _user_id LIMIT 1;
    
    IF user_role = 'socio' THEN
        IF _permission IN (
            'reports.sales', 'reports.products', 'reports.financial', 'reports.employees',
            'finance.view', 'finance.pl_report',
            'orders.view', 'orders.history',
            'products.view', 'inventory.view',
            'hr.employees_view', 'hr.schedules_view', 'hr.attendance_view'
        ) THEN
            RETURN true;
        ELSE
            RETURN false;
        END IF;
    END IF;
    
    SELECT EXISTS (
        SELECT 1 FROM public.user_branch_permissions
        WHERE user_id = _user_id 
        AND branch_id = _branch_id 
        AND permission_key = _permission
    ) INTO has_perm;
    
    IF has_perm THEN
        RETURN true;
    END IF;
    
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