-- =============================================
-- FASE 1: Sistema de Clientes - Migración Base
-- =============================================

-- 1. Campos adicionales en customers
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_registered BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS registered_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_order_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS total_orders INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS preferred_branch_id UUID REFERENCES public.branches(id);

-- 2. Índices para búsqueda eficiente
-- Solo unique para registrados (evita conflictos con teléfonos compartidos)
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_phone_registered 
ON public.customers(phone) 
WHERE phone IS NOT NULL AND is_registered = true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_email_registered 
ON public.customers(email) 
WHERE email IS NOT NULL AND is_registered = true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_user_id 
ON public.customers(user_id) 
WHERE user_id IS NOT NULL;

-- Índice para búsqueda por teléfono (no único, para lookup)
CREATE INDEX IF NOT EXISTS idx_customers_phone_lookup 
ON public.customers(phone) 
WHERE phone IS NOT NULL;

-- 3. Constraint único en customer_preferences
ALTER TABLE public.customer_preferences 
DROP CONSTRAINT IF EXISTS customer_preferences_customer_branch_unique;

ALTER TABLE public.customer_preferences 
ADD CONSTRAINT customer_preferences_customer_branch_unique 
UNIQUE (customer_id, branch_id);

-- 4. Tabla de direcciones guardadas
CREATE TABLE IF NOT EXISTS public.customer_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    label TEXT DEFAULT 'Casa',
    street_address TEXT NOT NULL,
    apartment TEXT,
    city TEXT DEFAULT 'Córdoba',
    postal_code TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    notes TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para direcciones por cliente
CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer 
ON public.customer_addresses(customer_id);

-- RLS para customer_addresses
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;

-- Solo el cliente puede ver sus direcciones
CREATE POLICY "Customers can view own addresses"
ON public.customer_addresses FOR SELECT
USING (
    customer_id IN (
        SELECT id FROM public.customers WHERE user_id = auth.uid()
    )
);

-- Solo el cliente puede crear direcciones
CREATE POLICY "Customers can insert own addresses"
ON public.customer_addresses FOR INSERT
WITH CHECK (
    customer_id IN (
        SELECT id FROM public.customers WHERE user_id = auth.uid()
    )
);

-- Solo el cliente puede actualizar sus direcciones
CREATE POLICY "Customers can update own addresses"
ON public.customer_addresses FOR UPDATE
USING (
    customer_id IN (
        SELECT id FROM public.customers WHERE user_id = auth.uid()
    )
);

-- Solo el cliente puede eliminar sus direcciones
CREATE POLICY "Customers can delete own addresses"
ON public.customer_addresses FOR DELETE
USING (
    customer_id IN (
        SELECT id FROM public.customers WHERE user_id = auth.uid()
    )
);

-- Admins y staff pueden ver todas las direcciones
CREATE POLICY "Staff can view all addresses"
ON public.customer_addresses FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'franquiciado', 'gerente', 'coordinador', 'cajero')
    )
);

-- 5. Función para actualizar stats del cliente cuando se crea un pedido
CREATE OR REPLACE FUNCTION public.update_customer_order_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Solo procesar si hay customer_id
    IF NEW.customer_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Actualizar stats en customers
    UPDATE public.customers SET
        last_order_at = NOW(),
        total_orders = COALESCE(total_orders, 0) + 1,
        preferred_branch_id = (
            SELECT o.branch_id 
            FROM public.orders o
            WHERE o.customer_id = NEW.customer_id 
            GROUP BY o.branch_id 
            ORDER BY COUNT(*) DESC 
            LIMIT 1
        ),
        updated_at = NOW()
    WHERE id = NEW.customer_id;
    
    -- Upsert en customer_preferences para esta sucursal
    INSERT INTO public.customer_preferences (
        customer_id, 
        branch_id, 
        visit_count, 
        total_spent, 
        last_order_at,
        avg_ticket
    )
    VALUES (
        NEW.customer_id, 
        NEW.branch_id, 
        1, 
        NEW.total, 
        NOW(),
        NEW.total
    )
    ON CONFLICT (customer_id, branch_id) DO UPDATE SET
        visit_count = customer_preferences.visit_count + 1,
        total_spent = customer_preferences.total_spent + EXCLUDED.total_spent,
        last_order_at = NOW(),
        avg_ticket = (customer_preferences.total_spent + EXCLUDED.total_spent) / (customer_preferences.visit_count + 1),
        updated_at = NOW();
    
    RETURN NEW;
END;
$$;

-- 6. Trigger para actualizar stats en cada pedido nuevo
DROP TRIGGER IF EXISTS trigger_update_customer_stats ON public.orders;

CREATE TRIGGER trigger_update_customer_stats
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_customer_order_stats();

-- 7. Función para buscar o crear cliente por teléfono
CREATE OR REPLACE FUNCTION public.find_or_create_customer(
    p_phone TEXT,
    p_name TEXT,
    p_email TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_customer_id UUID;
    v_clean_phone TEXT;
BEGIN
    -- Limpiar teléfono (solo números)
    v_clean_phone := regexp_replace(p_phone, '[^0-9]', '', 'g');
    
    -- Buscar cliente existente por teléfono
    SELECT id INTO v_customer_id
    FROM public.customers
    WHERE regexp_replace(phone, '[^0-9]', '', 'g') = v_clean_phone
    LIMIT 1;
    
    -- Si no existe, crear nuevo
    IF v_customer_id IS NULL THEN
        INSERT INTO public.customers (full_name, phone, email)
        VALUES (p_name, p_phone, p_email)
        RETURNING id INTO v_customer_id;
    ELSE
        -- Actualizar nombre/email si están vacíos
        UPDATE public.customers
        SET 
            full_name = COALESCE(NULLIF(full_name, ''), p_name),
            email = COALESCE(email, p_email),
            updated_at = NOW()
        WHERE id = v_customer_id
        AND (full_name IS NULL OR full_name = '' OR email IS NULL);
    END IF;
    
    RETURN v_customer_id;
END;
$$;

-- 8. Agregar campo last_order_at a customer_preferences si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_preferences' 
        AND column_name = 'last_order_at'
    ) THEN
        ALTER TABLE public.customer_preferences 
        ADD COLUMN last_order_at TIMESTAMPTZ;
    END IF;
END $$;