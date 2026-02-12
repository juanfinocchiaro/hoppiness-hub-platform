
ALTER TABLE public.menu_categorias ADD COLUMN visible_en_carta BOOLEAN NOT NULL DEFAULT true;

UPDATE public.menu_categorias SET visible_en_carta = false WHERE nombre = 'EXTRAS/MODIFICADORES';
