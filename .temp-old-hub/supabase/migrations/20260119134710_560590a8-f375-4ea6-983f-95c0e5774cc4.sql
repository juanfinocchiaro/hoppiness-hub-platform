
-- =====================================================
-- Sistema de Invitaciones para Colaboradores
-- =====================================================

-- 1. Tabla de invitaciones pendientes
CREATE TABLE public.staff_invitations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    role app_role NOT NULL DEFAULT 'cajero',
    invited_by UUID NOT NULL,
    token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
    accepted_at TIMESTAMP WITH TIME ZONE,
    accepted_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para búsquedas frecuentes
CREATE INDEX idx_staff_invitations_email ON public.staff_invitations(email);
CREATE INDEX idx_staff_invitations_token ON public.staff_invitations(token);
CREATE INDEX idx_staff_invitations_branch ON public.staff_invitations(branch_id);
CREATE INDEX idx_staff_invitations_status ON public.staff_invitations(status);

-- RLS
ALTER TABLE public.staff_invitations ENABLE ROW LEVEL SECURITY;

-- Admin puede ver todas
CREATE POLICY "Admins can manage all invitations"
ON public.staff_invitations FOR ALL
USING (public.is_admin(auth.uid()));

-- Franquiciado/Encargado puede ver/crear de su sucursal
CREATE POLICY "Branch managers can view their invitations"
ON public.staff_invitations FOR SELECT
USING (
    public.has_branch_permission(branch_id, 'hr.employees_manage', auth.uid())
);

CREATE POLICY "Branch managers can create invitations"
ON public.staff_invitations FOR INSERT
WITH CHECK (
    public.has_branch_permission(branch_id, 'hr.employees_manage', auth.uid())
);

-- Cualquiera puede verificar una invitación por token (para registro)
CREATE POLICY "Anyone can read invitation by token"
ON public.staff_invitations FOR SELECT
USING (true);

-- 2. Agregar permiso de gestión de empleados
INSERT INTO public.permission_definitions (key, name, module, description, min_role) VALUES
    ('hr.employees_manage', 'Gestionar empleados', 'hr', 'Invitar y gestionar colaboradores', 'encargado')
ON CONFLICT (key) DO NOTHING;

-- 3. Bucket para documentos de identidad (DNI frente/dorso)
INSERT INTO storage.buckets (id, name, public)
VALUES ('staff-documents', 'staff-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage para documentos de staff
CREATE POLICY "Users can upload their own documents"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'staff-documents' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own documents"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'staff-documents' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all staff documents"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'staff-documents'
    AND public.is_admin(auth.uid())
);

CREATE POLICY "Branch managers can view staff documents"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'staff-documents'
    AND EXISTS (
        SELECT 1 FROM public.branch_permissions bp
        WHERE bp.user_id = auth.uid()
        AND bp.can_manage_staff = true
    )
);

-- 4. Agregar campos faltantes a employee_private_details
ALTER TABLE public.employee_private_details 
ADD COLUMN IF NOT EXISTS dni_front_url TEXT,
ADD COLUMN IF NOT EXISTS dni_back_url TEXT,
ADD COLUMN IF NOT EXISTS accepted_terms_at TIMESTAMP WITH TIME ZONE;

-- 5. Agregar campos faltantes a profiles para staff
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS dni TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS cuit TEXT,
ADD COLUMN IF NOT EXISTS cbu TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT,
ADD COLUMN IF NOT EXISTS dni_front_url TEXT,
ADD COLUMN IF NOT EXISTS dni_back_url TEXT,
ADD COLUMN IF NOT EXISTS accepted_terms_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS invitation_token TEXT;
