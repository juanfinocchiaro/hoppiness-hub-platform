
-- Categories for preparations/recipes
CREATE TABLE public.categorias_preparacion (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  orden INT NOT NULL DEFAULT 0,
  activo BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.categorias_preparacion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view categorias_preparacion"
  ON public.categorias_preparacion FOR SELECT
  USING (is_staff());

CREATE POLICY "Superadmin can manage categorias_preparacion"
  ON public.categorias_preparacion FOR ALL
  USING (is_superadmin(auth.uid()));

-- Add category reference to preparaciones
ALTER TABLE public.preparaciones
  ADD COLUMN categoria_preparacion_id UUID REFERENCES public.categorias_preparacion(id) ON DELETE SET NULL;
