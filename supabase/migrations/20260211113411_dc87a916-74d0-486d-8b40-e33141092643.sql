-- Add 'producto' to allowed_item_types for categories relevant to resale products
UPDATE rdo_categories SET allowed_item_types = array_append(allowed_item_types, 'producto')
WHERE code IN ('cmv_bebidas_sin_alcohol', 'cmv_bebidas_alcohol', 'packaging_producto', 'comida_personal', 'descartables_salon', 'descartables_delivery', 'descartables_cocina', 'insumos_clientes')
AND NOT ('producto' = ANY(allowed_item_types));