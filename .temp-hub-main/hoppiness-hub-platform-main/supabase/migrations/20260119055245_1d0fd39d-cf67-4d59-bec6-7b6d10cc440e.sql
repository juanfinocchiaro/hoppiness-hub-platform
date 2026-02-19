-- Add labor law enforcement toggle to branches (can be disabled by franchise owners)
ALTER TABLE public.branches 
ADD COLUMN IF NOT EXISTS enforce_labor_law boolean NOT NULL DEFAULT true;

-- Add comment explaining the column
COMMENT ON COLUMN public.branches.enforce_labor_law IS 'When true, enforces CCT 329/00 labor law rules in scheduling. Franchise owners can disable this.';