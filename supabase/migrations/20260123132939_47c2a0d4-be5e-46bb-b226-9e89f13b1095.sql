-- Tabla para reglas de pedido por proveedor (basado en turno, no día calendario)
CREATE TABLE public.supplier_order_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  
  -- Día del TURNO en que se puede pedir (0=Domingo, 1=Lunes...)
  order_shift_day INTEGER NOT NULL CHECK (order_shift_day >= 0 AND order_shift_day <= 6),
  
  -- Día calendario de entrega
  delivery_day INTEGER NOT NULL CHECK (delivery_day >= 0 AND delivery_day <= 6),
  delivery_time TIME DEFAULT '12:00',
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Un proveedor no puede tener dos reglas para el mismo día de turno
  UNIQUE(supplier_id, order_shift_day)
);

-- Enable RLS
ALTER TABLE public.supplier_order_rules ENABLE ROW LEVEL SECURITY;

-- Policies (todos pueden leer, solo admins pueden modificar)
CREATE POLICY "Anyone can view supplier order rules"
ON public.supplier_order_rules FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can manage supplier order rules"
ON public.supplier_order_rules FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Índice para búsquedas rápidas
CREATE INDEX idx_supplier_order_rules_supplier ON public.supplier_order_rules(supplier_id);
CREATE INDEX idx_supplier_order_rules_shift_day ON public.supplier_order_rules(order_shift_day) WHERE is_active = true;