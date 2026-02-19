-- Add scope, branch_id and category to suppliers table for local vs brand distinction
ALTER TABLE public.suppliers 
  ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT 'brand' CHECK (scope IN ('brand', 'local')),
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS category TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_suppliers_scope ON public.suppliers(scope);
CREATE INDEX IF NOT EXISTS idx_suppliers_branch ON public.suppliers(branch_id) WHERE branch_id IS NOT NULL;

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Branches can view brand suppliers and own local suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Branches can manage own local suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Authenticated users can view suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Admins can manage suppliers" ON public.suppliers;

-- Policy: Everyone can view brand suppliers and their own local suppliers
CREATE POLICY "View brand and own local suppliers"
ON public.suppliers FOR SELECT TO authenticated
USING (
  scope = 'brand' 
  OR (scope = 'local' AND branch_id IN (
    SELECT uba.branch_id FROM public.user_branch_access uba WHERE uba.user_id = auth.uid()
  ))
  OR public.is_admin(auth.uid())
);

-- Policy: Users can insert local suppliers for their branches
CREATE POLICY "Insert local suppliers for own branch"
ON public.suppliers FOR INSERT TO authenticated
WITH CHECK (
  (scope = 'local' AND branch_id IN (
    SELECT uba.branch_id FROM public.user_branch_access uba WHERE uba.user_id = auth.uid()
  ))
  OR public.is_admin(auth.uid())
);

-- Policy: Users can update local suppliers for their branches
CREATE POLICY "Update local suppliers for own branch"
ON public.suppliers FOR UPDATE TO authenticated
USING (
  (scope = 'local' AND branch_id IN (
    SELECT uba.branch_id FROM public.user_branch_access uba WHERE uba.user_id = auth.uid()
  ))
  OR public.is_admin(auth.uid())
);

-- Policy: Users can delete local suppliers for their branches
CREATE POLICY "Delete local suppliers for own branch"
ON public.suppliers FOR DELETE TO authenticated
USING (
  (scope = 'local' AND branch_id IN (
    SELECT uba.branch_id FROM public.user_branch_access uba WHERE uba.user_id = auth.uid()
  ))
  OR public.is_admin(auth.uid())
);