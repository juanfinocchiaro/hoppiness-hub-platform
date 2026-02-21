
-- Table: cliente_direcciones — saved delivery addresses
CREATE TABLE public.cliente_direcciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  etiqueta TEXT NOT NULL DEFAULT 'Casa', -- Casa, Trabajo, Otro
  direccion TEXT NOT NULL,
  piso TEXT,
  referencia TEXT,
  ciudad TEXT DEFAULT 'Córdoba',
  latitud NUMERIC(10,7),
  longitud NUMERIC(10,7),
  es_principal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_cliente_dir_user ON public.cliente_direcciones(user_id);

ALTER TABLE public.cliente_direcciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own addresses"
  ON public.cliente_direcciones FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add preferencia_pago to profiles (if not exists)
DO $$ BEGIN
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferencia_pago TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
