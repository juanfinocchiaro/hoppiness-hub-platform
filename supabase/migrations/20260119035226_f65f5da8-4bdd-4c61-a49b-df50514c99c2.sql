-- Tabla para configuración de impresoras por sucursal
CREATE TABLE public.printers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'browser', -- 'browser', 'escpos_network', 'cloud'
    purpose TEXT NOT NULL DEFAULT 'ticket', -- 'ticket', 'kitchen', 'bar', 'receipt'
    ip_address TEXT, -- Para impresoras de red
    port INTEGER DEFAULT 9100, -- Puerto ESC/POS estándar
    paper_width INTEGER DEFAULT 80, -- 58mm o 80mm
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_default BOOLEAN NOT NULL DEFAULT false,
    print_copies INTEGER DEFAULT 1,
    auto_cut BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_printers_branch ON public.printers(branch_id);

-- Enable RLS
ALTER TABLE public.printers ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Staff can view branch printers"
ON public.printers
FOR SELECT
USING (has_branch_access(auth.uid(), branch_id));

CREATE POLICY "Staff with permission can manage printers"
ON public.printers
FOR ALL
USING (has_branch_permission(auth.uid(), branch_id, 'can_manage_staff'))
WITH CHECK (has_branch_permission(auth.uid(), branch_id, 'can_manage_staff'));

-- Trigger para updated_at
CREATE TRIGGER update_printers_updated_at
BEFORE UPDATE ON public.printers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();