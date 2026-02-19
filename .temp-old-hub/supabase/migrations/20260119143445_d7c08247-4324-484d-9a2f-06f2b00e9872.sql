-- Create KDS stations table
CREATE TABLE public.kds_stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  name text NOT NULL,
  station_type text NOT NULL CHECK (station_type IN ('armado', 'plancha', 'freidora', 'ensamblado', 'entrega')),
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  color text DEFAULT '#f97316',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create table for item station assignments (which products go to which station)
CREATE TABLE public.product_station_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  station_type text NOT NULL CHECK (station_type IN ('armado', 'plancha', 'freidora', 'ensamblado', 'entrega')),
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id, station_type)
);

-- Create table for order item station progress
CREATE TABLE public.order_item_stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id uuid NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  station_type text NOT NULL CHECK (station_type IN ('armado', 'plancha', 'freidora', 'ensamblado', 'entrega')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done')),
  started_at timestamptz,
  completed_at timestamptz,
  completed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(order_item_id, station_type)
);

-- Enable RLS
ALTER TABLE public.kds_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_station_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_item_stations ENABLE ROW LEVEL SECURITY;

-- Policies for kds_stations
CREATE POLICY "KDS stations are viewable by users with branch access"
ON public.kds_stations FOR SELECT
USING (public.has_branch_access(auth.uid(), branch_id));

CREATE POLICY "KDS stations are manageable by users with config permission"
ON public.kds_stations FOR ALL
USING (public.has_branch_permission(auth.uid(), branch_id, 'config.edit'));

-- Policies for product_station_assignments (global config, admin only)
CREATE POLICY "Station assignments are viewable by authenticated users"
ON public.product_station_assignments FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Station assignments are manageable by admins"
ON public.product_station_assignments FOR ALL
USING (public.is_admin(auth.uid()));

-- Policies for order_item_stations
CREATE POLICY "Order item stations are viewable by users with branch access"
ON public.order_item_stations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.order_items oi
    JOIN public.orders o ON oi.order_id = o.id
    WHERE oi.id = order_item_stations.order_item_id
    AND public.has_branch_access(auth.uid(), o.branch_id)
  )
);

CREATE POLICY "Order item stations are manageable by users with orders permission"
ON public.order_item_stations FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.order_items oi
    JOIN public.orders o ON oi.order_id = o.id
    WHERE oi.id = order_item_stations.order_item_id
    AND public.has_branch_permission(auth.uid(), o.branch_id, 'orders.manage')
  )
);

-- Enable realtime for order_item_stations
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_item_stations;

-- Create default stations for existing branches
INSERT INTO public.kds_stations (branch_id, name, station_type, display_order, color)
SELECT b.id, 'Armado', 'armado', 1, '#3b82f6'
FROM public.branches b WHERE b.is_active = true;

INSERT INTO public.kds_stations (branch_id, name, station_type, display_order, color)
SELECT b.id, 'Plancha', 'plancha', 2, '#f97316'
FROM public.branches b WHERE b.is_active = true;

INSERT INTO public.kds_stations (branch_id, name, station_type, display_order, color)
SELECT b.id, 'Freidora', 'freidora', 3, '#eab308'
FROM public.branches b WHERE b.is_active = true;

INSERT INTO public.kds_stations (branch_id, name, station_type, display_order, color)
SELECT b.id, 'Ensamblado', 'ensamblado', 4, '#22c55e'
FROM public.branches b WHERE b.is_active = true;

INSERT INTO public.kds_stations (branch_id, name, station_type, display_order, color)
SELECT b.id, 'Entrega', 'entrega', 5, '#a855f7'
FROM public.branches b WHERE b.is_active = true;