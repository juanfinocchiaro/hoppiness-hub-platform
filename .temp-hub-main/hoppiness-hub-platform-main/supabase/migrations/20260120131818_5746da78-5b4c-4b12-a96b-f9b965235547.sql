-- =====================================================
-- FASE 1: SISTEMA DE CANALES Y DISPONIBILIDAD POR CANAL
-- =====================================================

-- 1. TABLA CHANNELS - Catálogo de Canales (Mi Marca)
CREATE TABLE public.channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificación
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  
  -- Clasificación
  channel_type TEXT NOT NULL CHECK (channel_type IN (
    'direct',
    'pos',
    'aggregator',
    'messaging',
    'marketplace',
    'other'
  )),
  
  -- Modos de entrega permitidos
  allows_delivery BOOLEAN DEFAULT false,
  allows_takeaway BOOLEAN DEFAULT false,
  allows_dine_in BOOLEAN DEFAULT false,
  
  -- Configuración de integración
  requires_integration BOOLEAN DEFAULT false,
  integration_type TEXT,
  
  -- Apariencia
  icon TEXT,
  color TEXT,
  
  -- Estado
  is_active BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  
  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para channels
CREATE INDEX idx_channels_slug ON public.channels(slug);
CREATE INDEX idx_channels_type ON public.channels(channel_type);
CREATE INDEX idx_channels_active ON public.channels(is_active);

-- Trigger para updated_at
CREATE TRIGGER update_channels_updated_at
  BEFORE UPDATE ON public.channels
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS para channels
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Channels are viewable by authenticated users"
  ON public.channels FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Channels are manageable by admins"
  ON public.channels FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- 2. TABLA BRANCH_CHANNELS - Canales Activos por Sucursal
CREATE TABLE public.branch_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  
  -- Estado
  is_enabled BOOLEAN DEFAULT false,
  
  -- Configuración específica
  config JSONB DEFAULT '{}',
  custom_schedule JSONB,
  
  -- Overrides
  delivery_fee_override DECIMAL(10,2),
  minimum_order_override DECIMAL(10,2),
  
  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(branch_id, channel_id)
);

-- Índices
CREATE INDEX idx_branch_channels_branch ON public.branch_channels(branch_id);
CREATE INDEX idx_branch_channels_channel ON public.branch_channels(channel_id);
CREATE INDEX idx_branch_channels_enabled ON public.branch_channels(is_enabled);

-- Trigger para updated_at
CREATE TRIGGER update_branch_channels_updated_at
  BEFORE UPDATE ON public.branch_channels
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS para branch_channels
ALTER TABLE public.branch_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Branch channels viewable by users with branch access"
  ON public.branch_channels FOR SELECT
  TO authenticated
  USING (
    public.is_admin(auth.uid()) OR
    public.has_branch_access(auth.uid(), branch_id)
  );

CREATE POLICY "Branch channels manageable by admins and branch managers"
  ON public.branch_channels FOR ALL
  TO authenticated
  USING (
    public.is_admin(auth.uid()) OR
    public.has_branch_permission(auth.uid(), branch_id, 'config.channels')
  );

-- 3. TABLA PRODUCT_ALLOWED_CHANNELS - Canales Permitidos por Producto
CREATE TABLE public.product_allowed_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  
  -- Permisos
  is_allowed BOOLEAN DEFAULT true,
  
  -- Precio diferenciado por canal
  price_override DECIMAL(10,2),
  
  -- Notas
  notes TEXT,
  
  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(product_id, channel_id)
);

-- Índices
CREATE INDEX idx_product_channels_product ON public.product_allowed_channels(product_id);
CREATE INDEX idx_product_channels_channel ON public.product_allowed_channels(channel_id);
CREATE INDEX idx_product_channels_allowed ON public.product_allowed_channels(is_allowed);

-- RLS
ALTER TABLE public.product_allowed_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Product channels viewable by authenticated users"
  ON public.product_allowed_channels FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Product channels manageable by admins"
  ON public.product_allowed_channels FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- 4. TABLA BRANCH_PRODUCT_CHANNEL_AVAILABILITY - Disponibilidad Real
CREATE TABLE public.branch_product_channel_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  
  -- Estado operativo
  is_available BOOLEAN DEFAULT true,
  
  -- Razón si no está disponible
  unavailable_reason TEXT CHECK (unavailable_reason IN (
    'out_of_stock',
    'temporarily_off',
    'schedule',
    'preparation_issue',
    'other'
  )),
  unavailable_note TEXT,
  
  -- Stock tracking
  stock_quantity INT,
  low_stock_threshold INT,
  
  -- Precio local por canal
  local_price_override DECIMAL(10,2),
  
  -- Auditoría
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  
  UNIQUE(branch_id, product_id, channel_id)
);

-- Índices
CREATE INDEX idx_bpca_branch ON public.branch_product_channel_availability(branch_id);
CREATE INDEX idx_bpca_product ON public.branch_product_channel_availability(product_id);
CREATE INDEX idx_bpca_channel ON public.branch_product_channel_availability(channel_id);
CREATE INDEX idx_bpca_available ON public.branch_product_channel_availability(is_available);
CREATE INDEX idx_bpca_composite ON public.branch_product_channel_availability(branch_id, channel_id, is_available);

-- Trigger para updated_at
CREATE TRIGGER update_bpca_updated_at
  BEFORE UPDATE ON public.branch_product_channel_availability
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.branch_product_channel_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "BPCA viewable by users with branch access"
  ON public.branch_product_channel_availability FOR SELECT
  TO authenticated
  USING (
    public.is_admin(auth.uid()) OR
    public.has_branch_access(auth.uid(), branch_id)
  );

CREATE POLICY "BPCA manageable by branch managers"
  ON public.branch_product_channel_availability FOR ALL
  TO authenticated
  USING (
    public.is_admin(auth.uid()) OR
    public.has_branch_permission(auth.uid(), branch_id, 'menu.toggle')
  );

-- 5. MODIFICAR PRODUCTS - Agregar control de sucursales
ALTER TABLE public.products
ADD COLUMN is_available_all_branches BOOLEAN DEFAULT true;

-- 6. TABLA PRODUCT_BRANCH_EXCLUSIONS - Exclusiones por sucursal
CREATE TABLE public.product_branch_exclusions (
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (product_id, branch_id)
);

-- Índices
CREATE INDEX idx_pbe_product ON public.product_branch_exclusions(product_id);
CREATE INDEX idx_pbe_branch ON public.product_branch_exclusions(branch_id);

-- RLS
ALTER TABLE public.product_branch_exclusions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Product branch exclusions viewable by authenticated users"
  ON public.product_branch_exclusions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Product branch exclusions manageable by admins"
  ON public.product_branch_exclusions FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- 7. MODIFICAR ORDERS - Agregar channel_id
ALTER TABLE public.orders
ADD COLUMN channel_id UUID REFERENCES public.channels(id);

-- 8. SEED DE CANALES INICIALES
INSERT INTO public.channels (name, slug, channel_type, allows_delivery, allows_takeaway, allows_dine_in, icon, color, display_order, requires_integration, integration_type) VALUES
('Mostrador', 'mostrador', 'pos', true, true, true, 'Monitor', '#10b981', 1, false, NULL),
('Delivery', 'delivery', 'direct', true, false, false, 'Bike', '#3b82f6', 2, false, NULL),
('Take Away', 'takeaway', 'direct', false, true, false, 'ShoppingBag', '#8b5cf6', 3, false, NULL),
('Rappi', 'rappi', 'aggregator', true, false, false, 'Bike', '#ff521d', 4, true, 'rappi'),
('PedidosYa', 'pedidosya', 'aggregator', true, false, false, 'Utensils', '#d62b56', 5, true, 'pedidosya'),
('MercadoPago Delivery', 'mercadopago', 'marketplace', true, true, false, 'CreditCard', '#009ee3', 6, true, 'mercadopago');

-- 9. FUNCIÓN RPC: Obtener productos disponibles para un canal
CREATE OR REPLACE FUNCTION public.get_available_products_for_channel(
  p_branch_id UUID,
  p_channel_slug TEXT
)
RETURNS TABLE (
  product_id UUID,
  product_name TEXT,
  product_description TEXT,
  base_price DECIMAL,
  final_price DECIMAL,
  category_id UUID,
  category_name TEXT,
  image_url TEXT,
  is_available BOOLEAN,
  unavailable_reason TEXT,
  stock_quantity INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_channel_id UUID;
BEGIN
  -- Obtener channel_id
  SELECT id INTO v_channel_id FROM channels WHERE slug = p_channel_slug AND is_active = true;
  
  IF v_channel_id IS NULL THEN
    RAISE EXCEPTION 'Canal no encontrado o inactivo: %', p_channel_slug;
  END IF;
  
  -- Verificar que el canal está habilitado en la sucursal
  IF NOT EXISTS (
    SELECT 1 FROM branch_channels 
    WHERE branch_id = p_branch_id AND channel_id = v_channel_id AND is_enabled = true
  ) THEN
    RAISE EXCEPTION 'Canal no habilitado en esta sucursal';
  END IF;
  
  RETURN QUERY
  SELECT 
    p.id as product_id,
    p.name as product_name,
    p.description as product_description,
    p.price as base_price,
    COALESCE(
      bpca.local_price_override,
      pac.price_override,
      p.price
    ) as final_price,
    p.category_id,
    pc.name as category_name,
    p.image_url,
    COALESCE(bpca.is_available, true) as is_available,
    bpca.unavailable_reason,
    bpca.stock_quantity
  FROM products p
  JOIN product_categories pc ON p.category_id = pc.id
  -- Check 1: Producto permitido en este canal
  JOIN product_allowed_channels pac ON p.id = pac.product_id 
    AND pac.channel_id = v_channel_id 
    AND pac.is_allowed = true
  -- Check 2: Producto habilitado para esta sucursal
  LEFT JOIN product_branch_exclusions pbe ON p.id = pbe.product_id AND pbe.branch_id = p_branch_id
  -- Check 3: Disponibilidad local
  LEFT JOIN branch_product_channel_availability bpca 
    ON p.id = bpca.product_id 
    AND bpca.branch_id = p_branch_id 
    AND bpca.channel_id = v_channel_id
  WHERE 
    p.is_available = true
    AND pc.is_active = true
    AND (
      (p.is_available_all_branches = true AND pbe.product_id IS NULL)
      OR
      (p.is_available_all_branches = false AND pbe.product_id IS NOT NULL)
    )
  ORDER BY pc.display_order, p.name;
END;
$$;

-- 10. FUNCIÓN RPC: Toggle de disponibilidad por canal
CREATE OR REPLACE FUNCTION public.toggle_product_channel_availability(
  p_branch_id UUID,
  p_product_id UUID,
  p_channel_id UUID,
  p_is_available BOOLEAN,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO branch_product_channel_availability (
    branch_id, product_id, channel_id, is_available, unavailable_reason, updated_at, updated_by
  )
  VALUES (
    p_branch_id, p_product_id, p_channel_id, p_is_available, p_reason, now(), auth.uid()
  )
  ON CONFLICT (branch_id, product_id, channel_id)
  DO UPDATE SET
    is_available = EXCLUDED.is_available,
    unavailable_reason = EXCLUDED.unavailable_reason,
    updated_at = now(),
    updated_by = auth.uid();
  
  RETURN true;
END;
$$;

-- 11. FUNCIÓN RPC: Obtener canales activos de una sucursal
CREATE OR REPLACE FUNCTION public.get_branch_active_channels(p_branch_id UUID)
RETURNS TABLE (
  channel_id UUID,
  channel_name TEXT,
  channel_slug TEXT,
  channel_type TEXT,
  allows_delivery BOOLEAN,
  allows_takeaway BOOLEAN,
  allows_dine_in BOOLEAN,
  icon TEXT,
  color TEXT,
  config JSONB,
  is_enabled BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.slug,
    c.channel_type,
    c.allows_delivery,
    c.allows_takeaway,
    c.allows_dine_in,
    c.icon,
    c.color,
    bc.config,
    bc.is_enabled
  FROM channels c
  LEFT JOIN branch_channels bc ON c.id = bc.channel_id AND bc.branch_id = p_branch_id
  WHERE c.is_active = true
  ORDER BY c.display_order;
END;
$$;

-- 12. TRIGGER: Sincronizar canales al crear sucursal
CREATE OR REPLACE FUNCTION public.setup_branch_channels()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO branch_channels (branch_id, channel_id, is_enabled)
  SELECT 
    NEW.id,
    c.id,
    CASE 
      WHEN c.slug = 'mostrador' THEN true
      ELSE false
    END
  FROM channels c
  WHERE c.is_active = true;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER setup_branch_channels_trigger
  AFTER INSERT ON public.branches
  FOR EACH ROW
  EXECUTE FUNCTION public.setup_branch_channels();

-- 13. TRIGGER: Sincronizar productos a canales al crear producto
CREATE OR REPLACE FUNCTION public.sync_product_to_channels()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Por defecto, permitir producto en Mostrador y canales directos
  INSERT INTO product_allowed_channels (product_id, channel_id, is_allowed)
  SELECT 
    NEW.id,
    c.id,
    true
  FROM channels c
  WHERE c.slug IN ('mostrador', 'delivery', 'takeaway')
  AND c.is_active = true;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_product_to_channels_trigger
  AFTER INSERT ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_product_to_channels();

-- 14. TRIGGER: Sincronizar nuevo canal a todos los productos y sucursales
CREATE OR REPLACE FUNCTION public.sync_channel_to_all()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Agregar a todas las sucursales (deshabilitado por defecto)
  INSERT INTO branch_channels (branch_id, channel_id, is_enabled)
  SELECT b.id, NEW.id, false
  FROM branches b
  WHERE b.is_active = true
  ON CONFLICT (branch_id, channel_id) DO NOTHING;
  
  -- NO agregar automáticamente a productos (debe ser explícito)
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_channel_to_all_trigger
  AFTER INSERT ON public.channels
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_channel_to_all();