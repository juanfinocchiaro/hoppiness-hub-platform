
-- PARTE 2: Migración de datos y funciones

-- 2. Migrar usuarios existentes a los nuevos roles
-- gerente → encargado
UPDATE public.user_roles 
SET role = 'encargado' 
WHERE role = 'gerente';

-- empleado → cajero
UPDATE public.user_roles 
SET role = 'cajero' 
WHERE role = 'empleado';

-- 3. Agregar nuevos permisos a permission_definitions
INSERT INTO public.permission_definitions (key, name, module, description, min_role) VALUES
    ('kds.view', 'Ver KDS', 'kds', 'Ver pantalla de cocina', 'kds'),
    ('pos.sell', 'Vender', 'pos', 'Crear ventas en POS', 'cajero'),
    ('pos.charge', 'Cobrar', 'pos', 'Procesar cobros', 'cajero'),
    ('menu.toggle', 'Prender/Apagar productos', 'menu', 'Activar/desactivar disponibilidad', 'cajero'),
    ('schedules.edit', 'Editar horarios', 'hr', 'Modificar horarios de empleados', 'encargado'),
    ('finance.invoices', 'Cargar facturas', 'finance', 'Registrar facturas', 'encargado'),
    ('finance.purchases', 'Registrar compras', 'finance', 'Registrar compras', 'encargado'),
    ('finance.expenses', 'Registrar gastos', 'finance', 'Registrar gastos operativos', 'encargado'),
    ('products.create', 'Crear productos', 'products', 'Crear productos en catálogo', 'coordinador'),
    ('products.edit', 'Editar productos', 'products', 'Modificar productos', 'coordinador'),
    ('products.delete', 'Eliminar productos', 'products', 'Eliminar productos', 'coordinador'),
    ('users.create', 'Crear usuarios', 'users', 'Crear nuevos usuarios', 'coordinador'),
    ('users.delete', 'Eliminar usuarios', 'users', 'Eliminar usuarios', 'coordinador'),
    ('attendance.clock', 'Fichar', 'attendance', 'Registrar entrada/salida', 'kds')
ON CONFLICT (key) DO UPDATE SET min_role = EXCLUDED.min_role;

-- 4. Actualizar función grant_role_defaults
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
            WHEN 'kds' THEN pd.key IN ('kds.view', 'attendance.clock')
            WHEN 'cajero' THEN pd.min_role IN ('kds', 'cajero') 
                OR pd.key IN ('attendance.clock', 'pos.sell', 'pos.charge', 'menu.toggle')
            WHEN 'encargado' THEN pd.min_role IN ('kds', 'cajero', 'encargado')
            WHEN 'franquiciado' THEN pd.min_role IN ('kds', 'cajero', 'encargado', 'franquiciado')
            WHEN 'coordinador' THEN pd.key IN (
                'products.create', 'products.edit', 'products.delete', 'products.view',
                'modifiers.manage', 'modifiers.view',
                'users.create', 'users.delete', 'users.view',
                'orders.view', 'orders.history',
                'reports.sales', 'reports.products'
            )
            WHEN 'socio' THEN pd.key LIKE '%.view' OR pd.key LIKE 'reports.%'
            WHEN 'admin' THEN true
            ELSE false
        END
    ON CONFLICT (user_id, branch_id, permission_key) DO NOTHING;
END;
$$;

-- 5. Actualizar función has_branch_permission
CREATE OR REPLACE FUNCTION public.has_branch_permission(_branch_id uuid, _permission text, _user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
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
    
    IF user_role = 'coordinador' THEN
        IF _permission IN (
            'products.create', 'products.edit', 'products.delete', 'products.view',
            'modifiers.manage', 'modifiers.view',
            'users.create', 'users.delete', 'users.view', 'users.edit',
            'orders.view', 'orders.history',
            'reports.sales', 'reports.products'
        ) THEN
            RETURN true;
        END IF;
    END IF;
    
    IF user_role = 'socio' THEN
        IF _permission LIKE '%.view' OR _permission LIKE 'reports.%' THEN
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
    END IF;
    
    RETURN COALESCE(has_perm, false);
END;
$$;

-- 6. Actualizar handle_new_user para asignar 'cajero' por defecto
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    INSERT INTO public.profiles (user_id, full_name, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.email
    );
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'cajero');
    
    RETURN NEW;
END;
$$;
