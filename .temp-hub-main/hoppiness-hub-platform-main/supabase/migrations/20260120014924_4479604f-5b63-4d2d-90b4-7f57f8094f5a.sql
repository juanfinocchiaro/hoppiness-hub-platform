-- 1. Create role_default_permissions table for role templates (if not exists from partial run)
CREATE TABLE IF NOT EXISTS public.role_default_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role app_role NOT NULL,
    permission_key TEXT NOT NULL REFERENCES public.permission_definitions(key) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(role, permission_key)
);

-- Enable RLS (may already exist)
ALTER TABLE public.role_default_permissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Admins can manage role defaults" ON public.role_default_permissions;
DROP POLICY IF EXISTS "Authenticated users can view role defaults" ON public.role_default_permissions;

-- Only admins can manage role defaults
CREATE POLICY "Admins can manage role defaults"
ON public.role_default_permissions
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Authenticated users can read role defaults
CREATE POLICY "Authenticated users can view role defaults"
ON public.role_default_permissions
FOR SELECT
TO authenticated
USING (true);

-- 2. Add override_type column to user_branch_permissions (grant/revoke) - may already exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'user_branch_permissions' 
                   AND column_name = 'override_type') THEN
        ALTER TABLE public.user_branch_permissions 
        ADD COLUMN override_type TEXT DEFAULT 'grant' CHECK (override_type IN ('grant', 'revoke'));
    END IF;
END $$;

-- 3. Create a view for effective permissions calculation (fixed alias)
CREATE OR REPLACE VIEW public.user_effective_permissions AS
WITH role_perms AS (
    -- Get permissions from role defaults
    SELECT 
        ur.user_id,
        b.id AS branch_id,
        rdp.permission_key,
        'inherited' AS source
    FROM public.user_roles ur
    CROSS JOIN public.branches b
    JOIN public.role_default_permissions rdp ON rdp.role = ur.role
    WHERE b.is_active = true
),
user_overrides AS (
    -- Get user-specific overrides
    SELECT 
        user_id,
        branch_id,
        permission_key,
        override_type
    FROM public.user_branch_permissions
),
combined AS (
    -- Combine role permissions with overrides
    SELECT 
        COALESCE(rp.user_id, uo.user_id) AS user_id,
        COALESCE(rp.branch_id, uo.branch_id) AS branch_id,
        COALESCE(rp.permission_key, uo.permission_key) AS permission_key,
        CASE 
            WHEN uo.override_type = 'revoke' THEN 'revoked'
            WHEN uo.override_type = 'grant' AND rp.permission_key IS NULL THEN 'override'
            WHEN rp.permission_key IS NOT NULL AND uo.permission_key IS NULL THEN 'inherited'
            ELSE 'inherited'
        END AS source,
        CASE 
            WHEN uo.override_type = 'revoke' THEN false
            ELSE true
        END AS is_granted
    FROM role_perms rp
    FULL OUTER JOIN user_overrides uo 
        ON rp.user_id = uo.user_id 
        AND rp.branch_id = uo.branch_id 
        AND rp.permission_key = uo.permission_key
)
SELECT 
    user_id,
    branch_id,
    permission_key,
    source,
    is_granted
FROM combined
WHERE is_granted = true;

-- 4. Seed role_default_permissions with typical defaults
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
   OR key IN ('reports.sales', 'reports.products', 'config.view')
ON CONFLICT DO NOTHING;

-- Cajero: POS + orders
INSERT INTO public.role_default_permissions (role, permission_key)
SELECT 'cajero'::app_role, key FROM public.permission_definitions
WHERE module IN ('orders', 'pos', 'cash')
   OR key IN ('menu.toggle', 'attendance.clock')
ON CONFLICT DO NOTHING;

-- KDS: kitchen display only
INSERT INTO public.role_default_permissions (role, permission_key)
SELECT 'kds'::app_role, key FROM public.permission_definitions
WHERE key IN ('kds.view', 'attendance.clock')
ON CONFLICT DO NOTHING;

-- Coordinador: catalog management + reports
INSERT INTO public.role_default_permissions (role, permission_key)
SELECT 'coordinador'::app_role, key FROM public.permission_definitions
WHERE key LIKE 'products.%' 
   OR key LIKE 'modifiers.%' 
   OR key LIKE 'reports.%'
   OR key IN ('orders.view', 'orders.history')
ON CONFLICT DO NOTHING;

-- Socio/Partner: read-only reports
INSERT INTO public.role_default_permissions (role, permission_key)
SELECT 'socio'::app_role, key FROM public.permission_definitions
WHERE key LIKE 'reports.%'
   OR key LIKE '%.view'
ON CONFLICT DO NOTHING;