-- =====================================================
-- MIGRACIÓN: Unificar branch_permissions → user_branch_permissions
-- =====================================================

-- 1. Mapeo de flags legacy a permission_keys granulares
-- can_manage_inventory → inventory.toggle, inventory.view
-- can_manage_staff → hr.employees_view, hr.employees_manage, hr.schedules_view, hr.schedules_edit
-- can_view_reports → reports.dashboard, reports.sales_view, finance.transactions_view
-- can_manage_orders → orders.view, orders.create, orders.update_status, orders.modify
-- can_manage_products → products.edit, menu.toggle, inventory.price_local

-- 2. Función para migrar un usuario de branch_permissions a user_branch_permissions
CREATE OR REPLACE FUNCTION migrate_branch_permissions_to_granular()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bp RECORD;
BEGIN
  FOR bp IN SELECT * FROM branch_permissions LOOP
    -- Siempre dar acceso básico si tiene cualquier permiso
    INSERT INTO user_branch_permissions (user_id, branch_id, permission_key)
    VALUES (bp.user_id, bp.branch_id, 'attendance.clock')
    ON CONFLICT (user_id, branch_id, permission_key) DO NOTHING;

    -- can_manage_orders → permisos de pedidos
    IF bp.can_manage_orders THEN
      INSERT INTO user_branch_permissions (user_id, branch_id, permission_key)
      VALUES 
        (bp.user_id, bp.branch_id, 'orders.view'),
        (bp.user_id, bp.branch_id, 'orders.create'),
        (bp.user_id, bp.branch_id, 'orders.update_status'),
        (bp.user_id, bp.branch_id, 'orders.modify'),
        (bp.user_id, bp.branch_id, 'pos.sell'),
        (bp.user_id, bp.branch_id, 'pos.charge'),
        (bp.user_id, bp.branch_id, 'kds.view')
      ON CONFLICT (user_id, branch_id, permission_key) DO NOTHING;
    END IF;

    -- can_manage_products → permisos de productos/menú
    IF bp.can_manage_products THEN
      INSERT INTO user_branch_permissions (user_id, branch_id, permission_key)
      VALUES 
        (bp.user_id, bp.branch_id, 'products.edit'),
        (bp.user_id, bp.branch_id, 'menu.toggle'),
        (bp.user_id, bp.branch_id, 'menu.view'),
        (bp.user_id, bp.branch_id, 'inventory.price_local')
      ON CONFLICT (user_id, branch_id, permission_key) DO NOTHING;
    END IF;

    -- can_manage_inventory → permisos de inventario
    IF bp.can_manage_inventory THEN
      INSERT INTO user_branch_permissions (user_id, branch_id, permission_key)
      VALUES 
        (bp.user_id, bp.branch_id, 'inventory.view'),
        (bp.user_id, bp.branch_id, 'inventory.toggle'),
        (bp.user_id, bp.branch_id, 'menu.view')
      ON CONFLICT (user_id, branch_id, permission_key) DO NOTHING;
    END IF;

    -- can_manage_staff → permisos de RRHH
    IF bp.can_manage_staff THEN
      INSERT INTO user_branch_permissions (user_id, branch_id, permission_key)
      VALUES 
        (bp.user_id, bp.branch_id, 'hr.employees_view'),
        (bp.user_id, bp.branch_id, 'hr.employees_manage'),
        (bp.user_id, bp.branch_id, 'hr.schedules_view'),
        (bp.user_id, bp.branch_id, 'hr.schedules_edit'),
        (bp.user_id, bp.branch_id, 'hr.attendance_view')
      ON CONFLICT (user_id, branch_id, permission_key) DO NOTHING;
    END IF;

    -- can_view_reports → permisos de reportes
    IF bp.can_view_reports THEN
      INSERT INTO user_branch_permissions (user_id, branch_id, permission_key)
      VALUES 
        (bp.user_id, bp.branch_id, 'reports.dashboard'),
        (bp.user_id, bp.branch_id, 'reports.sales_view'),
        (bp.user_id, bp.branch_id, 'finance.transactions_view')
      ON CONFLICT (user_id, branch_id, permission_key) DO NOTHING;
    END IF;
  END LOOP;
END;
$$;

-- 3. Ejecutar la migración
SELECT migrate_branch_permissions_to_granular();

-- 4. Actualizar has_branch_permission para fallback temporal a legacy
CREATE OR REPLACE FUNCTION has_branch_permission(
  _branch_id uuid,
  _permission text,
  _user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _has_permission boolean;
  _user_role app_role;
BEGIN
  -- Admins tienen todos los permisos
  IF is_admin(_user_id) THEN
    RETURN true;
  END IF;

  -- Coordinadores tienen todos los permisos
  IF has_role('coordinador'::app_role, _user_id) THEN
    RETURN true;
  END IF;

  -- Socios tienen todos los permisos en sus sucursales
  IF has_role('socio'::app_role, _user_id) AND has_branch_access(_branch_id, _user_id) THEN
    RETURN true;
  END IF;

  -- Franquiciados tienen todos los permisos en sus sucursales
  IF has_role('franquiciado'::app_role, _user_id) AND has_branch_access(_branch_id, _user_id) THEN
    RETURN true;
  END IF;

  -- Verificar permisos granulares
  SELECT EXISTS (
    SELECT 1 FROM user_branch_permissions
    WHERE user_id = _user_id 
      AND branch_id = _branch_id 
      AND permission_key = _permission
  ) INTO _has_permission;

  IF _has_permission THEN
    RETURN true;
  END IF;

  -- FALLBACK TEMPORAL: Verificar flags legacy de branch_permissions
  -- Este bloque se puede eliminar después de 1 semana de estabilidad
  SELECT 
    CASE 
      WHEN _permission LIKE 'orders.%' OR _permission LIKE 'pos.%' OR _permission LIKE 'kds.%' 
        THEN can_manage_orders
      WHEN _permission LIKE 'products.%' OR _permission LIKE 'menu.%' 
        THEN can_manage_products
      WHEN _permission LIKE 'inventory.%' 
        THEN can_manage_inventory
      WHEN _permission LIKE 'hr.%' 
        THEN can_manage_staff
      WHEN _permission LIKE 'reports.%' OR _permission LIKE 'finance.%' 
        THEN can_view_reports
      ELSE false
    END
  INTO _has_permission
  FROM branch_permissions
  WHERE user_id = _user_id AND branch_id = _branch_id;

  RETURN COALESCE(_has_permission, false);
END;
$$;

-- 5. Agregar constraint único si no existe (para ON CONFLICT)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_branch_permissions_unique'
  ) THEN
    ALTER TABLE user_branch_permissions 
    ADD CONSTRAINT user_branch_permissions_unique 
    UNIQUE (user_id, branch_id, permission_key);
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 6. Limpiar función de migración (ya no necesaria)
DROP FUNCTION IF EXISTS migrate_branch_permissions_to_granular();