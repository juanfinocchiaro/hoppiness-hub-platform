-- Crear tabla para configuración de marca
CREATE TABLE IF NOT EXISTS public.brand_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL DEFAULT 'Hoppiness Club',
    slogan TEXT,
    email TEXT,
    phone TEXT,
    logo_url TEXT,
    instagram TEXT,
    facebook TEXT,
    tiktok TEXT,
    twitter TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Insertar registro único de marca
INSERT INTO public.brand_settings (id, name, slogan) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Hoppiness Club', 'Culto al sabor')
ON CONFLICT (id) DO NOTHING;

-- Habilitar RLS
ALTER TABLE public.brand_settings ENABLE ROW LEVEL SECURITY;

-- Cualquier usuario autenticado puede leer
CREATE POLICY "Anyone can read brand settings"
ON public.brand_settings FOR SELECT TO authenticated USING (true);

-- Solo admins pueden actualizar
CREATE POLICY "Admins can update brand settings"
ON public.brand_settings FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()));

-- Trigger para updated_at
CREATE TRIGGER update_brand_settings_updated_at
    BEFORE UPDATE ON public.brand_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();