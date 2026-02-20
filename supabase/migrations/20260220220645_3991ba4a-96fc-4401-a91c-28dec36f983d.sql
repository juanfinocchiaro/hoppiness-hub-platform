
-- Allow brand roles (coordinador, informes, contador_marca) to read all profiles
CREATE POLICY "profiles_select_brand_roles"
ON public.profiles
FOR SELECT
USING (
  get_brand_role(auth.uid()) IN ('coordinador', 'informes', 'contador_marca')
);
