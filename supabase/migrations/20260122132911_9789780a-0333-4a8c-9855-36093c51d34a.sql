
-- =====================================================
-- FIX: Remove remaining permissive INSERT policy
-- =====================================================

-- Drop the old permissive policy that still exists
DROP POLICY IF EXISTS "Anyone can insert contact messages" ON public.contact_messages;
