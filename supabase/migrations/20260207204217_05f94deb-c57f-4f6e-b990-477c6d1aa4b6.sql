-- Eliminar las categorías actuales e insertar 8 nuevas con rúbricas específicas
DELETE FROM manager_competencies;

INSERT INTO manager_competencies (key, name, category, rubric_1, rubric_3, rubric_5, icon, sort_order)
VALUES 
  ('comunicacion_reportes', 'Comunicación y Reportes', 'marca', 
   'No reporta novedades; avisa tarde o nunca; mensajes confusos sin contexto; hay que perseguirlo.',
   'Comunica lo importante pero a veces incompleto; responde aunque con demora; le falta iniciativa.',
   'Comunica proactivamente con claridad y evidencia; responde rápido; anticipa problemas; propone soluciones.',
   '💬', 1),
   
  ('disponibilidad_predisposicion', 'Disponibilidad y Predisposición', 'marca', 
   'No responde fuera de horario nunca; pone trabas ante urgencias; inflexible; "eso no me corresponde".',
   'Responde cuando puede pero con demora; acepta urgencias sin entusiasmo; disponibilidad limitada.',
   'Responde rápido ante urgencias reales; flexible sin que le pidan; entiende la responsabilidad del rol.',
   '📲', 2),
   
  ('liderazgo_clima', 'Liderazgo y Clima de Equipo', 'marca', 
   'Mal clima; conflictos frecuentes no resueltos; el equipo se queja de él/ella; alta rotación.',
   'Clima aceptable; maneja lo básico; algunos roces sin resolver; el equipo lo respeta a medias.',
   'Equipo motivado y estable; resuelve conflictos; liderazgo sano; baja rotación; el equipo lo sigue.',
   '👥', 3),
   
  ('desarrollo_staff', 'Desarrollo del Staff', 'marca', 
   'No entrena; no hace coachings; la gente "aprende sola"; no da feedback constructivo.',
   'Capacita cuando le sobra tiempo; hace algunos coachings pero sin rutina ni seguimiento.',
   'Tiene rutina de entrenamiento; hace coachings mensuales; da feedback continuo; el equipo crece.',
   '📚', 4),
   
  ('adaptacion_cambios', 'Adaptación a Cambios', 'marca', 
   'Resiste todo cambio; se queja públicamente; demora implementaciones; contagia negatividad al equipo.',
   'Acepta cambios sin entusiasmo; implementa con ayuda; no propone mejoras.',
   'Lidera el cambio; entrena al equipo rápido; sostiene el nuevo estándar; propone mejoras activamente.',
   '🔄', 5),
   
  ('resolucion_autonoma', 'Resolución Autónoma', 'marca', 
   'Escala absolutamente todo; no propone soluciones; espera que otros resuelvan; depende de la marca.',
   'Resuelve problemas típicos; escala lo complejo con contexto; a veces necesita guía.',
   'Resuelve con criterio propio; documenta para que no se repita; casi no necesita escalar.',
   '🔧', 6),
   
  ('compromiso_marca', 'Compromiso con la Marca', 'marca', 
   'Desconectado de la marca; actitud de "empleado"; no cuida imagen ni estándares; le da igual.',
   'Cumple con lo pedido; actitud neutral; hace su trabajo pero sin ir más allá.',
   'Se siente dueño; propone mejoras; cuida la marca como propia; orgullo visible.',
   '💜', 7),
   
  ('actitud_presencia', 'Actitud y Presencia', 'marca', 
   'Actitud negativa visible; sin energía; cara larga; no transmite hospitalidad; el equipo lo nota.',
   'Actitud correcta pero sin brillo; cumple pero no contagia entusiasmo.',
   'Energía positiva; sonrisa genuina; transmite hospitalidad; "la camiseta puesta"; contagia al equipo.',
   '✨', 8);