
-- Tabla de plantillas de WhatsApp
CREATE TABLE public.whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type TEXT NOT NULL UNIQUE,
  template_text TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmin and coordinador can read templates"
ON public.whatsapp_templates FOR SELECT
TO authenticated
USING (
  is_superadmin(auth.uid())
  OR get_brand_role(auth.uid()) = 'coordinador'
);

CREATE POLICY "Superadmin and coordinador can update templates"
ON public.whatsapp_templates FOR UPDATE
TO authenticated
USING (
  is_superadmin(auth.uid())
  OR get_brand_role(auth.uid()) = 'coordinador'
)
WITH CHECK (
  is_superadmin(auth.uid())
  OR get_brand_role(auth.uid()) = 'coordinador'
);

-- Trigger updated_at
CREATE TRIGGER update_whatsapp_templates_updated_at
BEFORE UPDATE ON public.whatsapp_templates
FOR EACH ROW EXECUTE FUNCTION update_user_roles_v2_updated_at();

-- Datos iniciales
INSERT INTO public.whatsapp_templates (subject_type, template_text) VALUES
('franquicia', E'Hola [NOMBRE]! Juan Finocchiaro por este lado, dueño de Hoppiness Club 🍔\n\nRecibí tu formulario, gracias por escribirnos.\n\nTe cuento rápido: nosotros no somos la típica franquicia que pone todo a la venta. Tenemos un sistema de expansión controlado, vamos habilitando zonas según lo que vamos viendo. Hoy tenemos dos locales disponibles: uno en recta Martinoli y otro en un shopping.\n\nPara poder orientarte bien, te hago tres preguntas rápidas:\n\n1. ¿Tenés el capital disponible hoy o estás evaluando para más adelante?\n\n2. ¿En qué rubro estás hoy?\n\n3. ¿Estás evaluando solo Hoppiness o también otras franquicias?\n\nCon eso te armo la info a medida. Que tengas buen día!'),
('empleo', E'Hola [NOMBRE]! Gracias por postularte en Hoppiness Club. Recibimos tu CV y lo estamos revisando. Te contactamos pronto!'),
('proveedor', E'Hola [NOMBRE]! Gracias por contactarnos como proveedor. Recibimos tu información y la estamos evaluando.'),
('pedidos', E'Hola [NOMBRE]! Recibimos tu consulta sobre tu pedido. Danos un momento para revisarlo.'),
('consulta', E'Hola [NOMBRE]! Gracias por escribirnos. Recibimos tu mensaje y te respondemos a la brevedad.'),
('otro', E'Hola [NOMBRE]! Gracias por contactar a Hoppiness Club. Recibimos tu mensaje.');
