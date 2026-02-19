-- =============================================
-- SPRINT 1-2: FUNDAMENTOS DE DATOS
-- =============================================

-- =============================================
-- 1. CLIENTES (Globales - Marca)
-- =============================================

CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    dni TEXT,
    cuit TEXT,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customers_phone ON public.customers(phone);
CREATE INDEX idx_customers_dni ON public.customers(dni);
CREATE INDEX idx_customers_email ON public.customers(email);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view customers"
    ON public.customers FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Staff with orders permission can manage customers"
    ON public.customers FOR ALL
    TO authenticated
    USING (is_admin(auth.uid()) OR EXISTS (
        SELECT 1 FROM public.branch_permissions bp 
        WHERE bp.user_id = auth.uid() AND bp.can_manage_orders = true
    ))
    WITH CHECK (is_admin(auth.uid()) OR EXISTS (
        SELECT 1 FROM public.branch_permissions bp 
        WHERE bp.user_id = auth.uid() AND bp.can_manage_orders = true
    ));

-- =============================================
-- 2. CUENTA CORRIENTE POR SUCURSAL
-- =============================================

CREATE TABLE public.branch_customer_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    balance NUMERIC(12,2) NOT NULL DEFAULT 0,
    credit_limit NUMERIC(12,2) DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(branch_id, customer_id)
);

CREATE INDEX idx_branch_customer_accounts_branch ON public.branch_customer_accounts(branch_id);
CREATE INDEX idx_branch_customer_accounts_customer ON public.branch_customer_accounts(customer_id);

ALTER TABLE public.branch_customer_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view branch customer accounts"
    ON public.branch_customer_accounts FOR SELECT
    TO authenticated
    USING (has_branch_access(auth.uid(), branch_id));

CREATE POLICY "Staff with orders permission can manage accounts"
    ON public.branch_customer_accounts FOR ALL
    TO authenticated
    USING (has_branch_permission(auth.uid(), branch_id, 'can_manage_orders'))
    WITH CHECK (has_branch_permission(auth.uid(), branch_id, 'can_manage_orders'));

-- =============================================
-- 3. MOVIMIENTOS DE CUENTA CORRIENTE
-- =============================================

CREATE TABLE public.customer_account_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.branch_customer_accounts(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('charge', 'payment', 'adjustment', 'credit_note')),
    order_id UUID REFERENCES public.orders(id),
    notes TEXT,
    recorded_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customer_account_movements_account ON public.customer_account_movements(account_id);
CREATE INDEX idx_customer_account_movements_order ON public.customer_account_movements(order_id);

ALTER TABLE public.customer_account_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view account movements"
    ON public.customer_account_movements FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.branch_customer_accounts bca
        WHERE bca.id = customer_account_movements.account_id
        AND has_branch_access(auth.uid(), bca.branch_id)
    ));

CREATE POLICY "Staff can create account movements"
    ON public.customer_account_movements FOR INSERT
    TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.branch_customer_accounts bca
        WHERE bca.id = customer_account_movements.account_id
        AND has_branch_permission(auth.uid(), bca.branch_id, 'can_manage_orders')
    ));

-- Trigger para actualizar balance
CREATE OR REPLACE FUNCTION public.update_customer_account_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.branch_customer_accounts
    SET balance = balance + NEW.amount,
        updated_at = now()
    WHERE id = NEW.account_id;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_customer_balance
    AFTER INSERT ON public.customer_account_movements
    FOR EACH ROW
    EXECUTE FUNCTION public.update_customer_account_balance();

-- =============================================
-- 4. PREFERENCIAS/HÁBITOS DE CLIENTE
-- =============================================

CREATE TABLE public.customer_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
    favorite_products UUID[] DEFAULT '{}',
    avg_ticket NUMERIC(10,2) DEFAULT 0,
    total_spent NUMERIC(12,2) DEFAULT 0,
    visit_count INTEGER DEFAULT 0,
    last_order_at TIMESTAMPTZ,
    preferred_payment_method TEXT,
    notes TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(customer_id, branch_id)
);

CREATE INDEX idx_customer_preferences_customer ON public.customer_preferences(customer_id);
CREATE INDEX idx_customer_preferences_branch ON public.customer_preferences(branch_id);

ALTER TABLE public.customer_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view customer preferences"
    ON public.customer_preferences FOR SELECT
    TO authenticated
    USING (branch_id IS NULL OR has_branch_access(auth.uid(), branch_id));

CREATE POLICY "System can manage customer preferences"
    ON public.customer_preferences FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- =============================================
-- 5. INGREDIENTES (Globales - Marca)
-- =============================================

CREATE TABLE public.ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    sku TEXT,
    unit TEXT NOT NULL DEFAULT 'unidad',
    cost_per_unit NUMERIC(10,4) DEFAULT 0,
    min_stock NUMERIC(10,2) DEFAULT 0,
    category TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ingredients_name ON public.ingredients(name);
CREATE INDEX idx_ingredients_category ON public.ingredients(category);
CREATE INDEX idx_ingredients_sku ON public.ingredients(sku);

ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view ingredients"
    ON public.ingredients FOR SELECT
    TO authenticated
    USING (is_active = true);

CREATE POLICY "Admins can manage ingredients"
    ON public.ingredients FOR ALL
    TO authenticated
    USING (is_admin(auth.uid()))
    WITH CHECK (is_admin(auth.uid()));

-- =============================================
-- 6. STOCK DE INGREDIENTES POR SUCURSAL
-- =============================================

CREATE TABLE public.branch_ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
    current_stock NUMERIC(12,4) NOT NULL DEFAULT 0,
    last_cost NUMERIC(10,4),
    min_stock_override NUMERIC(10,2),
    is_tracked BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(branch_id, ingredient_id)
);

CREATE INDEX idx_branch_ingredients_branch ON public.branch_ingredients(branch_id);
CREATE INDEX idx_branch_ingredients_ingredient ON public.branch_ingredients(ingredient_id);

ALTER TABLE public.branch_ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view branch ingredients"
    ON public.branch_ingredients FOR SELECT
    TO authenticated
    USING (has_branch_access(auth.uid(), branch_id));

CREATE POLICY "Staff with inventory permission can manage"
    ON public.branch_ingredients FOR ALL
    TO authenticated
    USING (has_branch_permission(auth.uid(), branch_id, 'can_manage_inventory'))
    WITH CHECK (has_branch_permission(auth.uid(), branch_id, 'can_manage_inventory'));

-- =============================================
-- 7. MOVIMIENTOS DE STOCK
-- =============================================

CREATE TYPE public.stock_movement_type AS ENUM (
    'sale',           -- Venta (resta)
    'purchase',       -- Compra (suma)
    'adjustment',     -- Ajuste manual
    'waste',          -- Merma/desperdicio
    'transfer_in',    -- Transferencia entrante
    'transfer_out',   -- Transferencia saliente
    'count_adjust',   -- Ajuste por conteo
    'production'      -- Producción/transformación
);

CREATE TABLE public.stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    ingredient_id UUID REFERENCES public.ingredients(id) ON DELETE SET NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    quantity NUMERIC(12,4) NOT NULL,
    type public.stock_movement_type NOT NULL,
    unit_cost NUMERIC(10,4),
    reference_type TEXT,
    reference_id UUID,
    notes TEXT,
    recorded_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stock_movements_branch ON public.stock_movements(branch_id);
CREATE INDEX idx_stock_movements_ingredient ON public.stock_movements(ingredient_id);
CREATE INDEX idx_stock_movements_product ON public.stock_movements(product_id);
CREATE INDEX idx_stock_movements_type ON public.stock_movements(type);
CREATE INDEX idx_stock_movements_created ON public.stock_movements(created_at);
CREATE INDEX idx_stock_movements_reference ON public.stock_movements(reference_type, reference_id);

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view branch stock movements"
    ON public.stock_movements FOR SELECT
    TO authenticated
    USING (has_branch_access(auth.uid(), branch_id));

CREATE POLICY "Staff with inventory permission can create movements"
    ON public.stock_movements FOR INSERT
    TO authenticated
    WITH CHECK (has_branch_permission(auth.uid(), branch_id, 'can_manage_inventory') OR 
                has_branch_permission(auth.uid(), branch_id, 'can_manage_orders'));

-- Trigger para actualizar stock automáticamente
CREATE OR REPLACE FUNCTION public.update_ingredient_stock_on_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    delta NUMERIC;
BEGIN
    IF NEW.ingredient_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Determinar dirección del movimiento
    CASE NEW.type
        WHEN 'sale', 'waste', 'transfer_out', 'production' THEN
            delta := -ABS(NEW.quantity);
        WHEN 'purchase', 'transfer_in', 'count_adjust' THEN
            delta := ABS(NEW.quantity);
        WHEN 'adjustment' THEN
            delta := NEW.quantity; -- Puede ser positivo o negativo
        ELSE
            delta := NEW.quantity;
    END CASE;

    -- Actualizar o crear registro de branch_ingredients
    INSERT INTO public.branch_ingredients (branch_id, ingredient_id, current_stock, last_cost)
    VALUES (NEW.branch_id, NEW.ingredient_id, delta, NEW.unit_cost)
    ON CONFLICT (branch_id, ingredient_id) DO UPDATE
    SET current_stock = branch_ingredients.current_stock + delta,
        last_cost = COALESCE(NEW.unit_cost, branch_ingredients.last_cost),
        updated_at = now();

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_ingredient_stock
    AFTER INSERT ON public.stock_movements
    FOR EACH ROW
    EXECUTE FUNCTION public.update_ingredient_stock_on_movement();

-- =============================================
-- 8. RECETAS DE PRODUCTOS
-- =============================================

CREATE TABLE public.product_recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
    quantity_required NUMERIC(10,4) NOT NULL,
    unit TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(product_id, ingredient_id)
);

CREATE INDEX idx_product_recipes_product ON public.product_recipes(product_id);
CREATE INDEX idx_product_recipes_ingredient ON public.product_recipes(ingredient_id);

ALTER TABLE public.product_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view recipes"
    ON public.product_recipes FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can manage recipes"
    ON public.product_recipes FOR ALL
    TO authenticated
    USING (is_admin(auth.uid()))
    WITH CHECK (is_admin(auth.uid()));

-- =============================================
-- 9. DESCUENTOS (Globales - Marca)
-- =============================================

CREATE TABLE public.discounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT,
    type TEXT NOT NULL CHECK (type IN ('fixed', 'percentage')),
    value NUMERIC(10,2) NOT NULL,
    min_order_amount NUMERIC(10,2) DEFAULT 0,
    max_discount_amount NUMERIC(10,2),
    valid_from TIMESTAMPTZ,
    valid_until TIMESTAMPTZ,
    usage_limit INTEGER,
    usage_count INTEGER DEFAULT 0,
    applies_to TEXT DEFAULT 'order' CHECK (applies_to IN ('order', 'product', 'category')),
    applies_to_ids UUID[],
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_discounts_code ON public.discounts(code);
CREATE INDEX idx_discounts_active ON public.discounts(is_active) WHERE is_active = true;

ALTER TABLE public.discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view active discounts"
    ON public.discounts FOR SELECT
    TO authenticated
    USING (is_active = true OR is_admin(auth.uid()));

CREATE POLICY "Admins can manage discounts"
    ON public.discounts FOR ALL
    TO authenticated
    USING (is_admin(auth.uid()))
    WITH CHECK (is_admin(auth.uid()));

-- =============================================
-- 10. DESCUENTOS AUTOMÁTICOS POR CLIENTE
-- =============================================

CREATE TABLE public.customer_discounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    discount_id UUID NOT NULL REFERENCES public.discounts(id) ON DELETE CASCADE,
    auto_apply BOOLEAN NOT NULL DEFAULT true,
    priority INTEGER DEFAULT 0,
    valid_from TIMESTAMPTZ,
    valid_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(customer_id, discount_id)
);

CREATE INDEX idx_customer_discounts_customer ON public.customer_discounts(customer_id);

ALTER TABLE public.customer_discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view customer discounts"
    ON public.customer_discounts FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can manage customer discounts"
    ON public.customer_discounts FOR ALL
    TO authenticated
    USING (is_admin(auth.uid()))
    WITH CHECK (is_admin(auth.uid()));

-- =============================================
-- 11. DESCUENTOS APLICADOS EN PEDIDOS
-- =============================================

CREATE TABLE public.order_discounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    discount_id UUID REFERENCES public.discounts(id) ON DELETE SET NULL,
    discount_name TEXT NOT NULL,
    discount_type TEXT NOT NULL,
    discount_value NUMERIC(10,2) NOT NULL,
    amount_applied NUMERIC(10,2) NOT NULL,
    applied_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_discounts_order ON public.order_discounts(order_id);

ALTER TABLE public.order_discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view order discounts"
    ON public.order_discounts FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = order_discounts.order_id
        AND has_branch_access(auth.uid(), o.branch_id)
    ));

CREATE POLICY "Staff can create order discounts"
    ON public.order_discounts FOR INSERT
    TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = order_discounts.order_id
        AND has_branch_access(auth.uid(), o.branch_id)
    ));

-- =============================================
-- 12. CONTEOS DE INVENTARIO
-- =============================================

CREATE TABLE public.inventory_counts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    count_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed', 'cancelled')),
    notes TEXT,
    started_by UUID,
    completed_by UUID,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inventory_counts_branch ON public.inventory_counts(branch_id);
CREATE INDEX idx_inventory_counts_date ON public.inventory_counts(count_date);

ALTER TABLE public.inventory_counts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view inventory counts"
    ON public.inventory_counts FOR SELECT
    TO authenticated
    USING (has_branch_access(auth.uid(), branch_id));

CREATE POLICY "Staff with inventory permission can manage counts"
    ON public.inventory_counts FOR ALL
    TO authenticated
    USING (has_branch_permission(auth.uid(), branch_id, 'can_manage_inventory'))
    WITH CHECK (has_branch_permission(auth.uid(), branch_id, 'can_manage_inventory'));

-- =============================================
-- 13. LÍNEAS DE CONTEO
-- =============================================

CREATE TABLE public.inventory_count_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    count_id UUID NOT NULL REFERENCES public.inventory_counts(id) ON DELETE CASCADE,
    ingredient_id UUID REFERENCES public.ingredients(id) ON DELETE SET NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    system_quantity NUMERIC(12,4),
    counted_quantity NUMERIC(12,4),
    difference NUMERIC(12,4),
    unit_cost NUMERIC(10,4),
    notes TEXT,
    counted_by UUID,
    counted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inventory_count_lines_count ON public.inventory_count_lines(count_id);

ALTER TABLE public.inventory_count_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view count lines"
    ON public.inventory_count_lines FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.inventory_counts ic
        WHERE ic.id = inventory_count_lines.count_id
        AND has_branch_access(auth.uid(), ic.branch_id)
    ));

CREATE POLICY "Staff with inventory permission can manage count lines"
    ON public.inventory_count_lines FOR ALL
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.inventory_counts ic
        WHERE ic.id = inventory_count_lines.count_id
        AND has_branch_permission(auth.uid(), ic.branch_id, 'can_manage_inventory')
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.inventory_counts ic
        WHERE ic.id = inventory_count_lines.count_id
        AND has_branch_permission(auth.uid(), ic.branch_id, 'can_manage_inventory')
    ));

-- =============================================
-- 14. CATEGORÍAS DE PROVEEDORES
-- =============================================

CREATE TABLE public.supplier_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.supplier_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view supplier categories"
    ON public.supplier_categories FOR SELECT
    TO authenticated
    USING (is_active = true);

CREATE POLICY "Admins can manage supplier categories"
    ON public.supplier_categories FOR ALL
    TO authenticated
    USING (is_admin(auth.uid()))
    WITH CHECK (is_admin(auth.uid()));

-- =============================================
-- 15. AGREGAR CAMPOS A TABLAS EXISTENTES
-- =============================================

-- Agregar customer_id a orders
ALTER TABLE public.orders 
    ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id),
    ADD COLUMN IF NOT EXISTS tip_amount NUMERIC(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS order_group_id UUID,
    ADD COLUMN IF NOT EXISTS discount_total NUMERIC(10,2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_group ON public.orders(order_group_id);

-- Agregar guest_number a order_items (para comandas por comensal)
ALTER TABLE public.order_items
    ADD COLUMN IF NOT EXISTS guest_number INTEGER DEFAULT 1;

-- Agregar category_id a suppliers
ALTER TABLE public.suppliers
    ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.supplier_categories(id);

-- Agregar is_favorite a branch_products
ALTER TABLE public.branch_products
    ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;

-- =============================================
-- 16. ASIGNACIÓN DE CAJAS POR USUARIO
-- =============================================

CREATE TABLE public.user_cash_registers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    cash_register_id UUID NOT NULL REFERENCES public.cash_registers(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, cash_register_id)
);

CREATE INDEX idx_user_cash_registers_user ON public.user_cash_registers(user_id);
CREATE INDEX idx_user_cash_registers_branch ON public.user_cash_registers(branch_id);

ALTER TABLE public.user_cash_registers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their cash register assignments"
    ON public.user_cash_registers FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR has_branch_permission(auth.uid(), branch_id, 'can_manage_staff'));

CREATE POLICY "Managers can manage cash register assignments"
    ON public.user_cash_registers FOR ALL
    TO authenticated
    USING (has_branch_permission(auth.uid(), branch_id, 'can_manage_staff'))
    WITH CHECK (has_branch_permission(auth.uid(), branch_id, 'can_manage_staff'));

-- =============================================
-- 17. CONFIGURACIÓN KDS POR SUCURSAL
-- =============================================

CREATE TABLE public.kds_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE UNIQUE,
    theme TEXT DEFAULT 'dark',
    primary_color TEXT DEFAULT '#f97316',
    font_size TEXT DEFAULT 'medium',
    show_timer BOOLEAN DEFAULT true,
    alert_threshold_minutes INTEGER DEFAULT 10,
    sound_enabled BOOLEAN DEFAULT true,
    sound_volume INTEGER DEFAULT 80,
    auto_bump_enabled BOOLEAN DEFAULT false,
    auto_bump_minutes INTEGER DEFAULT 15,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.kds_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view KDS settings"
    ON public.kds_settings FOR SELECT
    TO authenticated
    USING (has_branch_access(auth.uid(), branch_id));

CREATE POLICY "Managers can manage KDS settings"
    ON public.kds_settings FOR ALL
    TO authenticated
    USING (has_branch_permission(auth.uid(), branch_id, 'can_manage_staff'))
    WITH CHECK (has_branch_permission(auth.uid(), branch_id, 'can_manage_staff'));

-- =============================================
-- 18. FUNCIÓN PARA CALCULAR COSTO DE PRODUCTO
-- =============================================

CREATE OR REPLACE FUNCTION public.calculate_product_cost(p_product_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    total_cost NUMERIC := 0;
BEGIN
    SELECT COALESCE(SUM(pr.quantity_required * COALESCE(i.cost_per_unit, 0)), 0)
    INTO total_cost
    FROM public.product_recipes pr
    JOIN public.ingredients i ON i.id = pr.ingredient_id
    WHERE pr.product_id = p_product_id;

    RETURN total_cost;
END;
$$;

-- =============================================
-- 19. FUNCIÓN PARA DESCONTAR STOCK AL VENDER
-- =============================================

CREATE OR REPLACE FUNCTION public.deduct_stock_on_sale()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_branch_id UUID;
    v_recipe RECORD;
BEGIN
    -- Obtener branch_id de la orden
    SELECT branch_id INTO v_branch_id
    FROM public.orders
    WHERE id = NEW.order_id;

    -- Recorrer receta del producto y crear movimientos de stock
    FOR v_recipe IN
        SELECT pr.ingredient_id, pr.quantity_required
        FROM public.product_recipes pr
        WHERE pr.product_id = NEW.product_id
    LOOP
        INSERT INTO public.stock_movements (
            branch_id,
            ingredient_id,
            quantity,
            type,
            reference_type,
            reference_id,
            notes
        ) VALUES (
            v_branch_id,
            v_recipe.ingredient_id,
            v_recipe.quantity_required * NEW.quantity,
            'sale',
            'order_item',
            NEW.id,
            'Venta automática'
        );
    END LOOP;

    RETURN NEW;
END;
$$;

-- El trigger se activará después de que se cree un order_item
-- Solo si hay recetas configuradas
CREATE TRIGGER trg_deduct_stock_on_sale
    AFTER INSERT ON public.order_items
    FOR EACH ROW
    EXECUTE FUNCTION public.deduct_stock_on_sale();

-- =============================================
-- 20. TRIGGER PARA ACTUALIZAR PREFERENCIAS DE CLIENTE
-- =============================================

CREATE OR REPLACE FUNCTION public.update_customer_preferences_on_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Solo procesar cuando el pedido se marca como entregado
    IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') AND NEW.customer_id IS NOT NULL THEN
        INSERT INTO public.customer_preferences (
            customer_id,
            branch_id,
            total_spent,
            visit_count,
            last_order_at,
            avg_ticket,
            preferred_payment_method
        ) VALUES (
            NEW.customer_id,
            NEW.branch_id,
            NEW.total,
            1,
            NEW.created_at,
            NEW.total,
            NEW.payment_method::text
        )
        ON CONFLICT (customer_id, branch_id) DO UPDATE
        SET total_spent = customer_preferences.total_spent + NEW.total,
            visit_count = customer_preferences.visit_count + 1,
            last_order_at = NEW.created_at,
            avg_ticket = (customer_preferences.total_spent + NEW.total) / (customer_preferences.visit_count + 1),
            updated_at = now();
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_customer_preferences
    AFTER UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_customer_preferences_on_order();

-- =============================================
-- 21. SINCRONIZACIÓN DE INGREDIENTES A SUCURSALES
-- =============================================

CREATE OR REPLACE FUNCTION public.sync_ingredient_to_branches()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.branch_ingredients (branch_id, ingredient_id, current_stock)
    SELECT b.id, NEW.id, 0
    FROM public.branches b
    WHERE b.is_active = true
    ON CONFLICT (branch_id, ingredient_id) DO NOTHING;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_ingredient_to_branches
    AFTER INSERT ON public.ingredients
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_ingredient_to_branches();