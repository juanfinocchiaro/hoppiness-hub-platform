-- Add 'proveedor' to contact_messages subject CHECK constraint
-- The frontend sends subject='proveedor' from ProveedoresModal and Contacto page,
-- but the original constraint only allowed: consulta, franquicia, empleo, pedidos, otro

ALTER TABLE public.contact_messages
  DROP CONSTRAINT IF EXISTS contact_messages_subject_check;

ALTER TABLE public.contact_messages
  ADD CONSTRAINT contact_messages_subject_check
  CHECK (subject IN ('consulta', 'franquicia', 'empleo', 'pedidos', 'proveedor', 'otro'));
