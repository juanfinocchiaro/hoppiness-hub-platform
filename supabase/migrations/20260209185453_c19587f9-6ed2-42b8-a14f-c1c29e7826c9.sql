
-- Create placeholder insumos for canon invoice items
INSERT INTO public.insumos (id, nombre, unidad_base, categoria_pl, tipo_item, descripcion)
VALUES 
  ('00000000-0000-0000-0000-000000000011', 'Canon de Marca (4.5%)', 'servicio', 'publicidad_marca', 'insumo', 'Concepto automático para liquidación de canon'),
  ('00000000-0000-0000-0000-000000000012', 'Marketing de Marca (0.5%)', 'servicio', 'publicidad_marca', 'insumo', 'Concepto automático para liquidación de marketing')
ON CONFLICT (id) DO NOTHING;
