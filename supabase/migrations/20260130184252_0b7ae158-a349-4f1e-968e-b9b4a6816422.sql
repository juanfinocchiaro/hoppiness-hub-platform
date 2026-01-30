-- Add role column to staff_invitations
ALTER TABLE public.staff_invitations 
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'empleado';

-- Add full_name column for convenience
ALTER TABLE public.staff_invitations 
ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Drop legacy SQL functions that reference deleted tables
DROP FUNCTION IF EXISTS public.assign_admin_to_owner() CASCADE;
DROP FUNCTION IF EXISTS public.can_use_brand_panel(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.can_use_local_panel(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.capture_product_snapshot() CASCADE;
DROP FUNCTION IF EXISTS public.get_allowed_suppliers_for_ingredient(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.has_brand_access(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.setup_new_branch() CASCADE;
DROP FUNCTION IF EXISTS public.update_brand_mandatory_products_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_daily_sales_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_ingredient_cost_timestamp() CASCADE;
DROP FUNCTION IF EXISTS public.update_nucleo_product_mappings_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_transactions_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.validate_supplier_for_ingredient(uuid, uuid) CASCADE;