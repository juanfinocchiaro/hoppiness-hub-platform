-- Fase 1.1: Agregar permisos faltantes a permission_config
-- Insertar permisos de MARCA (brand scope)
INSERT INTO permission_config (permission_key, permission_label, scope, category, allowed_roles, is_editable)
VALUES 
  -- Reuniones de Marca
  ('brand.viewMeetings', 'Ver Reuniones de Red', 'brand', 'Reuniones', ARRAY['superadmin', 'coordinador'], true),
  ('brand.createMeetings', 'Convocar Reuniones de Red', 'brand', 'Reuniones', ARRAY['superadmin', 'coordinador'], true),
  -- Coaching de Red
  ('brand.viewCoaching', 'Ver Coaching de Red', 'brand', 'Coaching', ARRAY['superadmin', 'coordinador'], true),
  -- Configuración de Cierres
  ('brand.viewClosureConfig', 'Configurar Cierres de Turno', 'brand', 'Ventas', ARRAY['superadmin'], true)
ON CONFLICT (permission_key) DO NOTHING;

-- Insertar permisos de LOCAL (local scope)
INSERT INTO permission_config (permission_key, permission_label, scope, category, allowed_roles, is_editable)
VALUES 
  -- Reuniones Locales
  ('local.viewMeetings', 'Ver Reuniones', 'local', 'Reuniones', ARRAY['franquiciado', 'encargado', 'cajero', 'empleado'], true),
  ('local.createMeetings', 'Convocar Reuniones', 'local', 'Reuniones', ARRAY['franquiciado', 'encargado'], true),
  ('local.closeMeetings', 'Cerrar Reuniones', 'local', 'Reuniones', ARRAY['franquiciado', 'encargado'], true),
  -- Cierres de Turno
  ('local.viewClosures', 'Ver Cierres de Turno', 'local', 'Ventas', ARRAY['franquiciado', 'encargado', 'cajero'], true),
  ('local.closeShifts', 'Cerrar Turnos', 'local', 'Ventas', ARRAY['franquiciado', 'encargado', 'cajero'], true),
  -- Liquidación
  ('local.viewPayroll', 'Ver Liquidación', 'local', 'RRHH', ARRAY['franquiciado', 'encargado'], true)
ON CONFLICT (permission_key) DO NOTHING;