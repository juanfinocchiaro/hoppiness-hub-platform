
-- Table to store global sidebar section ordering (set by superadmin, visible to all)
CREATE TABLE public.brand_sidebar_order (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.brand_sidebar_order ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read (global order)
CREATE POLICY "Staff can read sidebar order"
ON public.brand_sidebar_order
FOR SELECT
TO authenticated
USING (is_staff(auth.uid()));

-- Only superadmins can modify
CREATE POLICY "Superadmins can insert sidebar order"
ON public.brand_sidebar_order
FOR INSERT
TO authenticated
WITH CHECK (is_superadmin(auth.uid()));

CREATE POLICY "Superadmins can update sidebar order"
ON public.brand_sidebar_order
FOR UPDATE
TO authenticated
USING (is_superadmin(auth.uid()));

CREATE POLICY "Superadmins can delete sidebar order"
ON public.brand_sidebar_order
FOR DELETE
TO authenticated
USING (is_superadmin(auth.uid()));

-- Seed default order
INSERT INTO public.brand_sidebar_order (section_id, sort_order) VALUES
  ('locales', 1),
  ('menu-eng', 2),
  ('gestion-red', 3),
  ('modelo-op', 4),
  ('finanzas', 5),
  ('admin', 6);
