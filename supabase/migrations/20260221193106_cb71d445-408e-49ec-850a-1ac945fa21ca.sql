-- Add required/max_selections to optional groups
ALTER TABLE public.item_carta_grupo_opcional
ADD COLUMN es_obligatorio boolean NOT NULL DEFAULT false,
ADD COLUMN max_selecciones integer DEFAULT NULL;

-- Add removable flag to composition items
ALTER TABLE public.item_carta_composicion
ADD COLUMN es_removible boolean NOT NULL DEFAULT false;