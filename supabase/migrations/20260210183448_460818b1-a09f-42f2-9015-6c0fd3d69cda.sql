-- Tabla de condiciones comerciales por local
CREATE TABLE public.proveedor_condiciones_local (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proveedor_id UUID NOT NULL REFERENCES public.proveedores(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  permite_cuenta_corriente BOOLEAN NOT NULL DEFAULT false,
  dias_pago_habitual INTEGER,
  descuento_pago_contado DECIMAL(5,2),
  observaciones TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(proveedor_id, branch_id)
);

-- Índices
CREATE INDEX idx_pcl_branch ON public.proveedor_condiciones_local(branch_id);
CREATE INDEX idx_pcl_proveedor ON public.proveedor_condiciones_local(proveedor_id);

-- RLS
ALTER TABLE public.proveedor_condiciones_local ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_condiciones_local"
  ON public.proveedor_condiciones_local FOR SELECT
  USING (public.can_access_branch(auth.uid(), branch_id));

CREATE POLICY "insert_condiciones_local"
  ON public.proveedor_condiciones_local FOR INSERT
  WITH CHECK (public.is_hr_for_branch(auth.uid(), branch_id));

CREATE POLICY "update_condiciones_local"
  ON public.proveedor_condiciones_local FOR UPDATE
  USING (public.is_hr_for_branch(auth.uid(), branch_id));

CREATE POLICY "delete_condiciones_local"
  ON public.proveedor_condiciones_local FOR DELETE
  USING (public.is_hr_for_branch(auth.uid(), branch_id));

-- Trigger updated_at
CREATE TRIGGER update_proveedor_condiciones_local_updated_at
  BEFORE UPDATE ON public.proveedor_condiciones_local
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();