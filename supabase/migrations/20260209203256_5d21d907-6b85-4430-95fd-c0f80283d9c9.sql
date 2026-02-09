CREATE POLICY "pagos_prov_update"
ON public.pagos_proveedores
FOR UPDATE
USING (is_financial_for_branch(auth.uid(), branch_id))
WITH CHECK (is_financial_for_branch(auth.uid(), branch_id));