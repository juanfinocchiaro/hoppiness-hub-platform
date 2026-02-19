
-- =============================================
-- FASE 1: Infraestructura WebApp de Pedidos
-- =============================================

-- 1. Tabla webapp_config por sucursal
CREATE TABLE public.webapp_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  estado TEXT NOT NULL DEFAULT 'cerrado' CHECK (estado IN ('abierto', 'pausado', 'cerrado')),
  delivery_habilitado BOOLEAN NOT NULL DEFAULT false,
  delivery_radio_km NUMERIC(5,2) DEFAULT 5.0,
  delivery_costo NUMERIC(10,2) DEFAULT 0,
  delivery_pedido_minimo NUMERIC(10,2) DEFAULT 0,
  retiro_habilitado BOOLEAN NOT NULL DEFAULT true,
  comer_aca_habilitado BOOLEAN NOT NULL DEFAULT false,
  recepcion_modo TEXT NOT NULL DEFAULT 'manual' CHECK (recepcion_modo IN ('auto', 'manual')),
  tiempo_estimado_retiro_min INTEGER DEFAULT 20,
  tiempo_estimado_delivery_min INTEGER DEFAULT 40,
  horarios JSONB DEFAULT '[]'::jsonb,
  mensaje_pausa TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(branch_id)
);

-- 2. Agregar campos a pedidos para WebApp
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS origen TEXT DEFAULT 'pos',
  ADD COLUMN IF NOT EXISTS pago_online_id TEXT,
  ADD COLUMN IF NOT EXISTS pago_estado TEXT DEFAULT 'pendiente',
  ADD COLUMN IF NOT EXISTS webapp_tracking_code TEXT,
  ADD COLUMN IF NOT EXISTS cliente_email TEXT;

-- 3. Agregar campo webapp a items_carta
ALTER TABLE public.items_carta
  ADD COLUMN IF NOT EXISTS disponible_webapp BOOLEAN DEFAULT true;

-- 4. Tabla webapp_customers (registro opcional de clientes)
CREATE TABLE public.webapp_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telefono TEXT NOT NULL,
  nombre TEXT,
  email TEXT,
  direcciones JSONB DEFAULT '[]'::jsonb,
  ultimo_pedido_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(telefono)
);

-- 5. RLS para webapp_config
ALTER TABLE public.webapp_config ENABLE ROW LEVEL SECURITY;

-- Lectura pública (los clientes necesitan ver si el local está abierto)
CREATE POLICY "webapp_config_public_read" ON public.webapp_config
  FOR SELECT USING (true);

-- Solo managers pueden modificar
CREATE POLICY "webapp_config_manager_write" ON public.webapp_config
  FOR ALL TO authenticated
  USING (public.is_hr_for_branch(auth.uid(), branch_id))
  WITH CHECK (public.is_hr_for_branch(auth.uid(), branch_id));

-- 6. RLS para webapp_customers
ALTER TABLE public.webapp_customers ENABLE ROW LEVEL SECURITY;

-- Los clientes no se autentican, el edge function inserta con service role
-- Solo managers pueden leer
CREATE POLICY "webapp_customers_manager_read" ON public.webapp_customers
  FOR SELECT TO authenticated
  USING (public.is_superadmin(auth.uid()));

-- 7. Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_webapp_config_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_webapp_config_updated_at
  BEFORE UPDATE ON public.webapp_config
  FOR EACH ROW EXECUTE FUNCTION public.update_webapp_config_updated_at();

CREATE OR REPLACE FUNCTION public.update_webapp_customers_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_webapp_customers_updated_at
  BEFORE UPDATE ON public.webapp_customers
  FOR EACH ROW EXECUTE FUNCTION public.update_webapp_customers_updated_at();

-- 8. Vista pública del menú (items activos con categoría)
CREATE OR REPLACE VIEW public.webapp_menu_items AS
SELECT 
  ic.id,
  ic.nombre,
  ic.nombre_corto,
  ic.descripcion,
  ic.imagen_url,
  ic.precio_base,
  ic.categoria_carta_id,
  mc.nombre AS categoria_nombre,
  mc.orden AS categoria_orden,
  ic.orden,
  ic.disponible_delivery,
  ic.disponible_webapp,
  ic.tipo
FROM items_carta ic
LEFT JOIN menu_categorias mc ON mc.id = ic.categoria_carta_id
WHERE ic.activo = true 
  AND ic.deleted_at IS NULL
  AND ic.disponible_webapp = true
ORDER BY mc.orden, ic.orden;
