-- Eliminar las 12 categorías operativas actuales
DELETE FROM manager_competencies;

-- Insertar 6 nuevas categorías desde perspectiva de marca/coordinador
INSERT INTO manager_competencies (key, name, category, rubric_1, rubric_3, rubric_5, icon, sort_order, is_active)
VALUES 
  ('comunicacion_reportes', 'Comunicación y Reportes', 'marca', 
   'No reporta o avisa tarde; mensajes confusos o incompletos; no responde.',
   'Comunica lo importante, aunque a veces incompleto o tardío.',
   'Comunica con claridad, evidencia y propuestas; responde rápido y proactivamente.',
   '💬', 1, true),
  
  ('liderazgo_clima', 'Liderazgo y Clima de Equipo', 'marca',
   'Mal clima laboral; conflictos frecuentes; alta rotación; quejas del equipo.',
   'Lidera lo básico; algunos roces o conflictos menores; clima aceptable.',
   'Equipo estable y motivado; buen clima; liderazgo sano; baja rotación.',
   '👥', 2, true),
  
  ('desarrollo_staff', 'Desarrollo del Staff', 'marca',
   'No entrena al equipo; la gente no mejora; no hace coachings ni feedback.',
   'Capacita cuando puede; hace algunos coachings pero sin rutina.',
   'Tiene rutina de entrenamiento, feedback y coachings; el equipo crece.',
   '📚', 3, true),
  
  ('adaptacion_mejora', 'Adaptación y Mejora Continua', 'marca',
   'Resiste cambios; se queja; demora implementaciones; contagia negatividad.',
   'Implementa cambios con ayuda; acepta pero sin entusiasmo.',
   'Lidera el cambio; entrena al equipo; sostiene el estándar; propone mejoras.',
   '🔄', 4, true),
  
  ('resolucion_problemas', 'Resolución Autónoma de Problemas', 'marca',
   'Escala todo; no propone soluciones; depende de otros para resolver.',
   'Resuelve lo típico; escala lo complejo con contexto.',
   'Resuelve con criterio propio; documenta; aprende; casi no escala.',
   '🔧', 5, true),
  
  ('compromiso_marca', 'Compromiso con la Marca', 'marca',
   'Desconectado de la marca; actitud negativa; no cuida la imagen.',
   'Cumple con lo pedido; actitud neutral; hace su trabajo.',
   'Proactivo; propone mejoras; cuida la marca; se siente parte.',
   '💜', 6, true);