
-- Allow anonymous users to read active webapp menu items
CREATE POLICY "webapp_public_read_menu_items"
ON public.menu_items
FOR SELECT
TO anon
USING (is_active = true AND deleted_at IS NULL AND available_webapp = true);

-- Allow anonymous users to read option groups for menu items
CREATE POLICY "webapp_public_read_option_groups"
ON public.menu_item_option_groups
FOR SELECT
TO anon
USING (true);

-- Allow anonymous users to read option group items
CREATE POLICY "webapp_public_read_option_group_items"
ON public.menu_item_option_group_items
FOR SELECT
TO anon
USING (true);

-- Allow anonymous users to read extra assignments
CREATE POLICY "webapp_public_read_extra_assignments"
ON public.extra_assignments
FOR SELECT
TO anon
USING (true);

-- Allow anonymous users to read removable items
CREATE POLICY "webapp_public_read_removable_items"
ON public.removable_items
FOR SELECT
TO anon
USING (true);
