-- =============================================
-- FASE 1: Extender profiles con campos de cliente
-- =============================================

-- Agregar campos de cliente a profiles (que ya tiene campos de empleado)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS default_address TEXT,
ADD COLUMN IF NOT EXISTS default_address_lat DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS default_address_lng DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS total_orders INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_spent DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_order_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS favorite_branch_id UUID REFERENCES branches(id);

-- Índices para profiles
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_favorite_branch ON profiles(favorite_branch_id);

-- =============================================
-- FASE 2: Crear tabla user_addresses
-- =============================================
CREATE TABLE IF NOT EXISTS public.user_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    label TEXT, -- "Casa", "Trabajo", etc.
    address TEXT NOT NULL,
    address_lat DECIMAL(10, 8),
    address_lng DECIMAL(11, 8),
    floor_apt TEXT,
    instructions TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para user_addresses
CREATE INDEX IF NOT EXISTS idx_user_addresses_user ON user_addresses(user_id);

-- RLS para user_addresses
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own addresses"
ON public.user_addresses FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- =============================================
-- FASE 3: Agregar branch_id a user_roles y nuevos campos
-- =============================================

-- Agregar columnas a user_roles
ALTER TABLE public.user_roles
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id),
ADD COLUMN IF NOT EXISTS requires_attendance BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS attendance_pin TEXT,
ADD COLUMN IF NOT EXISTS custom_permissions JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Índices para user_roles
CREATE INDEX IF NOT EXISTS idx_user_roles_branch ON user_roles(branch_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);
CREATE INDEX IF NOT EXISTS idx_user_roles_active ON user_roles(is_active) WHERE is_active = true;

-- Eliminar constraint unique viejo si existe y crear nuevo
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_branch_role_unique UNIQUE (user_id, role, branch_id);

-- =============================================
-- FASE 4: Crear tabla user_invitations
-- =============================================
CREATE TABLE IF NOT EXISTS public.user_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT,
    phone TEXT,
    full_name TEXT,
    role TEXT NOT NULL,
    branch_id UUID REFERENCES branches(id),
    requires_attendance BOOLEAN DEFAULT false,
    invited_by UUID NOT NULL REFERENCES auth.users(id),
    token TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
    accepted_at TIMESTAMPTZ,
    accepted_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT email_or_phone CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

-- Índices para user_invitations
CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON user_invitations(token);
CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_user_invitations_branch ON user_invitations(branch_id);

-- RLS para user_invitations
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- Cualquiera puede ver invitación por token (para aceptarla)
CREATE POLICY "Anyone can view invitation by token"
ON public.user_invitations FOR SELECT
TO anon, authenticated
USING (true);

-- Staff puede crear invitaciones
CREATE POLICY "Staff can create invitations"
ON public.user_invitations FOR INSERT
TO authenticated
WITH CHECK (
    invited_by = auth.uid()
    AND (
        public.is_admin(auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.is_active = true
            AND ur.role::text IN ('encargado', 'franquiciado', 'coordinador', 'socio')
        )
    )
);

-- Staff puede actualizar invitaciones
CREATE POLICY "Staff can update invitations"
ON public.user_invitations FOR UPDATE
TO authenticated
USING (
    invited_by = auth.uid()
    OR public.is_admin(auth.uid())
);

-- =============================================
-- FASE 5: Agregar user_id a orders
-- =============================================
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);

-- =============================================
-- FASE 6: Trigger para actualizar stats de cliente al entregar pedido
-- =============================================
CREATE OR REPLACE FUNCTION public.update_profile_order_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.user_id IS NOT NULL AND NEW.status = 'delivered' 
       AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
        UPDATE public.profiles SET
            total_orders = COALESCE(total_orders, 0) + 1,
            total_spent = COALESCE(total_spent, 0) + NEW.total,
            last_order_at = NEW.updated_at,
            favorite_branch_id = (
                SELECT o.branch_id 
                FROM public.orders o
                WHERE o.user_id = NEW.user_id 
                AND o.status = 'delivered'
                GROUP BY o.branch_id 
                ORDER BY COUNT(*) DESC 
                LIMIT 1
            ),
            updated_at = now()
        WHERE user_id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_update_profile_order_stats ON orders;
CREATE TRIGGER trigger_update_profile_order_stats
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_profile_order_stats();

-- =============================================
-- FASE 7: Funciones helper para permisos
-- =============================================

-- Verificar si usuario tiene rol específico (con soporte de branch)
CREATE OR REPLACE FUNCTION public.has_role_in_branch(_user_id uuid, _role text, _branch_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id 
        AND role::text = _role
        AND is_active = true
        AND (_branch_id IS NULL OR branch_id IS NULL OR branch_id = _branch_id)
    )
$$;

-- Verificar si puede usar panel local
CREATE OR REPLACE FUNCTION public.can_use_local_panel_v2(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id 
        AND is_active = true
        AND (
            role::text IN ('kds', 'cajero', 'encargado', 'franquiciado', 'admin')
            OR role::text = 'gerente' -- legacy
            OR role::text = 'empleado' -- legacy
        )
    )
$$;

-- Verificar si puede usar panel de marca
CREATE OR REPLACE FUNCTION public.can_use_brand_panel_v2(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id 
        AND is_active = true
        AND role::text IN ('marketing', 'admin', 'coordinador', 'socio')
    )
$$;

-- Obtener sucursales donde el usuario tiene roles
CREATE OR REPLACE FUNCTION public.get_user_branch_roles(_user_id uuid)
RETURNS TABLE(branch_id uuid, branch_name text, roles text[])
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        ur.branch_id,
        b.name as branch_name,
        array_agg(ur.role::text) as roles
    FROM public.user_roles ur
    LEFT JOIN public.branches b ON b.id = ur.branch_id
    WHERE ur.user_id = _user_id 
    AND ur.is_active = true
    AND ur.branch_id IS NOT NULL
    GROUP BY ur.branch_id, b.name
$$;

-- =============================================
-- FASE 8: RLS adicional para user_roles
-- =============================================

-- Eliminar policies viejas si existen
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admin can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Franchisee can view branch roles" ON public.user_roles;
DROP POLICY IF EXISTS "Franchisee can manage branch roles" ON public.user_roles;

-- Usuarios pueden ver sus propios roles
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Admin puede ver todos los roles
CREATE POLICY "Admin can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Franquiciado/Encargado puede ver roles de su sucursal
CREATE POLICY "Branch managers can view branch roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (
    branch_id IN (
        SELECT ur.branch_id FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role::text IN ('franquiciado', 'encargado')
        AND ur.is_active = true
    )
);

-- Admin puede gestionar todos los roles
CREATE POLICY "Admin can manage all roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Franquiciado puede gestionar roles inferiores de su sucursal
CREATE POLICY "Franchisee can manage branch roles"
ON public.user_roles FOR ALL
TO authenticated
USING (
    role::text IN ('kds', 'cajero', 'encargado', 'empleado')
    AND branch_id IN (
        SELECT ur.branch_id FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role::text = 'franquiciado'
        AND ur.is_active = true
    )
)
WITH CHECK (
    role::text IN ('kds', 'cajero', 'encargado', 'empleado')
    AND branch_id IN (
        SELECT ur.branch_id FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role::text = 'franquiciado'
        AND ur.is_active = true
    )
);