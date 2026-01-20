-- First truncate role_default_permissions to allow key updates
TRUNCATE TABLE public.role_default_permissions;

-- Also clean user_branch_permissions that reference old keys
DELETE FROM public.user_branch_permissions WHERE permission_key NOT IN (SELECT key FROM permission_definitions);

-- Now consolidate permission modules - keep module names but just organize better
-- The main issue is having both English keys (menu, products, users, attendance) 
-- and Spanish module labels

-- 1. Merge 'menu' into 'inventory' module (both relate to product availability)
UPDATE permission_definitions 
SET module = 'inventory'
WHERE module = 'menu';

-- 2. Merge 'products' into 'inventory' module
UPDATE permission_definitions 
SET module = 'inventory'
WHERE module = 'products';

-- 3. Merge 'admin' into more appropriate modules
-- Move branches_view to config
UPDATE permission_definitions 
SET module = 'config'
WHERE key = 'admin.branches_view';

-- Move user-related to 'users' module
UPDATE permission_definitions 
SET module = 'users'
WHERE key IN ('admin.users_view', 'admin.create_branch_users');

-- 4. Merge 'attendance' into 'hr' module
UPDATE permission_definitions 
SET module = 'hr'
WHERE module = 'attendance';

-- 5. Delete the leftover 'admin' module items (now empty or moved)
DELETE FROM permission_definitions WHERE module = 'admin';

-- 6. Delete duplicate schedules.edit (hr.schedules_edit already exists)
DELETE FROM permission_definitions WHERE key = 'schedules.edit';

-- Now re-seed role_default_permissions with corrected keys
-- Admin: all permissions
INSERT INTO public.role_default_permissions (role, permission_key)
SELECT 'admin'::app_role, key FROM public.permission_definitions
ON CONFLICT DO NOTHING;

-- Franquiciado: all permissions (full branch access)
INSERT INTO public.role_default_permissions (role, permission_key)
SELECT 'franquiciado'::app_role, key FROM public.permission_definitions
ON CONFLICT DO NOTHING;

-- Encargado: operations + staff + limited finance
INSERT INTO public.role_default_permissions (role, permission_key)
SELECT 'encargado'::app_role, key FROM public.permission_definitions
WHERE module IN ('orders', 'pos', 'kds', 'cash', 'inventory', 'hr')
   OR key IN ('reports.sales', 'reports.products', 'config.branch_view')
ON CONFLICT DO NOTHING;

-- Cajero: POS + orders
INSERT INTO public.role_default_permissions (role, permission_key)
SELECT 'cajero'::app_role, key FROM public.permission_definitions
WHERE module IN ('orders', 'pos', 'cash')
   OR key LIKE 'inventory.%'
   OR key IN ('kds.view')
ON CONFLICT DO NOTHING;

-- KDS: kitchen display only
INSERT INTO public.role_default_permissions (role, permission_key)
SELECT 'kds'::app_role, key FROM public.permission_definitions
WHERE key IN ('kds.view', 'kds.manage')
ON CONFLICT DO NOTHING;

-- Coordinador: catalog management + reports + users
INSERT INTO public.role_default_permissions (role, permission_key)
SELECT 'coordinador'::app_role, key FROM public.permission_definitions
WHERE module IN ('inventory', 'reports', 'users')
   OR key IN ('orders.view', 'orders.history')
ON CONFLICT DO NOTHING;

-- Socio/Partner: read-only views
INSERT INTO public.role_default_permissions (role, permission_key)
SELECT 'socio'::app_role, key FROM public.permission_definitions
WHERE key LIKE 'reports.%'
   OR key LIKE '%.view'
ON CONFLICT DO NOTHING;