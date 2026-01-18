-- Tabla para relacionar sucursales con sus proveedores
CREATE TABLE public.branch_suppliers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(branch_id, supplier_id)
);

-- Enable RLS
ALTER TABLE public.branch_suppliers ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage branch suppliers"
ON public.branch_suppliers FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Managers can view branch suppliers"
ON public.branch_suppliers FOR SELECT
USING (has_branch_permission(auth.uid(), branch_id, 'can_manage_inventory'));

-- Función para auto-configurar una sucursal nueva con todos los productos
CREATE OR REPLACE FUNCTION public.setup_new_branch()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Insertar todos los productos disponibles para la nueva sucursal
    INSERT INTO public.branch_products (branch_id, product_id, is_available, custom_price, stock_quantity)
    SELECT 
        NEW.id,
        p.id,
        true,
        NULL, -- usa precio global
        NULL  -- sin control de stock
    FROM public.products p
    WHERE p.is_available = true;
    
    RETURN NEW;
END;
$$;

-- Trigger que se ejecuta al crear una sucursal
CREATE TRIGGER on_branch_created
AFTER INSERT ON public.branches
FOR EACH ROW
EXECUTE FUNCTION public.setup_new_branch();

-- Función para sincronizar productos nuevos a todas las sucursales
CREATE OR REPLACE FUNCTION public.sync_product_to_branches()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Cuando se crea un producto nuevo, agregarlo a todas las sucursales activas
    INSERT INTO public.branch_products (branch_id, product_id, is_available)
    SELECT 
        b.id,
        NEW.id,
        true
    FROM public.branches b
    WHERE b.is_active = true
    ON CONFLICT (branch_id, product_id) DO NOTHING;
    
    RETURN NEW;
END;
$$;

-- Agregar constraint unique a branch_products para el ON CONFLICT
ALTER TABLE public.branch_products 
ADD CONSTRAINT branch_products_branch_product_unique UNIQUE (branch_id, product_id);

-- Trigger para sincronizar productos nuevos
CREATE TRIGGER on_product_created
AFTER INSERT ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.sync_product_to_branches();