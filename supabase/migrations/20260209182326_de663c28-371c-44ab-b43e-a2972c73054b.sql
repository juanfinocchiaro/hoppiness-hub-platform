
-- =============================================
-- Add ALL missing permissions to permission_config
-- Each feature gets a "Ver" and optionally "Hacer/Editar" variant
-- Also configure contador_marca and contador_local roles correctly
-- =============================================

-- ═══ BRAND: CATÁLOGOS MARCA ═══
INSERT INTO public.permission_config (permission_key, permission_label, scope, category, allowed_roles, is_editable)
VALUES
  ('brand.viewInsumos', 'Ver Insumos', 'brand', 'Catálogos Marca', ARRAY['superadmin','coordinador','contador_marca'], true),
  ('brand.editInsumos', 'Gestionar Insumos', 'brand', 'Catálogos Marca', ARRAY['superadmin','coordinador'], true),
  ('brand.viewConceptosServicio', 'Ver Conceptos de Servicio', 'brand', 'Catálogos Marca', ARRAY['superadmin','coordinador','contador_marca'], true),
  ('brand.editConceptosServicio', 'Gestionar Conceptos de Servicio', 'brand', 'Catálogos Marca', ARRAY['superadmin','coordinador'], true),
  ('brand.viewProveedoresMarca', 'Ver Proveedores', 'brand', 'Catálogos Marca', ARRAY['superadmin','coordinador','contador_marca'], true),
  ('brand.editProveedoresMarca', 'Gestionar Proveedores', 'brand', 'Catálogos Marca', ARRAY['superadmin','coordinador'], true);

-- ═══ BRAND: FINANZAS MARCA ═══
INSERT INTO public.permission_config (permission_key, permission_label, scope, category, allowed_roles, is_editable)
VALUES
  ('brand.viewVentasMensuales', 'Ver Ventas Mensuales', 'brand', 'Finanzas Marca', ARRAY['superadmin','informes','contador_marca'], true),
  ('brand.editVentasMensuales', 'Gestionar Ventas Mensuales', 'brand', 'Finanzas Marca', ARRAY['superadmin','contador_marca'], true),
  ('brand.viewCanon', 'Ver Canon', 'brand', 'Finanzas Marca', ARRAY['superadmin','contador_marca'], true),
  ('brand.editCanon', 'Gestionar Canon', 'brand', 'Finanzas Marca', ARRAY['superadmin','contador_marca'], true);

-- ═══ BRAND: GESTIÓN DE PERSONAS - add missing central team ═══
INSERT INTO public.permission_config (permission_key, permission_label, scope, category, allowed_roles, is_editable)
VALUES
  ('brand.viewCentralTeam', 'Ver Equipo Central', 'brand', 'Gestión de Personas', ARRAY['superadmin','coordinador'], true),
  ('brand.editCentralTeam', 'Gestionar Equipo Central', 'brand', 'Gestión de Personas', ARRAY['superadmin'], true);

-- ═══ BRAND: COMUNICACIÓN - add missing contact messages ═══
INSERT INTO public.permission_config (permission_key, permission_label, scope, category, allowed_roles, is_editable)
VALUES
  ('brand.viewContactMessages', 'Ver Bandeja de Entrada', 'brand', 'Comunicación', ARRAY['superadmin','coordinador'], true),
  ('brand.manageContactMessages', 'Gestionar Mensajes de Contacto', 'brand', 'Comunicación', ARRAY['superadmin','coordinador'], true);

-- ═══ LOCAL: COACHING (missing from permission_config) ═══
INSERT INTO public.permission_config (permission_key, permission_label, scope, category, allowed_roles, is_editable)
VALUES
  ('local.viewCoaching', 'Ver Coaching', 'local', 'Coaching', ARRAY['franquiciado','encargado'], true),
  ('local.doCoaching', 'Realizar Coaching', 'local', 'Coaching', ARRAY['encargado'], true);

-- ═══ LOCAL: OPERACIONES (Compras y Proveedores) ═══
INSERT INTO public.permission_config (permission_key, permission_label, scope, category, allowed_roles, is_editable)
VALUES
  ('local.viewCompras', 'Ver Compras y Servicios', 'local', 'Operaciones', ARRAY['franquiciado','encargado','contador_local'], true),
  ('local.createCompras', 'Cargar Compras y Servicios', 'local', 'Operaciones', ARRAY['encargado','contador_local'], true),
  ('local.viewProveedoresLocal', 'Ver Proveedores', 'local', 'Operaciones', ARRAY['franquiciado','encargado','contador_local'], true),
  ('local.viewCuentaCorriente', 'Ver Cuenta Corriente', 'local', 'Operaciones', ARRAY['franquiciado','encargado','contador_local'], true),
  ('local.pagarProveedor', 'Registrar Pagos a Proveedores', 'local', 'Operaciones', ARRAY['contador_local'], true);

-- ═══ LOCAL: FINANZAS ═══
INSERT INTO public.permission_config (permission_key, permission_label, scope, category, allowed_roles, is_editable)
VALUES
  ('local.viewGastos', 'Ver Gastos Menores', 'local', 'Finanzas', ARRAY['franquiciado','encargado','contador_local'], true),
  ('local.createGastos', 'Cargar Gastos Menores', 'local', 'Finanzas', ARRAY['encargado','contador_local'], true),
  ('local.viewConsumos', 'Ver Consumos', 'local', 'Finanzas', ARRAY['franquiciado','encargado','contador_local'], true),
  ('local.createConsumos', 'Cargar Consumos', 'local', 'Finanzas', ARRAY['encargado','contador_local'], true),
  ('local.viewPL', 'Ver Resultado Económico', 'local', 'Finanzas', ARRAY['franquiciado','contador_local'], true),
  ('local.viewPeriodos', 'Ver Períodos', 'local', 'Finanzas', ARRAY['franquiciado','contador_local'], true),
  ('local.editPeriodos', 'Gestionar Períodos', 'local', 'Finanzas', ARRAY['franquiciado','contador_local'], true),
  ('local.viewVentasMensualesLocal', 'Ver Ventas Mensuales', 'local', 'Finanzas', ARRAY['franquiciado','contador_local'], true),
  ('local.editVentasMensualesLocal', 'Cargar Ventas Mensuales', 'local', 'Finanzas', ARRAY['franquiciado','contador_local'], true);

-- ═══ LOCAL: MI CUENTA SOCIO ═══
INSERT INTO public.permission_config (permission_key, permission_label, scope, category, allowed_roles, is_editable)
VALUES
  ('local.viewSocios', 'Ver Socios y Movimientos', 'local', 'Mi Cuenta Socio', ARRAY['franquiciado'], true),
  ('local.editSocios', 'Gestionar Socios', 'local', 'Mi Cuenta Socio', ARRAY['franquiciado'], true);

-- ═══ LOCAL: COMUNICADOS ═══
INSERT INTO public.permission_config (permission_key, permission_label, scope, category, allowed_roles, is_editable)
VALUES
  ('local.viewLocalCommunications', 'Ver Comunicados', 'local', 'Comunicados', ARRAY['franquiciado','encargado','contador_local'], true),
  ('local.sendLocalCommunications', 'Enviar Comunicados', 'local', 'Comunicados', ARRAY['encargado'], true);

-- ═══ Also update existing permissions to include contador_local where specified ═══
-- Contadora local should see liquidación (already has viewPayroll)
-- Add contador_local to viewPayroll if not already there
UPDATE public.permission_config 
SET allowed_roles = ARRAY['franquiciado','encargado','contador_local'] 
WHERE permission_key = 'local.viewPayroll';
