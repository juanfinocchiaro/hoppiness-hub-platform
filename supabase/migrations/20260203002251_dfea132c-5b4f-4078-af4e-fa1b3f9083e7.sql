-- =====================================================
-- FASE 1: Sistema de Posiciones Operativas + Permisos
-- =====================================================

-- 1. Crear enum para posiciones operativas
CREATE TYPE work_position_type AS ENUM (
  'cajero',
  'cocinero', 
  'barista',
  'runner',
  'lavacopas'
);

-- 2. Agregar posición por defecto en user_branch_roles
ALTER TABLE user_branch_roles 
ADD COLUMN default_position work_position_type;

-- 3. Agregar posición en employee_schedules
ALTER TABLE employee_schedules 
ADD COLUMN work_position work_position_type;

-- 4. Crear tabla de configuración de permisos
CREATE TABLE permission_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_key TEXT NOT NULL UNIQUE,
  permission_label TEXT NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('brand', 'local')),
  category TEXT NOT NULL,
  allowed_roles TEXT[] NOT NULL,
  is_editable BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Habilitar RLS
ALTER TABLE permission_config ENABLE ROW LEVEL SECURITY;

-- 6. Políticas RLS: Solo superadmin puede modificar, staff puede leer
CREATE POLICY "permission_config_read" ON permission_config
FOR SELECT USING (is_staff(auth.uid()));

CREATE POLICY "permission_config_admin" ON permission_config
FOR ALL USING (is_superadmin(auth.uid()))
WITH CHECK (is_superadmin(auth.uid()));

-- 7. Insertar permisos iniciales de MARCA
INSERT INTO permission_config (permission_key, permission_label, scope, category, allowed_roles, is_editable) VALUES
-- Dashboard
('brand.viewDashboard', 'Ver Dashboard', 'brand', 'Dashboard', ARRAY['superadmin', 'coordinador', 'informes', 'contador_marca'], true),
('brand.viewSalesTable', 'Ver Tabla de Ventas', 'brand', 'Dashboard', ARRAY['superadmin', 'coordinador', 'informes', 'contador_marca'], true),
-- Locales
('brand.viewBranches', 'Ver Locales', 'brand', 'Locales', ARRAY['superadmin', 'coordinador', 'informes', 'contador_marca'], true),
('brand.createBranches', 'Crear Locales', 'brand', 'Locales', ARRAY['superadmin'], false),
('brand.editBranches', 'Editar Locales', 'brand', 'Locales', ARRAY['superadmin'], false),
-- Usuarios
('brand.viewUsers', 'Ver Usuarios', 'brand', 'Usuarios', ARRAY['superadmin', 'coordinador'], true),
('brand.assignRoles', 'Asignar Roles', 'brand', 'Usuarios', ARRAY['superadmin'], false),
-- Comunicaciones
('brand.viewCommunications', 'Ver Comunicados', 'brand', 'Comunicaciones', ARRAY['superadmin', 'coordinador'], true),
('brand.createCommunications', 'Crear Comunicados', 'brand', 'Comunicaciones', ARRAY['superadmin', 'coordinador'], true),
-- Reglamentos
('brand.viewRegulations', 'Ver Reglamentos', 'brand', 'Reglamentos', ARRAY['superadmin', 'coordinador'], true),
('brand.manageRegulations', 'Gestionar Reglamentos', 'brand', 'Reglamentos', ARRAY['superadmin'], false),
-- Configuración
('brand.viewConfig', 'Ver Configuración', 'brand', 'Configuración', ARRAY['superadmin'], false),
('brand.editConfig', 'Editar Configuración', 'brand', 'Configuración', ARRAY['superadmin'], false);

-- 8. Insertar permisos iniciales de LOCAL
INSERT INTO permission_config (permission_key, permission_label, scope, category, allowed_roles, is_editable) VALUES
-- Dashboard
('local.viewDashboard', 'Ver Dashboard', 'local', 'Dashboard', ARRAY['franquiciado', 'encargado', 'cajero'], true),
('local.enterSales', 'Cargar Ventas', 'local', 'Dashboard', ARRAY['franquiciado', 'encargado', 'cajero'], true),
-- Equipo
('local.viewTeam', 'Ver Equipo', 'local', 'Equipo', ARRAY['franquiciado', 'encargado'], true),
('local.addTeamMember', 'Agregar al Equipo', 'local', 'Equipo', ARRAY['franquiciado', 'encargado'], true),
('local.editTeamMember', 'Editar Miembro', 'local', 'Equipo', ARRAY['franquiciado', 'encargado'], true),
-- Horarios
('local.viewSchedules', 'Ver Horarios', 'local', 'Horarios', ARRAY['franquiciado', 'encargado', 'cajero', 'empleado'], true),
('local.editSchedules', 'Editar Horarios', 'local', 'Horarios', ARRAY['franquiciado', 'encargado'], true),
('local.approveRequests', 'Aprobar Solicitudes', 'local', 'Horarios', ARRAY['franquiciado', 'encargado'], true),
-- Fichajes
('local.viewClockIns', 'Ver Fichajes', 'local', 'Fichajes', ARRAY['franquiciado', 'encargado', 'contador_local'], true),
-- Adelantos
('local.viewAdvances', 'Ver Adelantos', 'local', 'Adelantos', ARRAY['franquiciado', 'encargado', 'contador_local'], true),
('local.createAdvances', 'Crear Adelantos', 'local', 'Adelantos', ARRAY['franquiciado', 'encargado'], true),
-- Apercibimientos
('local.viewWarnings', 'Ver Apercibimientos', 'local', 'Apercibimientos', ARRAY['franquiciado', 'encargado'], true),
('local.createWarnings', 'Crear Apercibimientos', 'local', 'Apercibimientos', ARRAY['franquiciado', 'encargado'], true),
-- Reglamentos
('local.viewRegulationSignatures', 'Ver Firmas Reglamento', 'local', 'Reglamentos', ARRAY['franquiciado', 'encargado'], true),
('local.uploadSignatures', 'Subir Firmas', 'local', 'Reglamentos', ARRAY['franquiciado', 'encargado'], true),
-- Configuración
('local.viewConfig', 'Ver Configuración', 'local', 'Configuración', ARRAY['franquiciado', 'encargado'], true),
('local.editConfig', 'Editar Configuración', 'local', 'Configuración', ARRAY['franquiciado'], false);