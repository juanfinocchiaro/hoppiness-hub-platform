-- Agregar campo para rango de inversión en formulario de franquicias
ALTER TABLE public.contact_messages 
ADD COLUMN IF NOT EXISTS investment_range TEXT;