-- Promotions and discount codes system

-- Promotions table
CREATE TABLE IF NOT EXISTS public.promociones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid,
  nombre text NOT NULL,
  descripcion text,
  tipo text NOT NULL CHECK (tipo IN ('descuento_porcentaje', 'descuento_fijo', '2x1', 'combo', 'precio_especial')),
  valor numeric NOT NULL DEFAULT 0,
  restriccion_pago text NOT NULL DEFAULT 'cualquiera' CHECK (restriccion_pago IN ('cualquiera', 'solo_efectivo', 'solo_digital')),

  -- Activation rules
  dias_semana integer[] DEFAULT '{0,1,2,3,4,5,6}',
  hora_inicio time DEFAULT '00:00',
  hora_fin time DEFAULT '23:59',
  fecha_inicio date,
  fecha_fin date,

  -- Scope
  aplica_a text NOT NULL DEFAULT 'todo' CHECK (aplica_a IN ('producto', 'categoria', 'todo')),
  producto_ids uuid[] DEFAULT '{}',
  categoria_ids uuid[] DEFAULT '{}',

  -- User segmentation
  tipo_usuario text NOT NULL DEFAULT 'todos' CHECK (tipo_usuario IN ('todos', 'nuevo', 'recurrente', 'staff', 'custom_segment')),

  -- State
  activa boolean NOT NULL DEFAULT true,
  branch_ids uuid[] DEFAULT '{}',

  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_promociones_activa ON public.promociones(activa) WHERE deleted_at IS NULL;

-- Discount codes table
CREATE TABLE IF NOT EXISTS public.codigos_descuento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid,
  codigo text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('descuento_porcentaje', 'descuento_fijo')),
  valor numeric NOT NULL DEFAULT 0,
  usos_maximos integer,
  usos_actuales integer NOT NULL DEFAULT 0,
  uso_unico_por_usuario boolean NOT NULL DEFAULT true,
  monto_minimo_pedido numeric,
  fecha_inicio date NOT NULL DEFAULT CURRENT_DATE,
  fecha_fin date NOT NULL DEFAULT (CURRENT_DATE + interval '30 days'),
  activo boolean NOT NULL DEFAULT true,
  branch_ids uuid[] DEFAULT '{}',

  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_codigos_descuento_codigo
  ON public.codigos_descuento(upper(codigo)) WHERE deleted_at IS NULL;

-- Track code usage per user
CREATE TABLE IF NOT EXISTS public.codigos_descuento_usos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_id uuid NOT NULL REFERENCES public.codigos_descuento(id),
  user_id uuid REFERENCES auth.users(id),
  pedido_id uuid,
  monto_descontado numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_codigos_usos_codigo ON public.codigos_descuento_usos(codigo_id);
CREATE INDEX IF NOT EXISTS idx_codigos_usos_user ON public.codigos_descuento_usos(user_id);

-- RLS
ALTER TABLE public.promociones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.codigos_descuento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.codigos_descuento_usos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_select_promociones" ON public.promociones FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY "auth_insert_promociones" ON public.promociones FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_promociones" ON public.promociones FOR UPDATE TO authenticated USING (true);

CREATE POLICY "auth_select_codigos" ON public.codigos_descuento FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY "auth_insert_codigos" ON public.codigos_descuento FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_codigos" ON public.codigos_descuento FOR UPDATE TO authenticated USING (true);

CREATE POLICY "auth_select_codigos_usos" ON public.codigos_descuento_usos FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_codigos_usos" ON public.codigos_descuento_usos FOR INSERT TO authenticated WITH CHECK (true);

-- Allow anon to read active promos (for webapp public display)
CREATE POLICY "anon_select_active_promos" ON public.promociones FOR SELECT TO anon USING (activa = true AND deleted_at IS NULL);
-- Allow anon to validate discount codes
CREATE POLICY "anon_select_active_codes" ON public.codigos_descuento FOR SELECT TO anon USING (activo = true AND deleted_at IS NULL);
