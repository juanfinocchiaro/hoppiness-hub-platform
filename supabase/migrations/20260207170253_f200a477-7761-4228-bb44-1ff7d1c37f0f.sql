-- Corregir RLS para regulation_signatures
-- Eliminar políticas conflictivas/redundantes
DROP POLICY IF EXISTS "Branch managers can insert signatures" ON public.regulation_signatures;
DROP POLICY IF EXISTS "regulation_signatures_insert_validated" ON public.regulation_signatures;
DROP POLICY IF EXISTS "Branch managers can view branch signatures" ON public.regulation_signatures;
DROP POLICY IF EXISTS "Users can view their own signatures" ON public.regulation_signatures;
DROP POLICY IF EXISTS "regulation_signatures_select_v2" ON public.regulation_signatures;

-- Política SELECT unificada: empleados ven las suyas, HR de la sucursal ve todas del local
CREATE POLICY "regulation_signatures_select"
ON public.regulation_signatures FOR SELECT
USING (
  user_id = auth.uid()
  OR is_superadmin(auth.uid())
  OR is_hr_for_branch_v2(auth.uid(), branch_id)
);

-- Política INSERT: solo HR de la sucursal puede subir firmas (encargados y franquiciados)
CREATE POLICY "regulation_signatures_insert"
ON public.regulation_signatures FOR INSERT
WITH CHECK (
  is_superadmin(auth.uid())
  OR is_hr_for_branch_v2(auth.uid(), branch_id)
);

-- Política DELETE: solo superadmin puede eliminar firmas
CREATE POLICY "regulation_signatures_delete"
ON public.regulation_signatures FOR DELETE
USING (is_superadmin(auth.uid()));

-- Corregir RLS para meeting_agreements
-- El problema es que encargados de local no pueden agregar acuerdos en reuniones de red
DROP POLICY IF EXISTS "meeting_agreements_insert" ON public.meeting_agreements;
DROP POLICY IF EXISTS "meeting_agreements_select" ON public.meeting_agreements;
DROP POLICY IF EXISTS "meeting_agreements_delete" ON public.meeting_agreements;

-- Política SELECT: participantes, HR del local, o roles de marca pueden ver
CREATE POLICY "meeting_agreements_select"
ON public.meeting_agreements FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM meetings m
    WHERE m.id = meeting_agreements.meeting_id
    AND (
      is_superadmin(auth.uid())
      OR m.created_by = auth.uid()
      OR (m.branch_id IS NOT NULL AND is_hr_role(auth.uid(), m.branch_id))
      OR EXISTS (
        SELECT 1 FROM meeting_participants mp
        WHERE mp.meeting_id = m.id AND mp.user_id = auth.uid()
      )
    )
  )
);

-- Política INSERT: quien crea la reunión, superadmin, coordinador, o HR del local puede agregar acuerdos
CREATE POLICY "meeting_agreements_insert"
ON public.meeting_agreements FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM meetings m
    WHERE m.id = meeting_agreements.meeting_id
    AND (
      is_superadmin(auth.uid())
      OR m.created_by = auth.uid()
      OR get_brand_role(auth.uid()) = 'coordinador'::brand_role_type
      OR (m.branch_id IS NOT NULL AND is_hr_role(auth.uid(), m.branch_id))
    )
  )
);

-- Política DELETE: solo creador o superadmin
CREATE POLICY "meeting_agreements_delete"
ON public.meeting_agreements FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM meetings m
    WHERE m.id = meeting_agreements.meeting_id
    AND (m.created_by = auth.uid() OR is_superadmin(auth.uid()))
  )
);

-- Corregir RLS para meeting_agreement_assignees
DROP POLICY IF EXISTS "meeting_agreement_assignees_insert" ON public.meeting_agreement_assignees;
DROP POLICY IF EXISTS "meeting_agreement_assignees_select" ON public.meeting_agreement_assignees;
DROP POLICY IF EXISTS "meeting_agreement_assignees_delete" ON public.meeting_agreement_assignees;

-- SELECT: misma lógica que meeting_agreements
CREATE POLICY "meeting_agreement_assignees_select"
ON public.meeting_agreement_assignees FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM meeting_agreements ma
    JOIN meetings m ON m.id = ma.meeting_id
    WHERE ma.id = meeting_agreement_assignees.agreement_id
    AND (
      is_superadmin(auth.uid())
      OR m.created_by = auth.uid()
      OR (m.branch_id IS NOT NULL AND is_hr_role(auth.uid(), m.branch_id))
      OR EXISTS (
        SELECT 1 FROM meeting_participants mp
        WHERE mp.meeting_id = m.id AND mp.user_id = auth.uid()
      )
    )
  )
);

-- INSERT
CREATE POLICY "meeting_agreement_assignees_insert"
ON public.meeting_agreement_assignees FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM meeting_agreements ma
    JOIN meetings m ON m.id = ma.meeting_id
    WHERE ma.id = meeting_agreement_assignees.agreement_id
    AND (
      is_superadmin(auth.uid())
      OR m.created_by = auth.uid()
      OR get_brand_role(auth.uid()) = 'coordinador'::brand_role_type
      OR (m.branch_id IS NOT NULL AND is_hr_role(auth.uid(), m.branch_id))
    )
  )
);

-- DELETE
CREATE POLICY "meeting_agreement_assignees_delete"
ON public.meeting_agreement_assignees FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM meeting_agreements ma
    JOIN meetings m ON m.id = ma.meeting_id
    WHERE ma.id = meeting_agreement_assignees.agreement_id
    AND (m.created_by = auth.uid() OR is_superadmin(auth.uid()))
  )
);