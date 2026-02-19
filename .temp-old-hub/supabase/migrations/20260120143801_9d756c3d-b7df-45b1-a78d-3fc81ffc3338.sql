-- Fix security linter issues

-- 1) Ensure views use security_invoker=on (avoid SECURITY DEFINER behavior)
DO $$
BEGIN
  -- Some views were created with security_invoker=true; normalize to 'on'
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'v'
      AND c.relname = 'supplier_balances'
  ) THEN
    EXECUTE 'ALTER VIEW public.supplier_balances SET (security_invoker=on)';
  END IF;
END $$;

-- 2) Set immutable search_path for function(s) flagged by linter
CREATE OR REPLACE FUNCTION public.update_transactions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;