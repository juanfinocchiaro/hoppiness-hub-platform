
-- Corregir políticas permisivas en orders y order_items
-- Reemplazar WITH CHECK (true) por validaciones apropiadas

-- Eliminar políticas permisivas
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;

-- Crear políticas más seguras para pedidos públicos
-- Los clientes pueden crear pedidos proporcionando datos válidos
CREATE POLICY "Customers can create orders" ON public.orders
    FOR INSERT
    WITH CHECK (
        customer_name IS NOT NULL 
        AND customer_phone IS NOT NULL 
        AND branch_id IS NOT NULL
        AND order_type IS NOT NULL
    );

-- Los items solo pueden insertarse si el pedido existe y fue creado recientemente
CREATE POLICY "Items can be added to orders" ON public.order_items
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orders o 
            WHERE o.id = order_id 
            AND o.created_at > now() - interval '1 hour'
        )
    );
