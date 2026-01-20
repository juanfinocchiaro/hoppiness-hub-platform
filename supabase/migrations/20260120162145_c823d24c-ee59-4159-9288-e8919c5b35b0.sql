
-- Fix: Update trigger function to work with profiles structure (id is PK, user_id is FK to auth.users)
CREATE OR REPLACE FUNCTION public.sync_customer_to_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- When a customer gets linked to a user_id, update their profile phone if missing
  IF NEW.user_id IS NOT NULL THEN
    UPDATE public.profiles
    SET phone = COALESCE(profiles.phone, NEW.phone),
        updated_at = now()
    WHERE user_id = NEW.user_id
      AND profiles.phone IS NULL
      AND NEW.phone IS NOT NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update profiles with phone from already-linked customers
UPDATE public.profiles p
SET 
  phone = c.phone,
  updated_at = now()
FROM public.customers c
WHERE c.user_id = p.user_id
  AND c.phone IS NOT NULL
  AND p.phone IS NULL;
