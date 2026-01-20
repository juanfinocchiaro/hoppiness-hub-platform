-- Crear ENUM para scope de permisos
CREATE TYPE public.permission_scope AS ENUM ('local', 'brand');

-- Agregar campo scope a permission_definitions
ALTER TABLE public.permission_definitions 
ADD COLUMN scope permission_scope NOT NULL DEFAULT 'local';

-- Categorizar permisos existentes según su scope
-- Permisos de MARCA (brand): usuarios globales, productos maestros, ingredientes maestros, reportes marca
UPDATE public.permission_definitions SET scope = 'brand' WHERE key IN (
  'users.create', 'users.delete', 'users.edit', 'users.view',
  'products.create', 'products.edit', 'products.delete', 'products.view',
  'modifiers.manage', 'modifiers.view',
  'ingredients.create', 'ingredients.edit', 'ingredients.delete', 'ingredients.view',
  'admin.branches_view',
  'reports.brand', 'reports.consolidated'
);

-- El resto permanece como 'local' (default)

-- Crear tabla de plantillas locales
CREATE TABLE public.local_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Crear tabla de permisos por plantilla local
CREATE TABLE public.local_template_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.local_templates(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(template_id, permission_key)
);

-- Crear tabla de plantillas de marca
CREATE TABLE public.brand_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Crear tabla de permisos por plantilla brand
CREATE TABLE public.brand_template_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.brand_templates(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(template_id, permission_key)
);

-- Agregar template_ids a user_panel_access
ALTER TABLE public.user_panel_access
ADD COLUMN local_template_id UUID REFERENCES public.local_templates(id) ON DELETE SET NULL,
ADD COLUMN brand_template_id UUID REFERENCES public.brand_templates(id) ON DELETE SET NULL;

-- Crear plantillas por defecto basadas en roles existentes

-- PLANTILLAS LOCALES
INSERT INTO public.local_templates (id, name, description) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Franquiciado', 'Gestión completa de sucursal'),
  ('22222222-2222-2222-2222-222222222222', 'Encargado', 'Operación diaria y gestión de staff'),
  ('33333333-3333-3333-3333-333333333333', 'Cajero', 'Operación básica: ventas y caja'),
  ('44444444-4444-4444-4444-444444444444', 'KDS', 'Solo visualización de cocina');

-- Migrar permisos de role_default_permissions a local_template_permissions
INSERT INTO public.local_template_permissions (template_id, permission_key)
SELECT 
  CASE rdp.role
    WHEN 'franquiciado' THEN '11111111-1111-1111-1111-111111111111'::uuid
    WHEN 'encargado' THEN '22222222-2222-2222-2222-222222222222'::uuid
    WHEN 'cajero' THEN '33333333-3333-3333-3333-333333333333'::uuid
    WHEN 'kds' THEN '44444444-4444-4444-4444-444444444444'::uuid
  END,
  rdp.permission_key
FROM public.role_default_permissions rdp
JOIN public.permission_definitions pd ON pd.key = rdp.permission_key
WHERE pd.scope = 'local'
AND rdp.role IN ('franquiciado', 'encargado', 'cajero', 'kds')
ON CONFLICT DO NOTHING;

-- PLANTILLAS BRAND
INSERT INTO public.brand_templates (id, name, description) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Coordinador Digital', 'Gestión de catálogo y usuarios'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Brandpartner', 'Vista de reportes y métricas');

-- Migrar permisos brand
INSERT INTO public.brand_template_permissions (template_id, permission_key)
SELECT 
  CASE rdp.role
    WHEN 'coordinador' THEN 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
    WHEN 'socio' THEN 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid
  END,
  rdp.permission_key
FROM public.role_default_permissions rdp
JOIN public.permission_definitions pd ON pd.key = rdp.permission_key
WHERE pd.scope = 'brand'
AND rdp.role IN ('coordinador', 'socio')
ON CONFLICT DO NOTHING;

-- RLS para las nuevas tablas
ALTER TABLE public.local_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.local_template_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_template_permissions ENABLE ROW LEVEL SECURITY;

-- Policies: solo admins pueden modificar, todos autenticados pueden leer
CREATE POLICY "Admins manage local_templates" ON public.local_templates
  FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated read local_templates" ON public.local_templates
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage local_template_permissions" ON public.local_template_permissions
  FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated read local_template_permissions" ON public.local_template_permissions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage brand_templates" ON public.brand_templates
  FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated read brand_templates" ON public.brand_templates
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage brand_template_permissions" ON public.brand_template_permissions
  FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated read brand_template_permissions" ON public.brand_template_permissions
  FOR SELECT TO authenticated USING (true);

-- Índices para performance
CREATE INDEX idx_permission_definitions_scope ON public.permission_definitions(scope);
CREATE INDEX idx_local_template_permissions_template ON public.local_template_permissions(template_id);
CREATE INDEX idx_brand_template_permissions_template ON public.brand_template_permissions(template_id);
CREATE INDEX idx_user_panel_access_templates ON public.user_panel_access(local_template_id, brand_template_id);