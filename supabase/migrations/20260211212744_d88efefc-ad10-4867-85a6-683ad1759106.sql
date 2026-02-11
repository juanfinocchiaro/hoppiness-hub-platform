
-- Modificadores de items de carta
CREATE TABLE public.item_modificadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_carta_id UUID NOT NULL REFERENCES public.menu_productos(id) ON DELETE CASCADE,
  
  tipo TEXT NOT NULL,
  nombre TEXT NOT NULL,
  
  -- REMOVIBLES
  ingrediente_id UUID REFERENCES public.insumos(id),
  receta_id UUID REFERENCES public.preparaciones(id),
  cantidad_ahorro DECIMAL(10,4),
  unidad_ahorro TEXT,
  costo_ahorro DECIMAL(12,2) DEFAULT 0,
  
  -- EXTRAS
  ingrediente_extra_id UUID REFERENCES public.insumos(id),
  receta_extra_id UUID REFERENCES public.preparaciones(id),
  cantidad_extra DECIMAL(10,4),
  unidad_extra TEXT,
  precio_extra DECIMAL(12,2) DEFAULT 0,
  costo_extra DECIMAL(12,2) DEFAULT 0,
  
  -- SUSTITUCIONES
  ingrediente_original_id UUID REFERENCES public.insumos(id),
  ingrediente_nuevo_id UUID REFERENCES public.insumos(id),
  cantidad_nuevo DECIMAL(10,4),
  unidad_nuevo TEXT,
  diferencia_precio DECIMAL(12,2) DEFAULT 0,
  diferencia_costo DECIMAL(12,2) DEFAULT 0,
  
  activo BOOLEAN DEFAULT true,
  orden INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_item_modificadores_item ON public.item_modificadores(item_carta_id);
CREATE INDEX idx_item_modificadores_tipo ON public.item_modificadores(tipo);

-- Validation trigger
CREATE OR REPLACE FUNCTION public.validate_modificador()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tipo NOT IN ('removible', 'extra', 'sustitucion') THEN
    RAISE EXCEPTION 'tipo debe ser removible, extra o sustitucion';
  END IF;

  IF NEW.tipo = 'removible' AND NEW.ingrediente_id IS NULL THEN
    RAISE EXCEPTION 'Removible debe tener ingrediente_id';
  END IF;

  IF NEW.tipo = 'extra' AND NEW.ingrediente_extra_id IS NULL AND NEW.receta_extra_id IS NULL THEN
    RAISE EXCEPTION 'Extra debe tener ingrediente_extra_id o receta_extra_id';
  END IF;

  IF NEW.tipo = 'sustitucion' AND (NEW.ingrediente_original_id IS NULL OR NEW.ingrediente_nuevo_id IS NULL) THEN
    RAISE EXCEPTION 'Sustitucion debe tener ingrediente_original_id e ingrediente_nuevo_id';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_modificador
  BEFORE INSERT OR UPDATE ON public.item_modificadores
  FOR EACH ROW EXECUTE FUNCTION public.validate_modificador();

-- RLS
ALTER TABLE public.item_modificadores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read modificadores"
  ON public.item_modificadores FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert modificadores"
  ON public.item_modificadores FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update modificadores"
  ON public.item_modificadores FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete modificadores"
  ON public.item_modificadores FOR DELETE
  TO authenticated
  USING (true);
