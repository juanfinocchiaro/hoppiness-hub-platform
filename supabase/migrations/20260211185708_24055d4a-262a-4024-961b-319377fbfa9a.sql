
-- Step 2: Recreate v_menu_costos with rdo_category_code and rdo_category_name
DROP VIEW IF EXISTS v_menu_costos;

CREATE VIEW v_menu_costos AS
SELECT 
  mp.id AS menu_producto_id,
  mp.nombre,
  mp.tipo,
  mp.categoria_id,
  mp.insumo_id,
  mp.rdo_category_code,
  mc.nombre AS categoria_nombre,
  rc.name AS rdo_category_name,
  mpr.precio_base,
  mpr.fc_objetivo,
  COALESCE(
    CASE 
      WHEN mp.tipo = 'terminado' AND mp.insumo_id IS NOT NULL THEN
        (SELECT i.costo_por_unidad_base FROM insumos i WHERE i.id = mp.insumo_id)
      WHEN mp.tipo = 'elaborado' THEN
        (SELECT SUM(ft.cantidad * i.costo_por_unidad_base * CASE WHEN ft.unidad IN ('kg','l') THEN 1000 ELSE 1 END)
         FROM menu_fichas_tecnicas ft JOIN insumos i ON i.id = ft.insumo_id WHERE ft.menu_producto_id = mp.id)
      ELSE 0
    END, 0
  ) AS costo_teorico,
  CASE 
    WHEN mpr.precio_base > 0 AND COALESCE(
      CASE WHEN mp.tipo = 'terminado' AND mp.insumo_id IS NOT NULL THEN (SELECT i.costo_por_unidad_base FROM insumos i WHERE i.id = mp.insumo_id)
           WHEN mp.tipo = 'elaborado' THEN (SELECT SUM(ft.cantidad * i.costo_por_unidad_base * CASE WHEN ft.unidad IN ('kg','l') THEN 1000 ELSE 1 END) FROM menu_fichas_tecnicas ft JOIN insumos i ON i.id = ft.insumo_id WHERE ft.menu_producto_id = mp.id)
           ELSE 0 END, 0) > 0 THEN
      ROUND((COALESCE(
        CASE WHEN mp.tipo = 'terminado' AND mp.insumo_id IS NOT NULL THEN (SELECT i.costo_por_unidad_base FROM insumos i WHERE i.id = mp.insumo_id)
             WHEN mp.tipo = 'elaborado' THEN (SELECT SUM(ft.cantidad * i.costo_por_unidad_base * CASE WHEN ft.unidad IN ('kg','l') THEN 1000 ELSE 1 END) FROM menu_fichas_tecnicas ft JOIN insumos i ON i.id = ft.insumo_id WHERE ft.menu_producto_id = mp.id)
             ELSE 0 END, 0
      ) / mpr.precio_base * 100)::numeric, 2)
    ELSE NULL
  END AS fc_actual,
  CASE 
    WHEN mpr.fc_objetivo > 0 AND COALESCE(
      CASE WHEN mp.tipo = 'terminado' AND mp.insumo_id IS NOT NULL THEN (SELECT i.costo_por_unidad_base FROM insumos i WHERE i.id = mp.insumo_id)
           WHEN mp.tipo = 'elaborado' THEN (SELECT SUM(ft.cantidad * i.costo_por_unidad_base * CASE WHEN ft.unidad IN ('kg','l') THEN 1000 ELSE 1 END) FROM menu_fichas_tecnicas ft JOIN insumos i ON i.id = ft.insumo_id WHERE ft.menu_producto_id = mp.id)
           ELSE 0 END, 0) > 0 THEN
      ROUND(COALESCE(
        CASE WHEN mp.tipo = 'terminado' AND mp.insumo_id IS NOT NULL THEN (SELECT i.costo_por_unidad_base FROM insumos i WHERE i.id = mp.insumo_id)
             WHEN mp.tipo = 'elaborado' THEN (SELECT SUM(ft.cantidad * i.costo_por_unidad_base * CASE WHEN ft.unidad IN ('kg','l') THEN 1000 ELSE 1 END) FROM menu_fichas_tecnicas ft JOIN insumos i ON i.id = ft.insumo_id WHERE ft.menu_producto_id = mp.id)
             ELSE 0 END, 0
      ) / (mpr.fc_objetivo / 100))
    ELSE NULL
  END AS precio_sugerido
FROM menu_productos mp
LEFT JOIN menu_categorias mc ON mc.id = mp.categoria_id
LEFT JOIN menu_precios mpr ON mpr.menu_producto_id = mp.id
LEFT JOIN rdo_categories rc ON rc.code = mp.rdo_category_code
WHERE mp.activo = true;
