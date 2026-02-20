-- Paso 1: Agregar tipo de impresión a categorías de carta
ALTER TABLE public.menu_categorias 
  ADD COLUMN IF NOT EXISTS tipo_impresion TEXT NOT NULL DEFAULT 'comanda';

-- Paso 1: Agregar destinos de impresión a print_config
ALTER TABLE public.print_config
  ADD COLUMN IF NOT EXISTS comanda_printer_id UUID REFERENCES public.branch_printers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS vale_printer_id UUID REFERENCES public.branch_printers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS salon_vales_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS no_salon_todo_en_comanda BOOLEAN NOT NULL DEFAULT true;

-- Paso 8: Agregar categoria_carta_id a pedido_items
ALTER TABLE public.pedido_items 
  ADD COLUMN IF NOT EXISTS categoria_carta_id UUID REFERENCES public.menu_categorias(id) ON DELETE SET NULL;