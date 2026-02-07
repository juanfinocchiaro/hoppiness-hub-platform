-- 1) Agregar columnas para rúbricas y categorías
ALTER TABLE public.manager_competencies 
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS rubric_1 TEXT,
ADD COLUMN IF NOT EXISTS rubric_3 TEXT,
ADD COLUMN IF NOT EXISTS rubric_5 TEXT,
ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT '📊';

-- 2) Limpiar competencias anteriores para reemplazar con las 12 nuevas
DELETE FROM public.manager_competencies;

-- 3) Insertar las 12 categorías con rúbricas completas

-- OPERACIÓN DIARIA
INSERT INTO public.manager_competencies (key, name, description, sort_order, is_active, category, icon, rubric_1, rubric_3, rubric_5)
VALUES 
('gestion_turno', 'Gestión del Turno', 'Organización real del turno: picos, roles, tiempos, cierre', 1, true, 'operacion', '⏱️',
 'Desorden: no hay plan, se apagan incendios, roles confusos, tiempos altos.',
 'Correcto: el turno sale "bien" pero con baches y sin método estable.',
 'Profesional: planifica picos, asigna roles, controla tiempos, cierre impecable.'),

('ejecucion_canal', 'Ejecución por Canal', 'Salón/Take/Delivery: tiempos, errores, packaging, coordinación', 2, true, 'operacion', '📦',
 'Errores y demoras frecuentes; delivery sale mal armado o tarde.',
 'Funciona, con fallas en picos.',
 'Consistente en todos los canales, incluso con volumen.'),

('atencion_crisis', 'Atención de Crisis', 'Clientes difíciles, faltantes, cortes, incidentes, imprevistos', 3, true, 'operacion', '🚨',
 'Se bloquea o escala todo; no resuelve.',
 'Resuelve lo típico; algunas demoras.',
 'Resuelve, documenta, aprende y evita repetición.');

-- ESTÁNDAR DE MARCA
INSERT INTO public.manager_competencies (key, name, description, sort_order, is_active, category, icon, rubric_1, rubric_3, rubric_5)
VALUES 
('calidad_producto', 'Calidad del Producto', 'Punto carne, armado, temperatura, presentación estándar Hoppiness', 4, true, 'estandar', '🍔',
 'Producto irregular, errores repetidos, estándar depende de quién cocina.',
 'Calidad aceptable con caídas puntuales.',
 'Estándar consistente, corrige en el momento, equipo alineado.'),

('higiene_bpm', 'Higiene & BPM', 'Limpieza, orden, frío/calor, seguridad alimentaria, contaminación cruzada', 5, true, 'estandar', '🧹',
 'Se ve sucio/desordenado, hay riesgos o incumplimientos.',
 'En general bien, con descuidos puntuales.',
 'Impecable y sostenido, se corrige "antes" de que sea problema.'),

('cumplimiento_operativo', 'Cumplimiento Operativo', 'Checklists, aperturas/cierres, mantenimiento, disciplina, rutina', 6, true, 'estandar', '✅',
 'No hay rutina, se negocia el "cómo se hace".',
 'Cumple lo importante, algunas omisiones.',
 'Rutina fuerte: checklist completo y hábito del equipo.');

-- NEGOCIO Y CONTROL
INSERT INTO public.manager_competencies (key, name, description, sort_order, is_active, category, icon, rubric_1, rubric_3, rubric_5)
VALUES 
('caja_control', 'Caja & Control', 'Arqueos, diferencias, medios de pago, cierres administrativos', 7, true, 'negocio', '💰',
 'Diferencias repetidas, cierres incompletos.',
 'Cierres ok con alguna diferencia aislada.',
 'Control fino, cierres claros, cero sorpresas.'),

('stock_proveedores', 'Stock & Proveedores', 'Previsión, pedidos a tiempo, recepción correcta, rotación, faltantes', 8, true, 'negocio', '📋',
 'Faltantes críticos, pedidos tarde/mal, improvisación.',
 'Abastece con algunos errores.',
 'Previsión y método, casi cero faltantes, recepción prolija.'),

('merma_desperdicio', 'Merma y Desperdicio', 'Control de desperdicio, errores de producción, rotación, vencimientos', 9, true, 'negocio', '🗑️',
 'Se pierde mercadería seguido; vencimientos/errores frecuentes.',
 'Merma normal con algunos picos.',
 'Merma controlada; corrige causas raíz.');

-- PERSONAS Y CULTURA
INSERT INTO public.manager_competencies (key, name, description, sort_order, is_active, category, icon, rubric_1, rubric_3, rubric_5)
VALUES 
('servicio_hospitalidad', 'Servicio & Hospitalidad', 'Actitud, sonrisa, calidez, trato, hospitalidad real', 10, true, 'personas', '😊',
 'Trato frío/duro, no cuida al cliente, reclamos o mala energía.',
 'Correcto: atiende bien pero sin consistencia.',
 'Hospitalidad real: saluda, contiene, resuelve y deja al cliente mejor.'),

('liderazgo_equipo', 'Liderazgo de Equipo', 'Clima, orden, respeto, exigencia sana, manejo de conflictos', 11, true, 'personas', '👥',
 'Mal clima o falta de autoridad; se desordena el equipo.',
 'Lidera lo básico.',
 'Equipo alineado, buen clima, alto estándar sin maltrato.'),

('desarrollo_equipo', 'Desarrollo del Equipo', 'Entrenamiento continuo, onboarding, polivalencia, correcciones', 12, true, 'personas', '📚',
 'La gente aprende "a los golpes".',
 'Capacita cuando puede.',
 'Rutina: entrena, evalúa y mejora al equipo.'),

('adaptacion_cambios', 'Adaptación a Cambios', 'Adopción de cambios (producto, procesos, sistema), velocidad, actitud ante lo nuevo', 13, true, 'personas', '🔄',
 'Resiste cambios, se queja, demora, contagia negatividad.',
 'Implementa con ayuda.',
 'Lidera el cambio, entrena al equipo y sostiene estándar.');