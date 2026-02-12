
-- 1. Add precio_extra to preparaciones
ALTER TABLE preparaciones
  ADD COLUMN IF NOT EXISTS precio_extra numeric DEFAULT NULL;

COMMENT ON COLUMN preparaciones.precio_extra IS
  'Precio que se cobra al cliente por agregar esta receta como extra. NULL = no disponible como extra.';

-- 2. Add precio_extra to insumos
ALTER TABLE insumos
  ADD COLUMN IF NOT EXISTS precio_extra numeric DEFAULT NULL;

COMMENT ON COLUMN insumos.precio_extra IS
  'Precio que se cobra al cliente por agregar este insumo como extra. NULL = no disponible como extra.';

-- 3. Add es_removible and es_extra to item_carta_composicion
ALTER TABLE item_carta_composicion
  ADD COLUMN IF NOT EXISTS es_removible boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS es_extra boolean DEFAULT false;

COMMENT ON COLUMN item_carta_composicion.es_removible IS
  'Si true, el cliente puede pedir este componente SIN (sin descuento).';
COMMENT ON COLUMN item_carta_composicion.es_extra IS
  'Si true, el cliente puede pedir una porción adicional de este componente (con cargo).';
