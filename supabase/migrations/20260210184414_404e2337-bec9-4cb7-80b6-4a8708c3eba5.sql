INSERT INTO public.rdo_categories (code, name, parent_code, level, rdo_section, behavior, sort_order, allowed_item_types, is_active)
VALUES ('packaging_producto', 'Packaging de Producto', 'cmv', 3, 'costos_variables', 'variable', 113, ARRAY['insumo'], true);

-- Reorder existing categories after the new one
UPDATE public.rdo_categories SET sort_order = 114 WHERE code = 'descartables_salon';
UPDATE public.rdo_categories SET sort_order = 115 WHERE code = 'descartables_delivery';
UPDATE public.rdo_categories SET sort_order = 116 WHERE code = 'insumos_clientes';