

# Plan: Rediseñar Scorecard de Encargados por Perspectiva del Evaluador

## El Problema

El scorecard actual tiene 12 categorías que mezclan cosas que un **coordinador de marca** puede evaluar (comunicación, liderazgo, adaptación) con cosas que **NO puede ver** (arqueo de caja, punto de carne, limpieza diaria).

Un coordinador trabaja remoto o visita esporádicamente. No puede evaluar:
- Si el punto de la carne sale bien
- Si el arqueo de caja cuadra
- Si la limpieza es consistente
- Si hay merma de producto

---

## Solución: Dividir en 2 Perspectivas

### Perspectiva 1: Coordinador de Marca (remota)

Evalúa lo que SÍ puede ver desde afuera:

| Categoría | Qué evalúa |
|-----------|------------|
| **Comunicación con Marca** | Responde a tiempo, reporta problemas, propone soluciones |
| **Liderazgo de Equipo** | Clima, conflictos, rotación, respeto |
| **Desarrollo del Equipo** | Capacitaciones, coachings a staff, polivalencia |
| **Adaptación a Cambios** | Implementa cambios de menú/procesos sin resistencia |
| **Resolución de Problemas** | Cómo escala crisis, autonomía, seguimiento |
| **Compromiso y Proactividad** | Propuestas, mejoras, actitud general |

### Perspectiva 2: Franquiciado/Presencial (futura)

Evalúa lo que ve en el local:
- Calidad de producto
- Higiene y BPM
- Cumplimiento operativo
- Caja y control
- Stock y proveedores
- Ejecución por canal

---

## Implementación Propuesta

### Fase 1: Actualizar las 12 categorías a 6 categorías "Marca"

Reemplazar las actuales por categorías que un coordinador SÍ puede evaluar:

| # | Nueva Categoría | Rúbrica 1 | Rúbrica 3 | Rúbrica 5 |
|---|-----------------|-----------|-----------|-----------|
| 1 | **Comunicación y Reportes** | No reporta, avisa tarde, mensajes confusos | Comunica lo importante, a veces incompleto | Comunica con claridad, evidencia y propuesta |
| 2 | **Liderazgo y Clima de Equipo** | Mal clima, conflictos frecuentes, alta rotación | Lidera lo básico, algunos roces | Equipo estable, buen clima, liderazgo sano |
| 3 | **Desarrollo del Staff** | No entrena, el equipo no mejora | Capacita cuando puede | Tiene rutina de entrenamiento y feedback |
| 4 | **Adaptación y Mejora Continua** | Resiste cambios, se queja, demora | Implementa con ayuda | Lidera el cambio y lo sostiene |
| 5 | **Resolución Autónoma de Problemas** | Escala todo, no propone soluciones | Resuelve lo típico, escala lo complejo | Resuelve con criterio, documenta, aprende |
| 6 | **Compromiso con la Marca** | Desconectado, actitud negativa | Cumple con lo pedido | Proactivo, propone mejoras, cuida la marca |

### Fase 2: Ajustar la UI

- Cambiar de 4 secciones a una sola lista clara
- Mantener score total sobre 30 (6 x 5)
- Mantener promedio 1-5

### Fase 3: (Futuro) Agregar evaluación presencial

Crear un segundo tipo de coaching para franquiciados que SÍ incluya:
- Calidad de producto
- Operación y limpieza
- Caja y control

---

## Cambios Técnicos

### 1. Migración de Base de Datos

```sql
-- Eliminar las 12 categorías actuales
DELETE FROM manager_competencies;

-- Insertar 6 nuevas categorías "desde perspectiva marca"
INSERT INTO manager_competencies (key, name, category, rubric_1, rubric_3, rubric_5, icon, sort_order)
VALUES 
  ('comunicacion_reportes', 'Comunicación y Reportes', 'marca', 
   'No reporta o avisa tarde; mensajes confusos o incompletos.',
   'Comunica lo importante, aunque a veces incompleto o tardío.',
   'Comunica con claridad, evidencia y propuestas; responde rápido.',
   '💬', 1),
  -- ... (6 categorías total)
```

### 2. Actualizar tipos

```typescript
// src/types/coaching.ts
export type ManagerCompetencyCategory = 'marca'; // Solo una categoría ahora

export const MANAGER_CATEGORY_CONFIG = {
  marca: { label: 'Evaluación desde Marca', icon: '🏢' },
};
```

### 3. Simplificar UI

El `CoachingManagerSection.tsx` ya no agrupa por 4 categorías, solo muestra las 6 en una lista limpia.

---

## Resultado Visual

```text
📊 SCORECARD DE ENCARGADO (Vista Coordinador)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total: 24/30  │  Promedio: 4.0/5

🏢 Evaluación desde Marca

💬 Comunicación y Reportes     [1] [2] [3] [4] [5]  ℹ️
👥 Liderazgo y Clima           [1] [2] [3] [4] [5]  ℹ️
📚 Desarrollo del Staff        [1] [2] [3] [4] [5]  ℹ️
🔄 Adaptación y Mejora         [1] [2] [3] [4] [5]  ℹ️
🔧 Resolución de Problemas     [1] [2] [3] [4] [5]  ℹ️
💜 Compromiso con la Marca     [1] [2] [3] [4] [5]  ℹ️
```

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `manager_competencies` (tabla) | Eliminar 12 categorías, insertar 6 nuevas |
| `src/types/coaching.ts` | Simplificar categorías a solo 'marca' |
| `src/components/coaching/CoachingManagerSection.tsx` | Remover agrupación por 4 categorías |
| `src/components/coaching/ManagerScoreHeader.tsx` | Cambiar máximo de 60 a 30 |

---

## Beneficios

1. **Evalúa solo lo que puede ver**: El coordinador puntúa cosas que realmente observa
2. **Sin falsas expectativas**: No pretende evaluar operación que no ve
3. **Más enfocado**: 6 categorías claras vs 12 mezcladas
4. **Escalable**: Después se puede agregar evaluación presencial para franquiciados

