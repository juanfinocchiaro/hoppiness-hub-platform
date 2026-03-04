
-- Phase 0: Drop dead/orphaned tables and legacy view
-- These tables have 0 rows and no active frontend references

-- Drop view first (depends on menu_productos and menu_precios)
DROP VIEW IF EXISTS public.v_menu_costos;

-- Drop orphaned tables (no frontend queries, no data)
DROP TABLE IF EXISTS public.webapp_customers;
DROP TABLE IF EXISTS public.menu_precios_historial;
DROP TABLE IF EXISTS public.menu_combos;

-- Drop legacy tables (code exists but unused, 0 rows)
DROP TABLE IF EXISTS public.menu_fichas_tecnicas;
DROP TABLE IF EXISTS public.menu_precios;
DROP TABLE IF EXISTS public.menu_productos;
DROP TABLE IF EXISTS public.devoluciones;
