ALTER TABLE insumos DROP CONSTRAINT insumos_tipo_item_check;
ALTER TABLE insumos ADD CONSTRAINT insumos_tipo_item_check CHECK (tipo_item IN ('ingrediente', 'insumo', 'producto'));