-- Ensure remaining public views are SECURITY INVOKER (so RLS applies to querying user)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'v'
      AND c.relname = 'user_effective_permissions'
  ) THEN
    EXECUTE 'ALTER VIEW public.user_effective_permissions SET (security_invoker=on)';
  END IF;
END $$;