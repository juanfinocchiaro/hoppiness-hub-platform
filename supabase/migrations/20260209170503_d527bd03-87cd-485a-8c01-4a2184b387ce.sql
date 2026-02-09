
-- =============================================
-- ADD 3-LEVEL CONTROL SYSTEM TO INSUMOS
-- =============================================

-- Add nivel_control with default 'libre' for existing rows
ALTER TABLE public.insumos
  ADD COLUMN nivel_control VARCHAR(20) NOT NULL DEFAULT 'libre',
  ADD COLUMN especificacion JSONB,
  ADD COLUMN proveedor_obligatorio_id UUID REFERENCES public.proveedores(id),
  ADD COLUMN precio_maximo_sugerido NUMERIC(12,2),
  ADD COLUMN motivo_control TEXT;

-- Validation trigger (instead of CHECK constraint for portability)
CREATE OR REPLACE FUNCTION public.validate_insumo_nivel_control()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.nivel_control NOT IN ('obligatorio', 'semi_libre', 'libre') THEN
    RAISE EXCEPTION 'nivel_control must be obligatorio, semi_libre, or libre';
  END IF;

  -- Level 1: must have proveedor_obligatorio
  IF NEW.nivel_control = 'obligatorio' AND NEW.proveedor_obligatorio_id IS NULL THEN
    RAISE EXCEPTION 'Nivel obligatorio requiere proveedor_obligatorio_id';
  END IF;

  -- Level 3: should not have obligatory provider
  IF NEW.nivel_control = 'libre' AND NEW.proveedor_obligatorio_id IS NOT NULL THEN
    RAISE EXCEPTION 'Nivel libre no puede tener proveedor_obligatorio_id';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_insumo_nivel
  BEFORE INSERT OR UPDATE ON public.insumos
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_insumo_nivel_control();

-- Index
CREATE INDEX idx_insumos_nivel ON public.insumos(nivel_control) WHERE deleted_at IS NULL;
