-- Crear tabla de categorías de ingredientes
CREATE TABLE public.ingredient_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    cost_category TEXT DEFAULT 'cmv', -- 'cmv', 'gastos_operativos', 'no_deducible'
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.ingredient_categories ENABLE ROW LEVEL SECURITY;

-- Todos pueden leer
CREATE POLICY "Categories are viewable by authenticated users"
ON public.ingredient_categories
FOR SELECT
TO authenticated
USING (true);

-- Solo admins pueden modificar
CREATE POLICY "Admins can manage categories"
ON public.ingredient_categories
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Insertar categorías basadas en datos existentes
INSERT INTO public.ingredient_categories (name, cost_category, display_order) VALUES
('CMV Alimento', 'cmv', 1),
('Bebidas sin Alcohol', 'cmv', 2),
('Bebidas con Alcohol', 'cmv', 3),
('Descartable Salón', 'gastos_operativos', 4),
('Descartable Delivery', 'gastos_operativos', 5),
('Limpieza', 'gastos_operativos', 6),
('Insumo Clientes', 'gastos_operativos', 7);

-- Cambiar columna category en ingredients a referencia (opcional, mantenemos TEXT por flexibilidad)
-- pero agregamos constraint para validar

COMMENT ON TABLE public.ingredient_categories IS 'Categorías de ingredientes gestionadas por la marca';