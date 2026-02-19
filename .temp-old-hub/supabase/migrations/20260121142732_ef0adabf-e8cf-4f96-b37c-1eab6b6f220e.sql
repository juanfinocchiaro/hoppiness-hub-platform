-- Fix linter warnings: set immutable search_path and avoid overly-permissive RLS WITH CHECK(true)

-- 1) Set search_path for trigger function
ALTER FUNCTION public.update_branch_shifts_updated_at() SET search_path = public;

-- 2) Replace contact_messages insert policy with a non-trivial WITH CHECK
DROP POLICY IF EXISTS "Anyone can send contact message" ON public.contact_messages;

CREATE POLICY "Anyone can send contact message"
ON public.contact_messages
FOR INSERT
TO anon, authenticated
WITH CHECK (
  email IS NOT NULL
  AND phone IS NOT NULL
  AND name IS NOT NULL
  AND subject IS NOT NULL
);