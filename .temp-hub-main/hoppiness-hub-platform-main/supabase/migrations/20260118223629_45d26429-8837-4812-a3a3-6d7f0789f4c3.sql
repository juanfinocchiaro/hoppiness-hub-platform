
-- =============================================
-- HOPPINESS CLUB - ESQUEMA DE BASE DE DATOS
-- Fase 1: Fundación
-- =============================================

-- 1. ENUM para roles globales
CREATE TYPE public.app_role AS ENUM ('admin', 'gerente', 'empleado', 'franquiciado');

-- 2. Tabla de roles de usuario (separada por seguridad)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'empleado',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Tabla de perfiles
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Tabla de sucursales
CREATE TABLE public.branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    allowed_ips TEXT[] DEFAULT '{}', -- IPs permitidas para control de asistencia
    is_active BOOLEAN NOT NULL DEFAULT true,
    opening_time TIME DEFAULT '09:00',
    closing_time TIME DEFAULT '22:00',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

-- 5. Permisos por sucursal (override granular)
CREATE TABLE public.branch_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE NOT NULL,
    can_manage_products BOOLEAN DEFAULT false,
    can_manage_orders BOOLEAN DEFAULT false,
    can_view_reports BOOLEAN DEFAULT false,
    can_manage_staff BOOLEAN DEFAULT false,
    can_manage_inventory BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, branch_id)
);

ALTER TABLE public.branch_permissions ENABLE ROW LEVEL SECURITY;

-- 6. Categorías de productos
CREATE TABLE public.product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

-- 7. Productos
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.product_categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    image_url TEXT,
    is_available BOOLEAN NOT NULL DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    preparation_time INTEGER DEFAULT 15, -- minutos
    allergens TEXT[],
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- 8. Disponibilidad de productos por sucursal
CREATE TABLE public.branch_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    is_available BOOLEAN NOT NULL DEFAULT true,
    stock_quantity INTEGER,
    custom_price DECIMAL(10,2), -- precio específico de sucursal (opcional)
    UNIQUE (branch_id, product_id)
);

ALTER TABLE public.branch_products ENABLE ROW LEVEL SECURITY;

-- 9. Pedidos
CREATE TYPE public.order_status AS ENUM ('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled');
CREATE TYPE public.order_type AS ENUM ('takeaway', 'delivery', 'dine_in');

CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID REFERENCES public.branches(id) NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    order_type order_type NOT NULL,
    status order_status NOT NULL DEFAULT 'pending',
    delivery_address TEXT,
    notes TEXT,
    subtotal DECIMAL(10,2) NOT NULL,
    tax DECIMAL(10,2) DEFAULT 0,
    delivery_fee DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    estimated_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 10. Items de pedido
CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- 11. Proveedores
CREATE TABLE public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    contact_name TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- 12. Registro de asistencia
CREATE TABLE public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE NOT NULL,
    check_in TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    check_out TIMESTAMP WITH TIME ZONE,
    check_in_ip INET NOT NULL,
    check_out_ip INET,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- 13. Transacciones financieras
CREATE TYPE public.transaction_type AS ENUM ('income', 'expense');

CREATE TABLE public.financial_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE NOT NULL,
    type transaction_type NOT NULL,
    category TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    reference_id UUID, -- puede referenciar order_id o supplier_id
    recorded_by UUID REFERENCES auth.users(id),
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- FUNCIONES DE SEGURIDAD (Security Definer)
-- =============================================

-- Verificar si usuario tiene un rol específico
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id AND role = _role
    )
$$;

-- Verificar si usuario es admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.has_role(_user_id, 'admin')
$$;

-- Verificar si usuario tiene acceso a una sucursal
CREATE OR REPLACE FUNCTION public.has_branch_access(_user_id UUID, _branch_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.branch_permissions
        WHERE user_id = _user_id AND branch_id = _branch_id
    ) OR public.is_admin(_user_id)
$$;

-- Verificar permiso específico en sucursal
CREATE OR REPLACE FUNCTION public.has_branch_permission(_user_id UUID, _branch_id UUID, _permission TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    has_perm BOOLEAN := false;
BEGIN
    -- Admins tienen todos los permisos
    IF public.is_admin(_user_id) THEN
        RETURN true;
    END IF;
    
    -- Verificar permiso específico
    EXECUTE format(
        'SELECT COALESCE(%I, false) FROM public.branch_permissions WHERE user_id = $1 AND branch_id = $2',
        _permission
    ) INTO has_perm USING _user_id, _branch_id;
    
    RETURN COALESCE(has_perm, false);
END;
$$;

-- =============================================
-- POLÍTICAS RLS
-- =============================================

-- USER_ROLES: Solo admins pueden ver/modificar roles
CREATE POLICY "Admins can manage all roles" ON public.user_roles
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Users can view own role" ON public.user_roles
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- PROFILES: Usuarios ven su perfil, admins ven todos
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all profiles" ON public.profiles
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- BRANCHES: Lectura pública, gestión solo admins
CREATE POLICY "Anyone can view active branches" ON public.branches
    FOR SELECT
    USING (is_active = true);

CREATE POLICY "Admins can manage branches" ON public.branches
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- BRANCH_PERMISSIONS: Admins gestionan, usuarios ven los suyos
CREATE POLICY "Users can view own permissions" ON public.branch_permissions
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage permissions" ON public.branch_permissions
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- PRODUCT_CATEGORIES: Lectura pública, gestión admins
CREATE POLICY "Anyone can view categories" ON public.product_categories
    FOR SELECT
    USING (is_active = true);

CREATE POLICY "Admins can manage categories" ON public.product_categories
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- PRODUCTS: Lectura pública, gestión por permiso
CREATE POLICY "Anyone can view available products" ON public.products
    FOR SELECT
    USING (is_available = true);

CREATE POLICY "Staff with permission can manage products" ON public.products
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- BRANCH_PRODUCTS: Lectura pública, gestión por permiso de sucursal
CREATE POLICY "Anyone can view branch products" ON public.branch_products
    FOR SELECT
    USING (true);

CREATE POLICY "Staff can manage branch products" ON public.branch_products
    FOR ALL TO authenticated
    USING (public.has_branch_permission(auth.uid(), branch_id, 'can_manage_products'))
    WITH CHECK (public.has_branch_permission(auth.uid(), branch_id, 'can_manage_products'));

-- ORDERS: Gestión por sucursal
CREATE POLICY "Staff can view branch orders" ON public.orders
    FOR SELECT TO authenticated
    USING (public.has_branch_access(auth.uid(), branch_id));

CREATE POLICY "Anyone can create orders" ON public.orders
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Staff can update branch orders" ON public.orders
    FOR UPDATE TO authenticated
    USING (public.has_branch_access(auth.uid(), branch_id))
    WITH CHECK (public.has_branch_access(auth.uid(), branch_id));

-- ORDER_ITEMS: Mismas reglas que orders
CREATE POLICY "Staff can view order items" ON public.order_items
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.orders o 
        WHERE o.id = order_id AND public.has_branch_access(auth.uid(), o.branch_id)
    ));

CREATE POLICY "Anyone can create order items" ON public.order_items
    FOR INSERT
    WITH CHECK (true);

-- SUPPLIERS: Solo admins y gerentes
CREATE POLICY "Staff can view suppliers" ON public.suppliers
    FOR SELECT TO authenticated
    USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente'));

CREATE POLICY "Admins can manage suppliers" ON public.suppliers
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- ATTENDANCE_RECORDS: Usuarios ven los suyos, gerentes ven de su sucursal
CREATE POLICY "Users can view own attendance" ON public.attendance_records
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.has_branch_permission(auth.uid(), branch_id, 'can_manage_staff'));

CREATE POLICY "Users can check in" ON public.attendance_records
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can check out" ON public.attendance_records
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid() AND check_out IS NULL)
    WITH CHECK (user_id = auth.uid());

-- FINANCIAL_TRANSACTIONS: Solo con permiso de reportes
CREATE POLICY "Staff can view branch transactions" ON public.financial_transactions
    FOR SELECT TO authenticated
    USING (public.has_branch_permission(auth.uid(), branch_id, 'can_view_reports'));

CREATE POLICY "Staff can create transactions" ON public.financial_transactions
    FOR INSERT TO authenticated
    WITH CHECK (public.has_branch_access(auth.uid(), branch_id));

-- =============================================
-- TRIGGERS
-- =============================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Aplicar trigger a tablas con updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_branches_updated_at
    BEFORE UPDATE ON public.branches
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at
    BEFORE UPDATE ON public.suppliers
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, full_name, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.email
    );
    
    -- Asignar rol de empleado por defecto
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'empleado');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
