
# Plan de Mejoras para el Sistema de Coaching

## Diagnóstico del Estado Actual

Tras analizar los archivos del sistema, identifico **6 áreas de mejora** que optimizarían significativamente la experiencia de uso del módulo de coaching.

---

## 1. Panel de Resumen para el Empleado (Mi Cuenta)

**Problema**: El card `MyCoachingsCard` en Mi Cuenta es muy básico. Solo muestra si hay pendientes y el último score, sin contexto de evolución.

**Mejora Propuesta**: Enriquecer la vista del empleado con:
- Mini gráfico de evolución (últimos 6 meses)
- Comparación con promedio del equipo
- Insignias de logro por mejoras consecutivas
- Acceso directo al detalle completo de su último coaching

**Impacto**: Los empleados entienden mejor su progreso y se motivan con feedback visual.

---

## 2. Vista Comparativa en Mi Local

**Problema**: El encargado ve empleados individualmente pero no tiene una vista comparativa rápida del desempeño general del equipo.

**Mejora Propuesta**: Agregar un tab "Análisis" en CoachingPage con:
- Ranking de empleados por score promedio
- Matriz de competencias débiles vs fuertes del equipo
- Identificación de "campeones" por estación (quién tiene mejor score en cada área)
- Alertas de empleados con tendencia negativa

**Impacto**: Permite decisiones informadas sobre entrenamiento y asignación de turnos.

---

## 3. Recordatorios y Seguimiento Automático

**Problema**: No hay sistema de notificación cuando:
- Se acerca fin de mes y faltan coachings por hacer
- Un empleado no confirma su coaching después de X días
- El plan de acción del mes anterior debería revisarse

**Mejora Propuesta**: 
- Badge con contador en sidebar cuando hay pendientes
- Alerta en Dashboard de Mi Local con "Faltan X coachings"
- Notificación visual en fila de empleado si no confirmó en 5+ días

**Impacto**: Asegura que el proceso de coaching se complete consistentemente.

---

## 4. Plantillas y Sugerencias Inteligentes

**Problema**: El formulario de coaching parte de cero cada vez. El encargado escribe fortalezas, áreas de mejora y plan de acción manualmente.

**Mejora Propuesta**:
- Sugerencias de texto basadas en scores (ej: si score < 2 en atención, sugerir "Mejorar comunicación con clientes")
- Plantillas de planes de acción reutilizables
- Autocompletado con frases comunes usadas anteriormente

**Impacto**: Reduce tiempo de evaluación y mejora consistencia del feedback.

---

## 5. Modo Rápido de Evaluación

**Problema**: El formulario actual requiere expandir secciones, hacer scroll extenso. Para locales con muchos empleados es tedioso.

**Mejora Propuesta**: 
- Modal de "Coaching Express" con solo puntuaciones numéricas
- Opción de copiar estructura del mes anterior como base
- Guardar como borrador para completar después

**Impacto**: Reduce fricción para encargados ocupados.

---

## 6. Exportación y Reportes

**Problema**: No hay manera de exportar datos de coaching para análisis externo o archivo.

**Mejora Propuesta**:
- Botón "Exportar Historial" en CSV/PDF
- Reporte mensual consolidado por sucursal
- Gráfico de evolución exportable para reuniones

**Impacto**: Facilita auditorías y presentaciones a franquiciados.

---

## Priorización Sugerida

| Prioridad | Mejora | Esfuerzo | Impacto |
|-----------|--------|----------|---------|
| 🔴 Alta | Recordatorios y alertas de pendientes | Bajo | Alto |
| 🔴 Alta | Vista comparativa del equipo | Medio | Alto |
| 🟡 Media | Panel mejorado en Mi Cuenta | Bajo | Medio |
| 🟡 Media | Modo rápido de evaluación | Medio | Medio |
| 🟢 Baja | Plantillas y sugerencias | Alto | Medio |
| 🟢 Baja | Exportación y reportes | Medio | Bajo |

---

## Próximos Pasos

Elegí cuál(es) de estas mejoras querés implementar primero y las desarrollo en detalle con plan técnico específico.

También puedo combinar varias mejoras en un solo desarrollo si tienen sentido juntas (por ejemplo: "Recordatorios" + "Vista comparativa" forman un dashboard de coaching más completo).

