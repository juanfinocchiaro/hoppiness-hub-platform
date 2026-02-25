-- Allow local staff with branch access to insert missing availability rows
DROP POLICY IF EXISTS "branch_item_availability_insert" ON public.branch_item_availability;

CREATE POLICY "branch_item_availability_insert"
  ON public.branch_item_availability FOR INSERT
  WITH CHECK (
    is_superadmin(auth.uid())
    OR has_branch_access_v2(auth.uid(), branch_id)
  );

-- Auto-seed availability rows when new menu items are created
CREATE OR REPLACE FUNCTION public.seed_branch_item_availability_for_item()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.activo IS DISTINCT FROM true OR NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.branch_item_availability (branch_id, item_carta_id)
  SELECT b.id, NEW.id
  FROM public.branches b
  WHERE b.is_active = true
  ON CONFLICT (branch_id, item_carta_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_branch_item_availability_on_item_insert ON public.items_carta;
CREATE TRIGGER trg_seed_branch_item_availability_on_item_insert
AFTER INSERT ON public.items_carta
FOR EACH ROW
EXECUTE FUNCTION public.seed_branch_item_availability_for_item();

-- Auto-seed availability rows when a new branch is created
CREATE OR REPLACE FUNCTION public.seed_branch_item_availability_for_branch()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_active IS DISTINCT FROM true THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.branch_item_availability (branch_id, item_carta_id)
  SELECT NEW.id, i.id
  FROM public.items_carta i
  WHERE i.activo = true
    AND i.deleted_at IS NULL
  ON CONFLICT (branch_id, item_carta_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_branch_item_availability_on_branch_insert ON public.branches;
CREATE TRIGGER trg_seed_branch_item_availability_on_branch_insert
AFTER INSERT ON public.branches
FOR EACH ROW
EXECUTE FUNCTION public.seed_branch_item_availability_for_branch();

-- Backfill any missing combinations
INSERT INTO public.branch_item_availability (branch_id, item_carta_id)
SELECT b.id, i.id
FROM public.branches b
JOIN public.items_carta i
  ON i.activo = true
 AND i.deleted_at IS NULL
WHERE b.is_active = true
ON CONFLICT (branch_id, item_carta_id) DO NOTHING;
