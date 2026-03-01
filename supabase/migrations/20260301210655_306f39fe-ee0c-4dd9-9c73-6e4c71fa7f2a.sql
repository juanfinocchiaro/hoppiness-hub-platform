-- Fix Security Definer View issues: set security_invoker=true on all remaining views

-- 1) v_menu_costos
ALTER VIEW public.v_menu_costos SET (security_invoker = true);

-- 2) rdo_multivista_ventas_base
ALTER VIEW public.rdo_multivista_ventas_base SET (security_invoker = true);

-- 3) rdo_multivista_items_base
ALTER VIEW public.rdo_multivista_items_base SET (security_invoker = true);

-- 4) cuenta_corriente_proveedores
ALTER VIEW public.cuenta_corriente_proveedores SET (security_invoker = true);