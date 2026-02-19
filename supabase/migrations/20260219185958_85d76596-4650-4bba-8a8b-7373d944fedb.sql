
-- Agregar campos para el asistente de certificados ARCA
ALTER TABLE public.afip_config 
  ADD COLUMN IF NOT EXISTS estado_certificado text NOT NULL DEFAULT 'sin_configurar',
  ADD COLUMN IF NOT EXISTS csr_pem text;

-- Trigger de validación para estado_certificado
CREATE OR REPLACE FUNCTION public.validate_estado_certificado()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.estado_certificado NOT IN ('sin_configurar', 'csr_generado', 'certificado_subido', 'conectado', 'error') THEN
    RAISE EXCEPTION 'estado_certificado inválido: %', NEW.estado_certificado;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_estado_certificado
  BEFORE INSERT OR UPDATE ON public.afip_config
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_estado_certificado();
