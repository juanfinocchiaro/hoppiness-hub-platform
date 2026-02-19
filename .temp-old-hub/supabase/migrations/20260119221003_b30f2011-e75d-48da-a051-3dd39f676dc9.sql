-- =====================================================
-- COMPLETAR ARQUITECTURA DE CONTROL DE PROVEEDORES
-- =====================================================

-- 1. Tipo ENUM para control de proveedores (si no existe)
DO $$ BEGIN
    CREATE TYPE supplier_control_type AS ENUM ('brand_only', 'brand_preferred', 'free');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Agregar campo supplier_control a ingredients (si no existe)
ALTER TABLE public.ingredients 
ADD COLUMN IF NOT EXISTS supplier_control supplier_control_type NOT NULL DEFAULT 'free';

-- 3. Agregar campo is_brand_supplier a suppliers (si no existe)
ALTER TABLE public.suppliers 
ADD COLUMN IF NOT EXISTS is_brand_supplier boolean NOT NULL DEFAULT false;

-- 4. Tabla de proveedores aprobados por ingrediente (nivel marca)
CREATE TABLE IF NOT EXISTS public.ingredient_approved_suppliers (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    ingredient_id uuid NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
    supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
    is_primary boolean NOT NULL DEFAULT false,
    negotiated_price numeric(12,2),
    notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE(ingredient_id, supplier_id)
);

-- 5. Índices
CREATE INDEX IF NOT EXISTS idx_ingredient_approved_suppliers_ingredient ON public.ingredient_approved_suppliers(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_ingredient_approved_suppliers_supplier ON public.ingredient_approved_suppliers(supplier_id);
CREATE INDEX IF NOT EXISTS idx_ingredients_supplier_control ON public.ingredients(supplier_control);

-- 6. RLS para ingredient_approved_suppliers
ALTER TABLE public.ingredient_approved_suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage approved suppliers" ON public.ingredient_approved_suppliers;
CREATE POLICY "Admins can manage approved suppliers"
ON public.ingredient_approved_suppliers FOR ALL
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can view approved suppliers" ON public.ingredient_approved_suppliers;
CREATE POLICY "Authenticated users can view approved suppliers"
ON public.ingredient_approved_suppliers FOR SELECT
USING (auth.role() = 'authenticated');

-- 7. Función para validar proveedor permitido
CREATE OR REPLACE FUNCTION public.validate_supplier_for_ingredient(
    p_ingredient_id uuid,
    p_supplier_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_control supplier_control_type;
    v_is_approved boolean;
BEGIN
    SELECT supplier_control INTO v_control
    FROM public.ingredients
    WHERE id = p_ingredient_id;
    
    IF v_control = 'free' THEN
        RETURN true;
    END IF;
    
    SELECT EXISTS (
        SELECT 1 FROM public.ingredient_approved_suppliers
        WHERE ingredient_id = p_ingredient_id
        AND supplier_id = p_supplier_id
    ) INTO v_is_approved;
    
    IF v_control = 'brand_only' THEN
        RETURN v_is_approved;
    END IF;
    
    RETURN true;
END;
$$;

-- 8. Función para obtener proveedores permitidos
CREATE OR REPLACE FUNCTION public.get_allowed_suppliers_for_ingredient(p_ingredient_id uuid)
RETURNS TABLE (
    supplier_id uuid,
    supplier_name text,
    is_primary boolean,
    negotiated_price numeric,
    is_approved boolean
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_control supplier_control_type;
BEGIN
    SELECT supplier_control INTO v_control
    FROM public.ingredients
    WHERE id = p_ingredient_id;
    
    IF v_control = 'brand_only' THEN
        RETURN QUERY
        SELECT 
            s.id,
            s.name,
            ias.is_primary,
            ias.negotiated_price,
            true::boolean
        FROM public.ingredient_approved_suppliers ias
        JOIN public.suppliers s ON s.id = ias.supplier_id
        WHERE ias.ingredient_id = p_ingredient_id
        AND s.is_active = true
        ORDER BY ias.is_primary DESC, s.name;
    ELSE
        RETURN QUERY
        SELECT 
            s.id,
            s.name,
            COALESCE(ias.is_primary, false),
            ias.negotiated_price,
            (ias.id IS NOT NULL)::boolean
        FROM public.suppliers s
        LEFT JOIN public.ingredient_approved_suppliers ias 
            ON ias.supplier_id = s.id 
            AND ias.ingredient_id = p_ingredient_id
        WHERE s.is_active = true
        ORDER BY (ias.id IS NOT NULL) DESC, ias.is_primary DESC, s.name;
    END IF;
END;
$$;

-- 9. Comentarios
COMMENT ON COLUMN public.ingredients.supplier_control IS 'brand_only: solo proveedores de marca, brand_preferred: sugiere marca pero permite otros, free: el local elige';
COMMENT ON COLUMN public.suppliers.is_brand_supplier IS 'TRUE si es proveedor central/homologado por la marca';
COMMENT ON TABLE public.ingredient_approved_suppliers IS 'Proveedores autorizados por la marca para cada ingrediente';