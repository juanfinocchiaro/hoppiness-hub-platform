-- ============================================
-- SISTEMA DE TURNOS OPERATIVOS
-- ============================================

-- Tabla: branch_shifts (configuración de turnos por sucursal)
CREATE TABLE IF NOT EXISTS public.branch_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(branch_id, name)
);

-- Tabla: branch_shift_settings (configuración general de turnos)
CREATE TABLE IF NOT EXISTS public.branch_shift_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE UNIQUE,
    extended_shift_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla: shift_closures (cierres de turno guardados)
CREATE TABLE IF NOT EXISTS public.shift_closures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    shift_id UUID REFERENCES public.branch_shifts(id) ON DELETE SET NULL,
    shift_name TEXT NOT NULL,
    
    -- Fecha y rango
    closure_date DATE NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    
    -- Resumen
    total_sales DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_orders INTEGER NOT NULL DEFAULT 0,
    average_ticket DECIMAL(12,2) DEFAULT 0,
    
    -- Desgloses (JSONB)
    sales_by_product JSONB DEFAULT '[]',
    sales_by_channel JSONB DEFAULT '{}',
    sales_by_payment JSONB DEFAULT '{}',
    
    -- Cajas del turno
    cash_registers_summary JSONB DEFAULT '[]',
    
    -- Personal
    staff_summary JSONB DEFAULT '[]',
    total_staff_hours DECIMAL(10,2) DEFAULT 0,
    
    -- Cancelaciones
    cancelled_orders INTEGER DEFAULT 0,
    cancelled_amount DECIMAL(12,2) DEFAULT 0,
    
    -- Notas
    notes TEXT[] DEFAULT '{}',
    
    -- Metadata
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(branch_id, shift_name, closure_date)
);

-- Tabla: shift_notes (notas del turno en tiempo real)
CREATE TABLE IF NOT EXISTS public.shift_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    shift_date DATE NOT NULL DEFAULT CURRENT_DATE,
    shift_name TEXT NOT NULL,
    note TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_branch_shifts_branch ON public.branch_shifts(branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_shifts_active ON public.branch_shifts(branch_id, is_active);
CREATE INDEX IF NOT EXISTS idx_shift_closures_branch_date ON public.shift_closures(branch_id, closure_date);
CREATE INDEX IF NOT EXISTS idx_shift_notes_branch_date ON public.shift_notes(branch_id, shift_date);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_branch_shifts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_branch_shifts_updated_at ON public.branch_shifts;
CREATE TRIGGER update_branch_shifts_updated_at
    BEFORE UPDATE ON public.branch_shifts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_branch_shifts_updated_at();

DROP TRIGGER IF EXISTS update_branch_shift_settings_updated_at ON public.branch_shift_settings;
CREATE TRIGGER update_branch_shift_settings_updated_at
    BEFORE UPDATE ON public.branch_shift_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_branch_shifts_updated_at();

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE public.branch_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_shift_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_notes ENABLE ROW LEVEL SECURITY;

-- branch_shifts policies
CREATE POLICY "Users can view shifts for their branches"
ON public.branch_shifts FOR SELECT TO authenticated
USING (
    branch_id IN (
        SELECT branch_id FROM public.user_roles 
        WHERE user_id = auth.uid() AND is_active = true
    )
    OR EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'coordinador')
        AND is_active = true
    )
);

CREATE POLICY "Managers can manage shifts"
ON public.branch_shifts FOR ALL TO authenticated
USING (
    branch_id IN (
        SELECT branch_id FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('franquiciado', 'encargado', 'admin', 'coordinador', 'socio')
        AND is_active = true
    )
)
WITH CHECK (
    branch_id IN (
        SELECT branch_id FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('franquiciado', 'encargado', 'admin', 'coordinador', 'socio')
        AND is_active = true
    )
);

-- branch_shift_settings policies
CREATE POLICY "Users can view shift settings for their branches"
ON public.branch_shift_settings FOR SELECT TO authenticated
USING (
    branch_id IN (
        SELECT branch_id FROM public.user_roles 
        WHERE user_id = auth.uid() AND is_active = true
    )
    OR EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'coordinador')
        AND is_active = true
    )
);

CREATE POLICY "Managers can manage shift settings"
ON public.branch_shift_settings FOR ALL TO authenticated
USING (
    branch_id IN (
        SELECT branch_id FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('franquiciado', 'encargado', 'admin', 'coordinador', 'socio')
        AND is_active = true
    )
)
WITH CHECK (
    branch_id IN (
        SELECT branch_id FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('franquiciado', 'encargado', 'admin', 'coordinador', 'socio')
        AND is_active = true
    )
);

-- shift_closures policies
CREATE POLICY "Users can view closures for their branches"
ON public.shift_closures FOR SELECT TO authenticated
USING (
    branch_id IN (
        SELECT branch_id FROM public.user_roles 
        WHERE user_id = auth.uid() AND is_active = true
    )
    OR EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'coordinador')
        AND is_active = true
    )
);

CREATE POLICY "Managers can create closures"
ON public.shift_closures FOR INSERT TO authenticated
WITH CHECK (
    branch_id IN (
        SELECT branch_id FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('franquiciado', 'encargado', 'admin', 'coordinador', 'socio', 'cajero', 'gerente')
        AND is_active = true
    )
);

CREATE POLICY "Managers can update closures"
ON public.shift_closures FOR UPDATE TO authenticated
USING (
    branch_id IN (
        SELECT branch_id FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('franquiciado', 'encargado', 'admin', 'coordinador', 'socio')
        AND is_active = true
    )
);

-- shift_notes policies
CREATE POLICY "Users can view notes for their branches"
ON public.shift_notes FOR SELECT TO authenticated
USING (
    branch_id IN (
        SELECT branch_id FROM public.user_roles 
        WHERE user_id = auth.uid() AND is_active = true
    )
);

CREATE POLICY "Staff can add notes"
ON public.shift_notes FOR INSERT TO authenticated
WITH CHECK (
    branch_id IN (
        SELECT branch_id FROM public.user_roles 
        WHERE user_id = auth.uid() AND is_active = true
    )
);

-- ============================================
-- INSERTAR TURNOS POR DEFECTO
-- ============================================

-- Insertar turnos Mañana y Noche para sucursales existentes
INSERT INTO public.branch_shifts (branch_id, name, start_time, end_time, sort_order)
SELECT id, 'Mañana', '12:00:00', '17:00:00', 1 
FROM public.branches b
WHERE NOT EXISTS (
    SELECT 1 FROM public.branch_shifts bs 
    WHERE bs.branch_id = b.id
)
ON CONFLICT DO NOTHING;

INSERT INTO public.branch_shifts (branch_id, name, start_time, end_time, sort_order)
SELECT id, 'Noche', '17:00:00', '00:00:00', 2 
FROM public.branches b
WHERE EXISTS (
    SELECT 1 FROM public.branch_shifts bs 
    WHERE bs.branch_id = b.id AND bs.name = 'Mañana'
) AND NOT EXISTS (
    SELECT 1 FROM public.branch_shifts bs 
    WHERE bs.branch_id = b.id AND bs.name = 'Noche'
)
ON CONFLICT DO NOTHING;

-- Insertar configuración por defecto
INSERT INTO public.branch_shift_settings (branch_id, extended_shift_enabled)
SELECT id, true FROM public.branches b
WHERE NOT EXISTS (
    SELECT 1 FROM public.branch_shift_settings bss 
    WHERE bss.branch_id = b.id
)
ON CONFLICT DO NOTHING;