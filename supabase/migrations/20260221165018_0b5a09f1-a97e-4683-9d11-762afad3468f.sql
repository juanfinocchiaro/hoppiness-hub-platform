
-- Tabla de zonas de delivery por sucursal
CREATE TABLE public.delivery_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  costo_envio NUMERIC(10,2) NOT NULL DEFAULT 0,
  pedido_minimo NUMERIC(10,2) DEFAULT 0,
  tiempo_estimado_min INTEGER DEFAULT 40,
  barrios TEXT[] DEFAULT '{}',
  descripcion TEXT,
  orden INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Columna en pedidos para referenciar la zona
ALTER TABLE public.pedidos ADD COLUMN delivery_zone_id UUID REFERENCES public.delivery_zones(id);

-- RLS
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;

-- Lectura pública (clientes necesitan ver zonas)
CREATE POLICY "Zonas de delivery visibles para todos"
  ON public.delivery_zones FOR SELECT
  USING (true);

-- Insert/Update/Delete solo staff con acceso al local
CREATE POLICY "Staff puede gestionar zonas de su local"
  ON public.delivery_zones FOR INSERT
  WITH CHECK (public.has_branch_access_v2(auth.uid(), branch_id));

CREATE POLICY "Staff puede actualizar zonas de su local"
  ON public.delivery_zones FOR UPDATE
  USING (public.has_branch_access_v2(auth.uid(), branch_id));

CREATE POLICY "Staff puede eliminar zonas de su local"
  ON public.delivery_zones FOR DELETE
  USING (public.has_branch_access_v2(auth.uid(), branch_id));

-- Trigger updated_at
CREATE TRIGGER update_delivery_zones_updated_at
  BEFORE UPDATE ON public.delivery_zones
  FOR EACH ROW
  EXECUTE FUNCTION public.update_branch_shifts_updated_at();
