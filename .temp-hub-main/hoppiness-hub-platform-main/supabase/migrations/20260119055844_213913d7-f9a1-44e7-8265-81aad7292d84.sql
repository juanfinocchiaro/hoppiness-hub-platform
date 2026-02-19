-- Extend employees table with additional HR data
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS cbu text,
ADD COLUMN IF NOT EXISTS cuit text,
ADD COLUMN IF NOT EXISTS dni text,
ADD COLUMN IF NOT EXISTS photo_url text,
ADD COLUMN IF NOT EXISTS birth_date date,
ADD COLUMN IF NOT EXISTS hire_date date DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS emergency_contact text,
ADD COLUMN IF NOT EXISTS emergency_phone text;

-- Create storage bucket for employee documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('employee-documents', 'employee-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for employee documents
CREATE POLICY "Staff can view employee documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'employee-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Staff can upload employee documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'employee-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Staff can update employee documents"
ON storage.objects FOR UPDATE
USING (bucket_id = 'employee-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Staff can delete employee documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'employee-documents' AND auth.role() = 'authenticated');

-- Create employee documents table
CREATE TABLE IF NOT EXISTS public.employee_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  document_type text NOT NULL, -- 'reglamento_interno', 'reglamento_firmado', 'ficha_personal', 'dni_frente', 'dni_dorso', 'otros'
  file_url text NOT NULL,
  file_name text NOT NULL,
  uploaded_by uuid REFERENCES auth.users(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view employee documents"
ON public.employee_documents FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.employees e 
  WHERE e.id = employee_documents.employee_id 
  AND has_branch_access(auth.uid(), e.branch_id)
));

CREATE POLICY "Staff can manage employee documents"
ON public.employee_documents FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.employees e 
  WHERE e.id = employee_documents.employee_id 
  AND has_branch_permission(auth.uid(), e.branch_id, 'can_manage_staff')
));

-- Create employee warnings/apercibimientos table
CREATE TABLE IF NOT EXISTS public.employee_warnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  warning_type text NOT NULL, -- 'verbal', 'written', 'suspension', 'final_warning'
  reason text NOT NULL,
  description text,
  incident_date date NOT NULL DEFAULT CURRENT_DATE,
  document_url text, -- Signed warning document
  issued_by uuid REFERENCES auth.users(id),
  acknowledged_at timestamptz, -- When employee acknowledged
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_warnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view employee warnings"
ON public.employee_warnings FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.employees e 
  WHERE e.id = employee_warnings.employee_id 
  AND has_branch_access(auth.uid(), e.branch_id)
));

CREATE POLICY "Staff can manage employee warnings"
ON public.employee_warnings FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.employees e 
  WHERE e.id = employee_warnings.employee_id 
  AND has_branch_permission(auth.uid(), e.branch_id, 'can_manage_staff')
));