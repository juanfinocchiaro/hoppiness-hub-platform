-- Sistema de Conversión de Ingredientes Alternativos
-- Permite a los locales usar un ingrediente alternativo cuando el principal se agota

-- 1. Agregar campo de ingrediente alternativo a la tabla de ingredientes
ALTER TABLE ingredients 
ADD COLUMN IF NOT EXISTS alternative_ingredient_id UUID REFERENCES ingredients(id);

ALTER TABLE ingredients 
ADD COLUMN IF NOT EXISTS notify_on_alternative_use BOOLEAN DEFAULT true;

-- 2. Crear tabla para registrar conversiones (historial)
CREATE TABLE IF NOT EXISTS ingredient_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  
  -- Qué se convirtió (del alternativo al principal)
  from_ingredient_id UUID NOT NULL REFERENCES ingredients(id),
  to_ingredient_id UUID NOT NULL REFERENCES ingredients(id),
  quantity DECIMAL(12,2) NOT NULL CHECK (quantity > 0),
  
  -- Contexto
  reason TEXT DEFAULT 'Sin stock del principal',
  triggered_by_product_id UUID REFERENCES products(id),
  
  -- Costos para tracking
  from_ingredient_cost DECIMAL(12,2),
  to_ingredient_cost DECIMAL(12,2),
  cost_difference DECIMAL(12,2) GENERATED ALWAYS AS (
    COALESCE(from_ingredient_cost, 0) - COALESCE(to_ingredient_cost, 0)
  ) STORED,
  
  -- Quién y cuándo
  performed_by UUID REFERENCES profiles(user_id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Índices para consultas eficientes
CREATE INDEX IF NOT EXISTS idx_conversions_branch ON ingredient_conversions(branch_id);
CREATE INDEX IF NOT EXISTS idx_conversions_date ON ingredient_conversions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversions_from_ingredient ON ingredient_conversions(from_ingredient_id);
CREATE INDEX IF NOT EXISTS idx_conversions_to_ingredient ON ingredient_conversions(to_ingredient_id);

-- 4. Habilitar RLS
ALTER TABLE ingredient_conversions ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS usando funciones existentes
CREATE POLICY "Staff can view conversions for their branches"
ON ingredient_conversions FOR SELECT
TO authenticated
USING (
  public.is_superadmin(auth.uid()) 
  OR public.has_branch_access_v2(auth.uid(), branch_id)
);

CREATE POLICY "Staff can create conversions for their branches"
ON ingredient_conversions FOR INSERT
TO authenticated
WITH CHECK (
  public.has_branch_access_v2(auth.uid(), branch_id)
);

-- 6. Agregar tipo de alerta para conversiones en brand_purchase_alerts
-- (La tabla ya existe, solo agregamos un comentario sobre el nuevo tipo)
COMMENT ON TABLE brand_purchase_alerts IS 'Alertas de compras incluyendo: backup_used, unauthorized_supplier, wrong_supplier, ingredient_conversion';

-- 7. Función para ejecutar la conversión de stock
CREATE OR REPLACE FUNCTION public.execute_ingredient_conversion(
  p_branch_id UUID,
  p_from_ingredient_id UUID, -- El alternativo (ej: Pan Armando)
  p_to_ingredient_id UUID,   -- El principal (ej: Pan Kalis)
  p_quantity DECIMAL,
  p_triggered_by_product_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT 'Sin stock del principal'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversion_id UUID;
  v_from_cost DECIMAL;
  v_to_cost DECIMAL;
  v_from_stock DECIMAL;
BEGIN
  -- Validar que el usuario tiene acceso a la sucursal
  IF NOT has_branch_access_v2(auth.uid(), p_branch_id) THEN
    RAISE EXCEPTION 'No tienes acceso a esta sucursal';
  END IF;

  -- Obtener stock actual del ingrediente alternativo
  SELECT current_stock INTO v_from_stock
  FROM branch_ingredients
  WHERE branch_id = p_branch_id AND ingredient_id = p_from_ingredient_id;

  IF COALESCE(v_from_stock, 0) < p_quantity THEN
    RAISE EXCEPTION 'Stock insuficiente del ingrediente alternativo. Disponible: %, Solicitado: %', 
      COALESCE(v_from_stock, 0), p_quantity;
  END IF;

  -- Obtener costos actuales
  SELECT cost_per_unit INTO v_from_cost FROM ingredients WHERE id = p_from_ingredient_id;
  SELECT cost_per_unit INTO v_to_cost FROM ingredients WHERE id = p_to_ingredient_id;

  -- Crear movimiento de salida del alternativo
  INSERT INTO stock_movements (
    branch_id, ingredient_id, quantity, type, 
    reference_type, notes, unit_cost
  ) VALUES (
    p_branch_id, p_from_ingredient_id, p_quantity, 'adjustment',
    'conversion', 'Conversión a ingrediente principal', v_from_cost
  );

  -- Crear movimiento de entrada al principal
  INSERT INTO stock_movements (
    branch_id, ingredient_id, quantity, type,
    reference_type, notes, unit_cost
  ) VALUES (
    p_branch_id, p_to_ingredient_id, p_quantity, 'adjustment',
    'conversion', 'Conversión desde ingrediente alternativo', v_to_cost
  );

  -- Registrar la conversión
  INSERT INTO ingredient_conversions (
    branch_id, from_ingredient_id, to_ingredient_id, quantity,
    reason, triggered_by_product_id, from_ingredient_cost, to_ingredient_cost,
    performed_by
  ) VALUES (
    p_branch_id, p_from_ingredient_id, p_to_ingredient_id, p_quantity,
    p_reason, p_triggered_by_product_id, v_from_cost, v_to_cost,
    auth.uid()
  ) RETURNING id INTO v_conversion_id;

  -- Verificar si hay que notificar a la marca
  IF (SELECT notify_on_alternative_use FROM ingredients WHERE id = p_to_ingredient_id) THEN
    INSERT INTO brand_purchase_alerts (
      branch_id, alert_type, details
    ) VALUES (
      p_branch_id, 
      'ingredient_conversion',
      jsonb_build_object(
        'conversion_id', v_conversion_id,
        'from_ingredient_id', p_from_ingredient_id,
        'to_ingredient_id', p_to_ingredient_id,
        'quantity', p_quantity,
        'from_cost', v_from_cost,
        'to_cost', v_to_cost,
        'cost_difference', (COALESCE(v_from_cost, 0) - COALESCE(v_to_cost, 0)) * p_quantity,
        'triggered_by_product_id', p_triggered_by_product_id,
        'performed_by', auth.uid()
      )
    );
  END IF;

  RETURN v_conversion_id;
END;
$$;