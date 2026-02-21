-- RDO Costos: verificacion + backfill controlado
-- Ejecutar manualmente en Supabase SQL Editor

-- 1) Diagnostico global de costos en carta
SELECT
  COUNT(*) AS items_total,
  COUNT(*) FILTER (WHERE COALESCE(costo_total, 0) <= 0) AS items_sin_costo,
  ROUND(
    (COUNT(*) FILTER (WHERE COALESCE(costo_total, 0) <= 0)::numeric / NULLIF(COUNT(*), 0)::numeric) * 100,
    2
  ) AS pct_sin_costo
FROM public.items_carta
WHERE COALESCE(deleted_at, NULL) IS NULL;

-- 2) Top items vendidos sin costo (ultimo mes)
WITH ventas AS (
  SELECT
    pi.item_carta_id,
    COALESCE(pi.nombre, 'Sin nombre') AS producto,
    SUM(COALESCE(pi.cantidad, 0)) AS cantidad,
    SUM(COALESCE(pi.subtotal, 0)) AS ventas
  FROM public.pedidos p
  JOIN public.pedido_items pi ON pi.pedido_id = p.id
  LEFT JOIN public.items_carta ic ON ic.id = pi.item_carta_id
  WHERE p.estado IN ('entregado', 'listo')
    AND p.created_at::date >= (CURRENT_DATE - INTERVAL '30 days')::date
    AND COALESCE(ic.costo_total, 0) <= 0
  GROUP BY pi.item_carta_id, COALESCE(pi.nombre, 'Sin nombre')
)
SELECT *
FROM ventas
ORDER BY ventas DESC
LIMIT 25;

-- 3) Backfill sugerido desde costo de preparacion referenciada
-- (solo donde costo_total <= 0)
-- PREVIEW:
SELECT
  ic.id,
  ic.nombre,
  ic.costo_total AS costo_actual,
  p.costo_calculado AS costo_sugerido
FROM public.items_carta ic
JOIN public.preparaciones p ON p.id = ic.composicion_ref_preparacion_id
WHERE COALESCE(ic.costo_total, 0) <= 0
  AND COALESCE(p.costo_calculado, 0) > 0
ORDER BY p.costo_calculado DESC;

-- APPLY (descomentar para aplicar):
-- UPDATE public.items_carta ic
-- SET costo_total = p.costo_calculado
-- FROM public.preparaciones p
-- WHERE p.id = ic.composicion_ref_preparacion_id
--   AND COALESCE(ic.costo_total, 0) <= 0
--   AND COALESCE(p.costo_calculado, 0) > 0;

-- 4) Validacion final rapida
SELECT
  COUNT(*) FILTER (WHERE COALESCE(costo_total, 0) <= 0) AS items_sin_costo_restantes
FROM public.items_carta
WHERE COALESCE(deleted_at, NULL) IS NULL;
