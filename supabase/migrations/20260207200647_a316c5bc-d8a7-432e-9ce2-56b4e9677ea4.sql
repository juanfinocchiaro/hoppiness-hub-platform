-- Limpiar duplicados y reorganizar competencias de encargado
DELETE FROM manager_competencies;

INSERT INTO manager_competencies (key, name, description, sort_order, is_active) VALUES
('leadership_team', 'Liderazgo de Equipo', 'Motiva, delega y desarrolla al personal. Genera buen clima laboral.', 1, true),
('shift_management', 'Gestión del Turno', 'Organiza posiciones, descansos y flujo de trabajo eficientemente.', 2, true),
('quality_control', 'Control de Calidad', 'Supervisa estándares de producto, servicio y limpieza.', 3, true),
('crisis_management', 'Atención de Crisis', 'Maneja quejas de clientes, conflictos internos y situaciones imprevistas.', 4, true),
('operational_compliance', 'Cumplimiento Operativo', 'Realiza fichajes, cierres de turno y reportes a tiempo.', 5, true),
('team_development', 'Desarrollo del Equipo', 'Realiza coachings mensuales, entrena y mentoriza al staff.', 6, true),
('brand_communication', 'Comunicación con Marca', 'Responde mensajes, genera reportes y es proactivo con la central.', 7, true);