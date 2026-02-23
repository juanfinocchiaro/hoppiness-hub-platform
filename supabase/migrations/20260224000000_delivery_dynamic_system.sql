-- ═══════════════════════════════════════════════════════════════
-- Dynamic Delivery System
-- Replaces manual zone-based delivery with distance-based pricing
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. delivery_pricing_config (brand-level, single row) ────
CREATE TABLE IF NOT EXISTS public.delivery_pricing_config (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id              UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',

  base_distance_km      NUMERIC(4,1) NOT NULL DEFAULT 2.5,
  base_price            INTEGER NOT NULL DEFAULT 2000,
  price_per_extra_km    INTEGER NOT NULL DEFAULT 1000,

  max_allowed_radius_km NUMERIC(4,1) NOT NULL DEFAULT 10.0,

  estimated_speed_kmh   INTEGER NOT NULL DEFAULT 25,
  prep_time_minutes     INTEGER NOT NULL DEFAULT 15,
  time_disclaimer       TEXT DEFAULT 'El cadete puede tener hasta 2 pedidos más',

  google_api_key_encrypted TEXT,

  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now(),
  UNIQUE(brand_id)
);

ALTER TABLE public.delivery_pricing_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read delivery pricing" ON public.delivery_pricing_config;
CREATE POLICY "Authenticated can read delivery pricing"
  ON public.delivery_pricing_config FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "Superadmin can manage delivery pricing" ON public.delivery_pricing_config;
CREATE POLICY "Superadmin can manage delivery pricing"
  ON public.delivery_pricing_config FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles_v2
      WHERE user_id = auth.uid() AND brand_role = 'superadmin' AND is_active = true
    )
  );

-- Seed default row (one per brand)
INSERT INTO public.delivery_pricing_config (brand_id)
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (brand_id) DO NOTHING;


-- ─── 2. branch_delivery_config (one per branch) ─────────────
CREATE TABLE IF NOT EXISTS public.branch_delivery_config (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id               UUID NOT NULL UNIQUE REFERENCES public.branches(id) ON DELETE CASCADE,

  default_radius_km       NUMERIC(4,1) NOT NULL DEFAULT 5.0,

  radius_override_km      NUMERIC(4,1),
  radius_override_until   TIMESTAMPTZ,
  radius_override_by      UUID REFERENCES auth.users(id),

  delivery_enabled        BOOLEAN NOT NULL DEFAULT true,

  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.branch_delivery_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read branch delivery config" ON public.branch_delivery_config;
CREATE POLICY "Authenticated can read branch delivery config"
  ON public.branch_delivery_config FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "Staff can update branch delivery config" ON public.branch_delivery_config;
CREATE POLICY "Staff can update branch delivery config"
  ON public.branch_delivery_config FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles_v2 ur
      WHERE ur.user_id = auth.uid() AND ur.is_active = true
        AND (ur.brand_role IN ('superadmin', 'coordinador')
             OR (ur.branch_ids IS NOT NULL AND branch_delivery_config.branch_id = ANY(ur.branch_ids)))
    )
  );

DROP POLICY IF EXISTS "Superadmin can insert branch delivery config" ON public.branch_delivery_config;
CREATE POLICY "Superadmin can insert branch delivery config"
  ON public.branch_delivery_config FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles_v2
      WHERE user_id = auth.uid() AND brand_role IN ('superadmin', 'coordinador') AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Anon can read branch delivery config" ON public.branch_delivery_config;
CREATE POLICY "Anon can read branch delivery config"
  ON public.branch_delivery_config FOR SELECT
  TO anon USING (true);


-- ─── 3. city_neighborhoods ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.city_neighborhoods (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  city            TEXT NOT NULL DEFAULT 'Córdoba',
  centroid_lat    NUMERIC(10,7) NOT NULL,
  centroid_lng    NUMERIC(10,7) NOT NULL,
  source          TEXT DEFAULT 'open_data_cordoba',
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_neighborhoods_city ON public.city_neighborhoods(city);

ALTER TABLE public.city_neighborhoods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read neighborhoods" ON public.city_neighborhoods;
CREATE POLICY "Anyone can read neighborhoods"
  ON public.city_neighborhoods FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Superadmin can manage neighborhoods" ON public.city_neighborhoods;
CREATE POLICY "Superadmin can manage neighborhoods"
  ON public.city_neighborhoods FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles_v2
      WHERE user_id = auth.uid() AND brand_role = 'superadmin' AND is_active = true
    )
  );


-- ─── 4. branch_delivery_neighborhoods ───────────────────────
CREATE TABLE IF NOT EXISTS public.branch_delivery_neighborhoods (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id                 UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  neighborhood_id           UUID NOT NULL REFERENCES public.city_neighborhoods(id) ON DELETE CASCADE,

  status                    TEXT NOT NULL DEFAULT 'enabled'
                            CHECK (status IN ('enabled', 'blocked_security', 'blocked_conflict')),

  distance_km               NUMERIC(5,2),

  decided_by                TEXT NOT NULL DEFAULT 'auto'
                            CHECK (decided_by IN ('auto', 'brand_admin')),

  conflict_with_branch_id   UUID REFERENCES public.branches(id),

  block_reason              TEXT,

  created_at                TIMESTAMPTZ DEFAULT now(),
  updated_at                TIMESTAMPTZ DEFAULT now(),

  UNIQUE(branch_id, neighborhood_id)
);

CREATE INDEX IF NOT EXISTS idx_bdn_branch ON public.branch_delivery_neighborhoods(branch_id);
CREATE INDEX IF NOT EXISTS idx_bdn_status ON public.branch_delivery_neighborhoods(status);

ALTER TABLE public.branch_delivery_neighborhoods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read branch neighborhoods" ON public.branch_delivery_neighborhoods;
CREATE POLICY "Authenticated can read branch neighborhoods"
  ON public.branch_delivery_neighborhoods FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "Anon can read branch neighborhoods" ON public.branch_delivery_neighborhoods;
CREATE POLICY "Anon can read branch neighborhoods"
  ON public.branch_delivery_neighborhoods FOR SELECT
  TO anon USING (true);

DROP POLICY IF EXISTS "Brand admin can manage branch neighborhoods" ON public.branch_delivery_neighborhoods;
CREATE POLICY "Brand admin can manage branch neighborhoods"
  ON public.branch_delivery_neighborhoods FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles_v2
      WHERE user_id = auth.uid() AND brand_role IN ('superadmin', 'coordinador') AND is_active = true
    )
  );


-- ─── 5. delivery_radius_overrides_log ───────────────────────
CREATE TABLE IF NOT EXISTS public.delivery_radius_overrides_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id       UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  previous_km     NUMERIC(4,1),
  new_km          NUMERIC(4,1),
  action          TEXT NOT NULL CHECK (action IN ('reduce', 'restore', 'auto_restore')),
  performed_by    UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.delivery_radius_overrides_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can insert override logs" ON public.delivery_radius_overrides_log;
CREATE POLICY "Staff can insert override logs"
  ON public.delivery_radius_overrides_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles_v2
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Brand admin can read override logs" ON public.delivery_radius_overrides_log;
CREATE POLICY "Brand admin can read override logs"
  ON public.delivery_radius_overrides_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles_v2
      WHERE user_id = auth.uid() AND is_active = true
    )
  );


-- ─── 6. Add delivery geo columns to pedidos ─────────────────
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS delivery_lat NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS delivery_lng NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS delivery_distance_km NUMERIC(5,2);


-- ─── 7. Anon read for delivery_pricing_config (webapp) ──────
DROP POLICY IF EXISTS "Anon can read delivery pricing" ON public.delivery_pricing_config;
CREATE POLICY "Anon can read delivery pricing"
  ON public.delivery_pricing_config FOR SELECT
  TO anon USING (true);


-- ─── 8. Auto-populate branch_delivery_config for existing branches ──
INSERT INTO public.branch_delivery_config (branch_id, default_radius_km, delivery_enabled)
SELECT
  b.id,
  COALESCE(wc.delivery_radio_km, 5.0),
  COALESCE(wc.delivery_habilitado, true)
FROM public.branches b
LEFT JOIN public.webapp_config wc ON wc.branch_id = b.id
WHERE b.is_active = true
ON CONFLICT (branch_id) DO NOTHING;


-- ─── 9. Seed Córdoba neighborhoods (representative sample) ──
INSERT INTO public.city_neighborhoods (name, city, centroid_lat, centroid_lng) VALUES
  ('Centro', 'Córdoba', -31.4201, -64.1888),
  ('Nueva Córdoba', 'Córdoba', -31.4275, -64.1850),
  ('Güemes', 'Córdoba', -31.4230, -64.1780),
  ('Alberdi', 'Córdoba', -31.4170, -64.1960),
  ('Alto Alberdi', 'Córdoba', -31.4100, -64.2020),
  ('San Vicente', 'Córdoba', -31.4280, -64.1700),
  ('Observatorio', 'Córdoba', -31.4230, -64.1950),
  ('Cofico', 'Córdoba', -31.4100, -64.1900),
  ('General Paz', 'Córdoba', -31.4050, -64.1850),
  ('Alta Córdoba', 'Córdoba', -31.3980, -64.1870),
  ('San Martín', 'Córdoba', -31.4070, -64.1760),
  ('Juniors', 'Córdoba', -31.4000, -64.1800),
  ('Pueyrredón', 'Córdoba', -31.4050, -64.1750),
  ('Maipú', 'Córdoba', -31.4150, -64.1700),
  ('Bella Vista', 'Córdoba', -31.3930, -64.1830),
  ('Jardín', 'Córdoba', -31.3960, -64.1740),
  ('Los Naranjos', 'Córdoba', -31.3920, -64.1700),
  ('Rogelio Martínez', 'Córdoba', -31.3870, -64.1800),
  ('Cerro de las Rosas', 'Córdoba', -31.3750, -64.2080),
  ('Argüello', 'Córdoba', -31.3550, -64.2300),
  ('Villa Belgrano', 'Córdoba', -31.3650, -64.2250),
  ('Villa Allende', 'Córdoba', -31.2950, -64.2950),
  ('Villa Warcalde', 'Córdoba', -31.3500, -64.2500),
  ('Urca', 'Córdoba', -31.3850, -64.2200),
  ('Tablada Park', 'Córdoba', -31.3800, -64.2150),
  ('Poeta Lugones', 'Córdoba', -31.3900, -64.2000),
  ('Cerro Norte', 'Córdoba', -31.3650, -64.2100),
  ('Parque Vélez Sarsfield', 'Córdoba', -31.4310, -64.1920),
  ('Residencial Vélez Sarsfield', 'Córdoba', -31.4350, -64.1980),
  ('Jardín Espinosa', 'Córdoba', -31.4250, -64.2050),
  ('Quintas de Santa Ana', 'Córdoba', -31.4080, -64.2100),
  ('Parque Capital', 'Córdoba', -31.4020, -64.2200),
  ('Marqués de Sobremonte', 'Córdoba', -31.4300, -64.1620),
  ('Los Platanos', 'Córdoba', -31.4250, -64.1550),
  ('Panamericano', 'Córdoba', -31.4180, -64.1500),
  ('Patricios', 'Córdoba', -31.4150, -64.1600),
  ('Crisol', 'Córdoba', -31.4100, -64.1630),
  ('Yofre', 'Córdoba', -31.4050, -64.1500),
  ('Talleres Este', 'Córdoba', -31.4000, -64.1580),
  ('Las Palmas', 'Córdoba', -31.3950, -64.1600),
  ('San Fernando', 'Córdoba', -31.4400, -64.1650),
  ('Residencial San Fernando', 'Córdoba', -31.4450, -64.1600),
  ('Inaudi', 'Córdoba', -31.4600, -64.1650),
  ('Manantiales', 'Córdoba', -31.4700, -64.1700),
  ('Tejas del Sur', 'Córdoba', -31.4650, -64.1800),
  ('Residencial Sur', 'Córdoba', -31.4500, -64.1850),
  ('Villa Carlos Paz', 'Córdoba', -31.4237, -64.4970),
  ('Villa Urquiza', 'Córdoba', -31.4350, -64.1750),
  ('Barrio Comercial', 'Córdoba', -31.4200, -64.1650),
  ('Los Boulevares', 'Córdoba', -31.3700, -64.2400),
  ('Chateau Carreras', 'Córdoba', -31.3900, -64.2400),
  ('Villa Rivera Indarte', 'Córdoba', -31.3450, -64.2450),
  ('Parque Norte', 'Córdoba', -31.3600, -64.1800),
  ('Los Olmos', 'Córdoba', -31.3700, -64.1700),
  ('Villa Cabrera', 'Córdoba', -31.3850, -64.1950),
  ('Colinas de Vélez Sarsfield', 'Córdoba', -31.4380, -64.2050),
  ('Residencial América', 'Córdoba', -31.4050, -64.2050),
  ('Quebrada de las Rosas', 'Córdoba', -31.3750, -64.2000),
  ('Country Lomas de la Carolina', 'Córdoba', -31.3400, -64.2600),
  ('Granja de Funes', 'Córdoba', -31.3500, -64.2700)
ON CONFLICT DO NOTHING;
