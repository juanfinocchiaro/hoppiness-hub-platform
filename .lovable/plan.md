
# Plan: Coaching Específico para Encargados

## Problema Identificado

Actualmente la página **Coaching de Encargados** (`/mimarca/coaching/encargados`) usa el formulario genérico `CoachingForm.tsx` que incluye:

1. **Estaciones de trabajo** (Cocinero, Cajero, Runner, Lavacopas) - **NO CORRESPONDE** para evaluar encargados
2. **Competencias generales** de empleados (Puntualidad, Presentación, etc.)

Un encargado no debe ser evaluado por si sabe hacer hamburguesas o manejar caja. Debe evaluarse su **capacidad de gestión, liderazgo y resultados operativos**.

---

## Solución Propuesta

### 1. Crear Formulario Específico para Encargados

Nuevo componente `CoachingManagerForm.tsx` que:
- **NO muestra** estaciones de trabajo
- **SOLO evalúa** competencias de gestión (usando `manager_competencies`)
- Incluye campos cualitativos (fortalezas, áreas de mejora, plan de acción)

### 2. Limpiar y Reorganizar Competencias de Encargado

Actualmente hay **14 competencias duplicadas** en la tabla `manager_competencies`. 

Propuesta de competencias **estilo McDonald's** (7 categorías claras):

| # | Competencia | Descripción | Referencia |
|---|-------------|-------------|------------|
| 1 | **Liderazgo de Equipo** | Motiva, delega y desarrolla a su personal | Desarrollo de talento |
| 2 | **Gestión del Turno** | Organización de posiciones, descansos y flujo | Control operativo |
| 3 | **Control de Calidad** | Supervisión de estándares de producto y servicio | QSC McDonald's |
| 4 | **Atención de Crisis** | Manejo de quejas, conflictos y situaciones imprevistas | Resolución de problemas |
| 5 | **Cumplimiento Operativo** | Fichajes, cierres de turno, reportes a tiempo | Procedimientos |
| 6 | **Desarrollo del Equipo** | Coachings realizados, entrenamientos, mentoring | Formación |
| 7 | **Comunicación con Marca** | Respuesta a mensajes, reportes, proactividad | Relación franquicia |

### 3. Escala de Evaluación 1-5 (ya implementada)

| Nivel | Nombre | Descripción |
|-------|--------|-------------|
| 1 | Aprendiz | Necesita guía constante en esta área |
| 2 | En Desarrollo | Mejorando, comete errores pero aprende |
| 3 | Competente | Cumple bien, trabaja solo sin problemas |
| 4 | Destacado | Supera lo esperado, muy confiable |
| 5 | Referente | Experto total, puede enseñar y resolver cualquier problema |

---

## Cambios Técnicos

### Archivos a Crear

```text
src/components/coaching/CoachingManagerForm.tsx
  - Formulario específico para encargados
  - Usa CoachingManagerSection (competencias de gestión)
  - NO usa CoachingStationSection
  - Incluye sección de feedback cualitativo
```

### Archivos a Modificar

```text
src/pages/admin/CoachingManagersPage.tsx
  - Reemplazar CoachingForm por CoachingManagerForm
  - Corregir referencia "/4" a "/5" (línea 225)

src/components/coaching/CoachingExpressModal.tsx
  - Detectar si el empleado es encargado
  - Si es encargado: mostrar competencias de gestión
  - Si es staff: mostrar estaciones (comportamiento actual)

src/hooks/useCoachings.ts
  - Agregar soporte para guardar scores de tipo 'manager'
  - Ajustar cálculo de promedio para coachings de encargados

src/components/coaching/index.ts
  - Exportar nuevo CoachingManagerForm
```

### Migración SQL

```sql
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
```

---

## Diagrama del Nuevo Flujo

```text
EVALUACIÓN DE ENCARGADOS (desde Mi Marca)

┌─────────────────────────────────────────────┐
│         CoachingManagersPage.tsx            │
│  (Lista de encargados de toda la red)       │
└─────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────┐
│         CoachingManagerForm.tsx ← NUEVO     │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │ CoachingManagerSection                │  │
│  │ (7 competencias de gestión)           │  │
│  │ - Liderazgo de Equipo        [1-5]   │  │
│  │ - Gestión del Turno          [1-5]   │  │
│  │ - Control de Calidad         [1-5]   │  │
│  │ - Atención de Crisis         [1-5]   │  │
│  │ - Cumplimiento Operativo     [1-5]   │  │
│  │ - Desarrollo del Equipo      [1-5]   │  │
│  │ - Comunicación con Marca     [1-5]   │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │ Feedback Cualitativo                  │  │
│  │ - Fortalezas                          │  │
│  │ - Áreas de Mejora                     │  │
│  │ - Plan de Acción                      │  │
│  │ - Notas Privadas                      │  │
│  └───────────────────────────────────────┘  │
│                                             │
│         [Guardar Coaching]                  │
└─────────────────────────────────────────────┘
```

---

## Impacto

- **Encargados**: Reciben evaluaciones relevantes a su rol de gestión
- **Superadmin/Coordinador**: Puede evaluar encargados con criterios claros
- **Consistencia**: Se mantiene la escala 1-5 ya implementada
- **Claridad**: 7 competencias bien definidas vs 14 duplicadas

---

## Testing Recomendado

1. Verificar que al evaluar un encargado NO aparecen estaciones de trabajo
2. Confirmar que las 7 competencias de gestión se muestran correctamente
3. Probar que el coaching se guarda con tipo 'manager' en `coaching_competency_scores`
4. Verificar que el modal de detalle muestra las competencias de gestión
5. Probar en `/mimarca/coaching/encargados` el flujo completo
