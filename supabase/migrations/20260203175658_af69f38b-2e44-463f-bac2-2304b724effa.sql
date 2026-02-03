
-- Agregar security_invoker a branches_public para consistencia
ALTER VIEW branches_public SET (security_invoker = true);
