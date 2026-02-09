
-- Fix Security Definer Views → cambiar a SECURITY INVOKER
ALTER VIEW precio_promedio_mes SET (security_invoker = on);
ALTER VIEW cuenta_corriente_proveedores SET (security_invoker = on);
ALTER VIEW balance_socios SET (security_invoker = on);
