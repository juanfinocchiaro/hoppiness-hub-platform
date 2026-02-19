-- Tabla para horarios de atención por sucursal y tipo de servicio
CREATE TABLE public.branch_schedules (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    service_type TEXT NOT NULL CHECK (service_type IN ('dine_in', 'delivery', 'takeaway')),
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Domingo, 6=Sábado
    opens_at TIME NOT NULL DEFAULT '09:00:00',
    closes_at TIME NOT NULL DEFAULT '23:00:00',
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (branch_id, service_type, day_of_week)
);

-- Índices
CREATE INDEX idx_branch_schedules_branch ON public.branch_schedules(branch_id);
CREATE INDEX idx_branch_schedules_lookup ON public.branch_schedules(branch_id, service_type, day_of_week);

-- Enable RLS
ALTER TABLE public.branch_schedules ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Anyone can view branch schedules"
ON public.branch_schedules
FOR SELECT
USING (true);

CREATE POLICY "Staff with permission can manage schedules"
ON public.branch_schedules
FOR ALL
USING (has_branch_permission(auth.uid(), branch_id, 'can_manage_staff'))
WITH CHECK (has_branch_permission(auth.uid(), branch_id, 'can_manage_staff'));

-- Trigger para updated_at
CREATE TRIGGER update_branch_schedules_updated_at
BEFORE UPDATE ON public.branch_schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Función para inicializar horarios por defecto al crear una sucursal
CREATE OR REPLACE FUNCTION public.setup_default_schedules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Crear horarios por defecto para cada servicio y día
    INSERT INTO public.branch_schedules (branch_id, service_type, day_of_week, opens_at, closes_at, is_enabled)
    SELECT 
        NEW.id,
        service.type,
        day.num,
        '09:00:00'::time,
        '23:00:00'::time,
        true
    FROM 
        (VALUES ('dine_in'), ('delivery'), ('takeaway')) AS service(type),
        (VALUES (0), (1), (2), (3), (4), (5), (6)) AS day(num);
    
    RETURN NEW;
END;
$$;

-- Trigger para crear horarios al crear sucursal
CREATE TRIGGER setup_branch_schedules
AFTER INSERT ON public.branches
FOR EACH ROW
EXECUTE FUNCTION public.setup_default_schedules();

-- Inicializar horarios para sucursales existentes
INSERT INTO public.branch_schedules (branch_id, service_type, day_of_week, opens_at, closes_at, is_enabled)
SELECT 
    b.id,
    service.type,
    day.num,
    COALESCE(b.opening_time, '09:00:00'::time),
    COALESCE(b.closing_time, '23:00:00'::time),
    true
FROM 
    public.branches b,
    (VALUES ('dine_in'), ('delivery'), ('takeaway')) AS service(type),
    (VALUES (0), (1), (2), (3), (4), (5), (6)) AS day(num)
ON CONFLICT (branch_id, service_type, day_of_week) DO NOTHING;