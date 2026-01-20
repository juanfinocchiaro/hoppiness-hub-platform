-- Add category_id column with FK to ingredient_categories
ALTER TABLE public.ingredients 
ADD COLUMN category_id UUID REFERENCES public.ingredient_categories(id);

-- Migrate existing data from text category to category_id
UPDATE public.ingredients i
SET category_id = ic.id
FROM public.ingredient_categories ic
WHERE i.category = ic.name;

-- Create index for performance
CREATE INDEX idx_ingredients_category_id ON public.ingredients(category_id);

-- Add comment documenting the migration
COMMENT ON COLUMN public.ingredients.category IS 'Deprecated: use category_id instead. Kept for backward compatibility.';
COMMENT ON COLUMN public.ingredients.category_id IS 'FK to ingredient_categories table - normalized category reference';