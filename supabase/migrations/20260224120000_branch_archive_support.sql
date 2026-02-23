-- Support archiving branches (soft delete).
-- Archived branches are excluded from the public view and selectors
-- but their historical data (orders, RDO, etc.) remains accessible.

-- The branches_public view already filters to ('active','coming_soon'),
-- so 'archived' branches are automatically excluded. No view change needed.

-- Add a comment to document the allowed public_status values:
COMMENT ON COLUMN public.branches.public_status IS
  'Branch visibility status: active, coming_soon, hidden, archived';
