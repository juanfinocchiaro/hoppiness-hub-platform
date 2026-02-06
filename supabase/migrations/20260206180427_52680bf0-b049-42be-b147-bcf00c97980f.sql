-- Permitir que roles de marca lean todos los user_branch_roles
-- Necesario para funciones de supervisión de red (reuniones, reportes, etc.)
CREATE POLICY "ubr_brand_roles_read" ON public.user_branch_roles
  FOR SELECT TO authenticated
  USING (
    get_brand_role(auth.uid()) IN ('coordinador', 'informes', 'contador_marca')
  );