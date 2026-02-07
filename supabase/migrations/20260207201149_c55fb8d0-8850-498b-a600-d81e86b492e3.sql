-- Agregar permiso para hacer coaching a encargados
INSERT INTO permission_config (permission_key, permission_label, category, scope, allowed_roles, is_editable)
VALUES (
  'brand.coachManagers',
  'Realizar Coaching a Encargados',
  'Coaching',
  'brand',
  ARRAY['superadmin', 'coordinador'],
  true
);