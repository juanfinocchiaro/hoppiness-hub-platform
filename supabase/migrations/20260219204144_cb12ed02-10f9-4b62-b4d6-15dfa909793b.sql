
-- Fix: make webapp_menu_items view use SECURITY INVOKER (default, but explicit)
DROP VIEW IF EXISTS public.webapp_menu_items;
CREATE VIEW public.webapp_menu_items WITH (security_invoker = true) AS
SELECT 
  ic.id,
  ic.nombre,
  ic.nombre_corto,
  ic.descripcion,
  ic.imagen_url,
  ic.precio_base,
  ic.categoria_carta_id,
  mc.nombre AS categoria_nombre,
  mc.orden AS categoria_orden,
  ic.orden,
  ic.disponible_delivery,
  ic.disponible_webapp,
  ic.tipo
FROM items_carta ic
LEFT JOIN menu_categorias mc ON mc.id = ic.categoria_carta_id
WHERE ic.activo = true 
  AND ic.deleted_at IS NULL
  AND ic.disponible_webapp = true
ORDER BY mc.orden, ic.orden;

-- Grant anon access to the view for public menu
GRANT SELECT ON public.webapp_menu_items TO anon;
GRANT SELECT ON public.webapp_config TO anon;
