-- Add shift configuration to branches table
-- Morning and overnight are optional, midday and night are always enabled

ALTER TABLE public.branches
ADD COLUMN IF NOT EXISTS shifts_morning_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS shifts_overnight_enabled boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.branches.shifts_morning_enabled IS 'Enable morning shift (Mañana) for sales entry';
COMMENT ON COLUMN public.branches.shifts_overnight_enabled IS 'Enable overnight shift (Trasnoche) for sales entry';

-- Update daily_sales shift type to allow 4 shifts
-- First, let's ensure the shift column can hold all values
-- The column is already text/varchar, so we just need to update the constraint if any

-- Add an index for shift lookups
CREATE INDEX IF NOT EXISTS idx_daily_sales_shift ON public.daily_sales(shift);

-- Ensure RLS policies exist for branch shift settings
CREATE POLICY "Users with branch access can view shift settings" ON public.branches
  FOR SELECT USING (
    is_active = true OR 
    public.has_branch_access_v2(auth.uid(), id)
  );

-- Allow branch managers to update shift settings
CREATE POLICY "Managers can update shift settings" ON public.branches
  FOR UPDATE USING (
    public.is_superadmin(auth.uid()) OR
    public.has_branch_access_v2(auth.uid(), id)
  )
  WITH CHECK (
    public.is_superadmin(auth.uid()) OR
    public.has_branch_access_v2(auth.uid(), id)
  );