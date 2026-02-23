-- Add delivery-specific time windows (franjas horarias) per branch
-- Format: {"0": [{"opens":"12:00","closes":"15:00"},{"opens":"19:00","closes":"23:00"}], ...}
-- Keys = day of week (0=Sunday...6=Saturday). Null = use branch public_hours (backward compatible).

ALTER TABLE public.branch_delivery_config
  ADD COLUMN IF NOT EXISTS delivery_hours jsonb;

COMMENT ON COLUMN public.branch_delivery_config.delivery_hours IS
  'Per-day delivery schedule with multiple time windows (franjas). Null = use branch public_hours.';
