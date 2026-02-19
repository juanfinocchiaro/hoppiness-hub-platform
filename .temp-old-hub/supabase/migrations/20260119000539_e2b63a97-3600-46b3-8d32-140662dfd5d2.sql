-- Add missing columns to branches table for the new model
ALTER TABLE public.branches
ADD COLUMN IF NOT EXISTS slug text,
ADD COLUMN IF NOT EXISTS delivery_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS estimated_prep_time_min integer DEFAULT 20,
ADD COLUMN IF NOT EXISTS status_message text;

-- Generate slugs for existing branches
UPDATE public.branches 
SET slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL;

-- Add unique constraint on slug
ALTER TABLE public.branches
ADD CONSTRAINT branches_slug_unique UNIQUE (slug);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_branches_slug ON public.branches(slug);

-- Rename is_active to is_open for clarity (keeping is_active as alias via view or just using is_active as is_open equivalent)
-- Actually, let's keep is_active and add is_open as a separate operational field
ALTER TABLE public.branches
ADD COLUMN IF NOT EXISTS is_open boolean DEFAULT true;

-- Update RLS policy to allow encargados to update their branch config
CREATE POLICY "Encargados can update their branch config"
ON public.branches
FOR UPDATE
USING (
  has_branch_permission(auth.uid(), id, 'can_manage_staff'::text)
)
WITH CHECK (
  has_branch_permission(auth.uid(), id, 'can_manage_staff'::text)
);