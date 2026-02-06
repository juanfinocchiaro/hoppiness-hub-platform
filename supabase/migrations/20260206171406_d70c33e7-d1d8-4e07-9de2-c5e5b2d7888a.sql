-- =============================================
-- MÓDULO DE REUNIONES - Tablas y RLS
-- =============================================

-- Tabla principal de reuniones
CREATE TABLE public.meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  area TEXT NOT NULL DEFAULT 'general',
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'closed',
  notes TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Tabla de participantes de reunión
CREATE TABLE public.meeting_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  attended BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(meeting_id, user_id)
);

-- Tabla de acuerdos de reunión
CREATE TABLE public.meeting_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de asignados a acuerdos
CREATE TABLE public.meeting_agreement_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id UUID NOT NULL REFERENCES public.meeting_agreements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  UNIQUE(agreement_id, user_id)
);

-- Índices para performance
CREATE INDEX idx_meetings_branch_id ON public.meetings(branch_id);
CREATE INDEX idx_meetings_date ON public.meetings(date DESC);
CREATE INDEX idx_meeting_participants_meeting_id ON public.meeting_participants(meeting_id);
CREATE INDEX idx_meeting_participants_user_id ON public.meeting_participants(user_id);
CREATE INDEX idx_meeting_agreements_meeting_id ON public.meeting_agreements(meeting_id);

-- =============================================
-- RLS POLICIES
-- =============================================

-- Habilitar RLS
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_agreement_assignees ENABLE ROW LEVEL SECURITY;

-- MEETINGS POLICIES

-- Participantes y encargados pueden ver reuniones de su local
CREATE POLICY "meetings_select" ON public.meetings
  FOR SELECT USING (
    is_superadmin(auth.uid()) 
    OR is_hr_role(auth.uid(), branch_id)
    OR EXISTS (
      SELECT 1 FROM public.meeting_participants mp 
      WHERE mp.meeting_id = meetings.id AND mp.user_id = auth.uid()
    )
  );

-- Solo encargados pueden crear reuniones
CREATE POLICY "meetings_insert" ON public.meetings
  FOR INSERT WITH CHECK (
    is_hr_role(auth.uid(), branch_id)
  );

-- Solo el creador puede actualizar
CREATE POLICY "meetings_update" ON public.meetings
  FOR UPDATE USING (
    created_by = auth.uid() OR is_superadmin(auth.uid())
  );

-- Solo el creador puede eliminar
CREATE POLICY "meetings_delete" ON public.meetings
  FOR DELETE USING (
    created_by = auth.uid() OR is_superadmin(auth.uid())
  );

-- MEETING_PARTICIPANTS POLICIES

-- Participante propio + encargados pueden ver
CREATE POLICY "meeting_participants_select" ON public.meeting_participants
  FOR SELECT USING (
    user_id = auth.uid()
    OR is_superadmin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.meetings m 
      WHERE m.id = meeting_participants.meeting_id 
      AND is_hr_role(auth.uid(), m.branch_id)
    )
  );

-- Solo encargados pueden insertar
CREATE POLICY "meeting_participants_insert" ON public.meeting_participants
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meetings m 
      WHERE m.id = meeting_participants.meeting_id 
      AND is_hr_role(auth.uid(), m.branch_id)
    )
  );

-- Usuario propio puede actualizar read_at, encargados pueden actualizar todo
CREATE POLICY "meeting_participants_update" ON public.meeting_participants
  FOR UPDATE USING (
    user_id = auth.uid()
    OR is_superadmin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.meetings m 
      WHERE m.id = meeting_participants.meeting_id 
      AND is_hr_role(auth.uid(), m.branch_id)
    )
  );

-- MEETING_AGREEMENTS POLICIES

-- Misma visibilidad que meetings
CREATE POLICY "meeting_agreements_select" ON public.meeting_agreements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.meetings m 
      WHERE m.id = meeting_agreements.meeting_id 
      AND (
        is_superadmin(auth.uid())
        OR is_hr_role(auth.uid(), m.branch_id)
        OR EXISTS (
          SELECT 1 FROM public.meeting_participants mp 
          WHERE mp.meeting_id = m.id AND mp.user_id = auth.uid()
        )
      )
    )
  );

-- Solo encargados pueden insertar
CREATE POLICY "meeting_agreements_insert" ON public.meeting_agreements
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meetings m 
      WHERE m.id = meeting_agreements.meeting_id 
      AND is_hr_role(auth.uid(), m.branch_id)
    )
  );

-- Solo el creador de la reunión puede eliminar acuerdos
CREATE POLICY "meeting_agreements_delete" ON public.meeting_agreements
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.meetings m 
      WHERE m.id = meeting_agreements.meeting_id 
      AND (m.created_by = auth.uid() OR is_superadmin(auth.uid()))
    )
  );

-- MEETING_AGREEMENT_ASSIGNEES POLICIES

-- Misma visibilidad que agreements
CREATE POLICY "meeting_agreement_assignees_select" ON public.meeting_agreement_assignees
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.meeting_agreements ma
      JOIN public.meetings m ON m.id = ma.meeting_id
      WHERE ma.id = meeting_agreement_assignees.agreement_id 
      AND (
        is_superadmin(auth.uid())
        OR is_hr_role(auth.uid(), m.branch_id)
        OR EXISTS (
          SELECT 1 FROM public.meeting_participants mp 
          WHERE mp.meeting_id = m.id AND mp.user_id = auth.uid()
        )
      )
    )
  );

-- Solo encargados pueden insertar
CREATE POLICY "meeting_agreement_assignees_insert" ON public.meeting_agreement_assignees
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meeting_agreements ma
      JOIN public.meetings m ON m.id = ma.meeting_id
      WHERE ma.id = meeting_agreement_assignees.agreement_id 
      AND is_hr_role(auth.uid(), m.branch_id)
    )
  );

-- Solo el creador de la reunión puede eliminar asignados
CREATE POLICY "meeting_agreement_assignees_delete" ON public.meeting_agreement_assignees
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.meeting_agreements ma
      JOIN public.meetings m ON m.id = ma.meeting_id
      WHERE ma.id = meeting_agreement_assignees.agreement_id 
      AND (m.created_by = auth.uid() OR is_superadmin(auth.uid()))
    )
  );