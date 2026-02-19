
-- =====================================================
-- KDS Profesional + Sistema de Impresión por Red
-- =====================================================

-- 1. branch_printers: Impresoras físicas por local
CREATE TABLE public.branch_printers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  connection_type TEXT NOT NULL DEFAULT 'network',
  ip_address TEXT,
  port INT NOT NULL DEFAULT 9100,
  paper_width INT NOT NULL DEFAULT 80,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.branch_printers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "branch_printers_select" ON public.branch_printers
  FOR SELECT USING (public.has_branch_access_v2(auth.uid(), branch_id));

CREATE POLICY "branch_printers_insert" ON public.branch_printers
  FOR INSERT WITH CHECK (public.is_hr_for_branch(auth.uid(), branch_id));

CREATE POLICY "branch_printers_update" ON public.branch_printers
  FOR UPDATE USING (public.is_hr_for_branch(auth.uid(), branch_id));

CREATE POLICY "branch_printers_delete" ON public.branch_printers
  FOR DELETE USING (public.is_hr_for_branch(auth.uid(), branch_id));

-- 2. kitchen_stations: Estaciones configurables por local
CREATE TABLE public.kitchen_stations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'flame',
  sort_order INT NOT NULL DEFAULT 0,
  kds_enabled BOOLEAN NOT NULL DEFAULT true,
  printer_id UUID REFERENCES public.branch_printers(id) ON DELETE SET NULL,
  print_on TEXT NOT NULL DEFAULT 'on_receive',
  print_copies INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.kitchen_stations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kitchen_stations_select" ON public.kitchen_stations
  FOR SELECT USING (public.has_branch_access_v2(auth.uid(), branch_id));

CREATE POLICY "kitchen_stations_insert" ON public.kitchen_stations
  FOR INSERT WITH CHECK (public.is_hr_for_branch(auth.uid(), branch_id));

CREATE POLICY "kitchen_stations_update" ON public.kitchen_stations
  FOR UPDATE USING (public.is_hr_for_branch(auth.uid(), branch_id));

CREATE POLICY "kitchen_stations_delete" ON public.kitchen_stations
  FOR DELETE USING (public.is_hr_for_branch(auth.uid(), branch_id));

-- 3. print_config: Configuración de salidas especiales
CREATE TABLE public.print_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE UNIQUE,
  ticket_printer_id UUID REFERENCES public.branch_printers(id) ON DELETE SET NULL,
  ticket_enabled BOOLEAN NOT NULL DEFAULT false,
  ticket_trigger TEXT NOT NULL DEFAULT 'on_payment',
  delivery_printer_id UUID REFERENCES public.branch_printers(id) ON DELETE SET NULL,
  delivery_enabled BOOLEAN NOT NULL DEFAULT false,
  backup_printer_id UUID REFERENCES public.branch_printers(id) ON DELETE SET NULL,
  backup_enabled BOOLEAN NOT NULL DEFAULT false,
  reprint_requires_pin BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.print_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "print_config_select" ON public.print_config
  FOR SELECT USING (public.has_branch_access_v2(auth.uid(), branch_id));

CREATE POLICY "print_config_insert" ON public.print_config
  FOR INSERT WITH CHECK (public.is_hr_for_branch(auth.uid(), branch_id));

CREATE POLICY "print_config_update" ON public.print_config
  FOR UPDATE USING (public.is_hr_for_branch(auth.uid(), branch_id));

-- 4. print_jobs: Cola de impresión
CREATE TABLE public.print_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  printer_id UUID NOT NULL REFERENCES public.branch_printers(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,
  pedido_id UUID REFERENCES public.pedidos(id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INT NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.print_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "print_jobs_select" ON public.print_jobs
  FOR SELECT USING (public.has_branch_access_v2(auth.uid(), branch_id));

CREATE POLICY "print_jobs_insert" ON public.print_jobs
  FOR INSERT WITH CHECK (public.has_branch_access_v2(auth.uid(), branch_id));

CREATE POLICY "print_jobs_update" ON public.print_jobs
  FOR UPDATE USING (public.has_branch_access_v2(auth.uid(), branch_id));

-- 5. ALTER items_carta: agregar kitchen_station_id
ALTER TABLE public.items_carta ADD COLUMN IF NOT EXISTS kitchen_station_id UUID REFERENCES public.kitchen_stations(id) ON DELETE SET NULL;

-- 6. ALTER pedidos: agregar tiempo_inicio_prep
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS tiempo_inicio_prep TIMESTAMPTZ;

-- 7. Realtime para print_jobs
ALTER PUBLICATION supabase_realtime ADD TABLE public.print_jobs;

-- 8. Índices
CREATE INDEX idx_branch_printers_branch ON public.branch_printers(branch_id);
CREATE INDEX idx_kitchen_stations_branch ON public.kitchen_stations(branch_id);
CREATE INDEX idx_print_jobs_branch_status ON public.print_jobs(branch_id, status);
CREATE INDEX idx_print_jobs_printer ON public.print_jobs(printer_id, status);
CREATE INDEX idx_items_carta_station ON public.items_carta(kitchen_station_id) WHERE kitchen_station_id IS NOT NULL;
