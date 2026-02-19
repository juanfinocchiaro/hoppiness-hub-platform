-- Crear enum para canales de venta
CREATE TYPE public.sales_channel AS ENUM (
  'atencion_presencial',
  'whatsapp',
  'mas_delivery',
  'pedidos_ya',
  'rappi',
  'mercadopago_delivery'
);

-- Crear enum para áreas
CREATE TYPE public.order_area AS ENUM (
  'salon',
  'mostrador',
  'delivery'
);

-- Crear enum para métodos de pago
CREATE TYPE public.payment_method AS ENUM (
  'efectivo',
  'tarjeta_debito',
  'tarjeta_credito',
  'mercadopago_qr',
  'mercadopago_link',
  'transferencia',
  'vales'
);

-- Agregar columnas al orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS sales_channel public.sales_channel DEFAULT 'atencion_presencial',
ADD COLUMN IF NOT EXISTS order_area public.order_area DEFAULT 'mostrador',
ADD COLUMN IF NOT EXISTS payment_method public.payment_method DEFAULT 'efectivo',
ADD COLUMN IF NOT EXISTS table_number text,
ADD COLUMN IF NOT EXISTS caller_number integer;

-- Crear tabla para mesas/llamadores
CREATE TABLE public.tables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  table_number text NOT NULL,
  area public.order_area NOT NULL DEFAULT 'salon',
  is_occupied boolean NOT NULL DEFAULT false,
  current_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on tables
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;

-- Políticas para tables
CREATE POLICY "Staff can view branch tables"
  ON public.tables FOR SELECT
  USING (has_branch_access(auth.uid(), branch_id));

CREATE POLICY "Staff can manage branch tables"
  ON public.tables FOR ALL
  USING (has_branch_access(auth.uid(), branch_id))
  WITH CHECK (has_branch_access(auth.uid(), branch_id));

-- Agregar índice para búsqueda rápida de mesas
CREATE INDEX idx_tables_branch_area ON public.tables(branch_id, area);