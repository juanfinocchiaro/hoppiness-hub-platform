-- Allow admins and managers to delete cash register movements
CREATE POLICY "Admins and managers can delete movements"
ON public.cash_register_movements
FOR DELETE
USING (
  is_admin(auth.uid()) OR 
  has_role(auth.uid(), 'gerente'::app_role)
);