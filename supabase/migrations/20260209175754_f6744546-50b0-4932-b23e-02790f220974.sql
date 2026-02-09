
-- =============================================
-- FASE 1: Tabla rdo_categories + Seed
-- =============================================

CREATE TABLE public.rdo_categories (
  code text PRIMARY KEY,
  name text NOT NULL,
  parent_code text REFERENCES public.rdo_categories(code),
  level integer NOT NULL CHECK (level BETWEEN 1 AND 3),
  rdo_section text NOT NULL CHECK (rdo_section IN ('costos_variables', 'costos_fijos')),
  behavior text NOT NULL CHECK (behavior IN ('variable', 'fijo')),
  allowed_item_types text[] DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rdo_categories ENABLE ROW LEVEL SECURITY;

-- Read access for all authenticated staff
CREATE POLICY "Staff can read rdo_categories"
  ON public.rdo_categories FOR SELECT
  USING (is_staff());

-- Write access only for superadmin
CREATE POLICY "Superadmin can manage rdo_categories"
  ON public.rdo_categories FOR ALL
  USING (is_superadmin(auth.uid()))
  WITH CHECK (is_superadmin(auth.uid()));

-- =============================================
-- SEED: Nivel 1 (Secciones)
-- =============================================
INSERT INTO public.rdo_categories (code, name, parent_code, level, rdo_section, behavior, sort_order) VALUES
  ('costos_variables', 'Costos Variables', NULL, 1, 'costos_variables', 'variable', 100),
  ('costos_fijos', 'Costos Fijos', NULL, 1, 'costos_fijos', 'fijo', 200);

-- =============================================
-- SEED: Nivel 2 (Categorías)
-- =============================================
INSERT INTO public.rdo_categories (code, name, parent_code, level, rdo_section, behavior, sort_order) VALUES
  -- Variables
  ('cmv', 'CMV (Costo de Mercadería Vendida)', 'costos_variables', 2, 'costos_variables', 'variable', 110),
  ('comisiones_venta', 'Comisiones por Venta', 'costos_variables', 2, 'costos_variables', 'variable', 120),
  ('delivery', 'Delivery', 'costos_variables', 2, 'costos_variables', 'variable', 130),
  ('publicidad_marca', 'Publicidad y Marca', 'costos_variables', 2, 'costos_variables', 'variable', 140),
  -- Fijos
  ('estructura_operativa', 'Estructura Operativa', 'costos_fijos', 2, 'costos_fijos', 'fijo', 210),
  ('laborales', 'Laborales', 'costos_fijos', 2, 'costos_fijos', 'fijo', 220),
  ('administracion', 'Administración', 'costos_fijos', 2, 'costos_fijos', 'fijo', 230),
  ('servicios_infraestructura', 'Servicios e Infraestructura', 'costos_fijos', 2, 'costos_fijos', 'fijo', 240);

-- =============================================
-- SEED: Nivel 3 (Subcategorías) — Costos Variables
-- =============================================
INSERT INTO public.rdo_categories (code, name, parent_code, level, rdo_section, behavior, allowed_item_types, sort_order) VALUES
  -- CMV
  ('cmv_hamburguesas', 'Ingredientes de Hamburguesas', 'cmv', 3, 'costos_variables', 'variable', '{ingrediente}', 111),
  ('cmv_bebidas_alcohol', 'Bebidas con Alcohol', 'cmv', 3, 'costos_variables', 'variable', '{ingrediente}', 112),
  ('cmv_bebidas_sin_alcohol', 'Bebidas sin Alcohol', 'cmv', 3, 'costos_variables', 'variable', '{ingrediente}', 113),
  ('descartables_salon', 'Descartables Salón', 'cmv', 3, 'costos_variables', 'variable', '{insumo}', 114),
  ('descartables_delivery', 'Descartables Delivery', 'cmv', 3, 'costos_variables', 'variable', '{insumo}', 115),
  ('insumos_clientes', 'Insumos para Clientes', 'cmv', 3, 'costos_variables', 'variable', '{insumo}', 116),
  -- Comisiones
  ('comision_mp_point', 'Comisión MP Point', 'comisiones_venta', 3, 'costos_variables', 'variable', '{servicio}', 121),
  ('comision_rappi', 'Comisión Rappi', 'comisiones_venta', 3, 'costos_variables', 'variable', '{servicio}', 122),
  ('comision_pedidosya', 'Comisión PedidosYa', 'comisiones_venta', 3, 'costos_variables', 'variable', '{servicio}', 123),
  -- Delivery
  ('cadetes_rappiboy', 'Pago a RappiBoys', 'delivery', 3, 'costos_variables', 'variable', '{servicio}', 131),
  ('cadetes_terceros', 'Cadetes Terceros', 'delivery', 3, 'costos_variables', 'variable', '{servicio}', 132),
  -- Publicidad y Marca
  ('fee_marca', 'Canon 4.5%', 'publicidad_marca', 3, 'costos_variables', 'variable', '{servicio}', 141),
  ('marketing', 'Marketing 0.5%', 'publicidad_marca', 3, 'costos_variables', 'variable', '{servicio}', 142);

-- =============================================
-- SEED: Nivel 3 (Subcategorías) — Costos Fijos
-- =============================================
INSERT INTO public.rdo_categories (code, name, parent_code, level, rdo_section, behavior, allowed_item_types, sort_order) VALUES
  -- Estructura Operativa
  ('limpieza_higiene', 'Limpieza e Higiene', 'estructura_operativa', 3, 'costos_fijos', 'fijo', '{insumo}', 211),
  ('descartables_cocina', 'Descartables Cocina', 'estructura_operativa', 3, 'costos_fijos', 'fijo', '{insumo}', 212),
  ('mantenimiento', 'Mantenimiento', 'estructura_operativa', 3, 'costos_fijos', 'fijo', '{servicio}', 213),
  ('uniformes', 'Uniformes', 'estructura_operativa', 3, 'costos_fijos', 'fijo', '{insumo}', 214),
  -- Laborales
  ('sueldos', 'Sueldos', 'laborales', 3, 'costos_fijos', 'fijo', '{servicio}', 221),
  ('cargas_sociales', 'Cargas Sociales', 'laborales', 3, 'costos_fijos', 'fijo', '{servicio}', 222),
  ('comida_personal', 'Comida del Personal', 'laborales', 3, 'costos_fijos', 'fijo', '{ingrediente,insumo}', 223),
  -- Administración
  ('software_gestion', 'Software de Gestión', 'administracion', 3, 'costos_fijos', 'fijo', '{servicio}', 231),
  ('estudio_contable', 'Estudio Contable', 'administracion', 3, 'costos_fijos', 'fijo', '{servicio}', 232),
  ('bromatologia', 'Bromatología', 'administracion', 3, 'costos_fijos', 'fijo', '{servicio}', 233),
  -- Servicios e Infraestructura
  ('alquiler', 'Alquiler', 'servicios_infraestructura', 3, 'costos_fijos', 'fijo', '{servicio}', 241),
  ('expensas', 'Expensas', 'servicios_infraestructura', 3, 'costos_fijos', 'fijo', '{servicio}', 242),
  ('gas', 'Gas', 'servicios_infraestructura', 3, 'costos_fijos', 'fijo', '{servicio}', 243),
  ('internet_telefonia', 'Internet y Telefonía', 'servicios_infraestructura', 3, 'costos_fijos', 'fijo', '{servicio}', 244),
  ('energia_electrica', 'Energía Eléctrica', 'servicios_infraestructura', 3, 'costos_fijos', 'fijo', '{servicio}', 245);
