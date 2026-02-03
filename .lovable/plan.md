

# Plan de Implementación: Sistema de Coaching y Desarrollo de Equipo

## Resumen Ejecutivo

Este proyecto implementa un **sistema completo de coaching y certificaciones** para Hoppiness Club, permitiendo:

- Certificar empleados en 4 estaciones de trabajo (Cocinero, Cajero, Runner, Lavacopas)
- Realizar evaluaciones mensuales estructuradas por encargados/franquiciados
- Mostrar matriz de certificaciones del equipo
- Integrar ayuda contextual en todas las páginas

El proyecto se divide en **4 fases** que se implementarán secuencialmente.

---

## FASE 1: Base de Datos

### 1.1 Actualizar tipos de posición de trabajo

**Archivo:** `src/types/workPosition.ts`

Remover `barista` del tipo ya que las 4 estaciones reales son: Cocinero, Cajero, Runner, Lavacopas.

### 1.2 Crear tablas del sistema de coaching

Se crearán las siguientes tablas mediante migración SQL:

| Tabla | Propósito |
|-------|-----------|
| `work_stations` | Catálogo de estaciones (cocinero, cajero, runner, lavacopas) |
| `station_competencies` | 5 competencias por cada estación |
| `general_competencies` | 10 competencias generales con pesos |
| `manager_competencies` | 8 competencias para evaluar encargados |
| `employee_certifications` | Nivel de certificación por empleado/estación (0-3) |
| `coachings` | Registro de cada coaching mensual |
| `coaching_station_scores` | Scores por estación en cada coaching |
| `coaching_competency_scores` | Puntuación individual por competencia |

### 1.3 Funciones de seguridad

Crear funciones `SECURITY DEFINER`:
- `can_manage_coaching(user_id, branch_id)` - Verificar si puede gestionar coaching
- `can_view_coaching(user_id, coaching_id)` - Verificar si puede ver un coaching

### 1.4 Políticas RLS

- Tablas de catálogo (estaciones, competencias): Lectura pública autenticada
- Certificaciones: Ver propias + manager ve todas del local
- Coachings: Ver propios + manager ve todos del local

### 1.5 Datos iniciales

Insertar automáticamente:
- 4 estaciones con iconos
- 20 competencias de estación (5 por cada estación)
- 10 competencias generales con pesos oficiales
- 8 competencias de encargado

---

## FASE 2: Hooks y Servicios

### 2.1 Nuevos hooks a crear

| Hook | Archivo | Propósito |
|------|---------|-----------|
| `useCoachings` | `src/hooks/useCoachings.ts` | CRUD de coachings, listados, filtros |
| `useCertifications` | `src/hooks/useCertifications.ts` | CRUD de certificaciones por empleado |
| `useCoachingStats` | `src/hooks/useCoachingStats.ts` | Estadísticas: pendientes, completados |
| `useStationCompetencies` | `src/hooks/useStationCompetencies.ts` | Obtener competencias por estación |

### 2.2 Nuevos tipos TypeScript

**Archivo:** `src/types/coaching.ts`

```text
- CertificationLevel (0 | 1 | 2 | 3)
- WorkStation
- StationCompetency
- GeneralCompetency
- EmployeeCertification
- Coaching
- CoachingStationScore
- CoachingCompetencyScore
```

---

## FASE 3: Componentes UI de Coaching

### 3.1 Nuevos componentes

| Componente | Ubicación | Descripción |
|------------|-----------|-------------|
| `CertificationBadge` | `src/components/coaching/` | Badge visual con nivel (negro, amarillo, verde, azul) |
| `CertificationMatrix` | `src/components/coaching/` | Matriz visual de certificaciones del equipo |
| `CoachingForm` | `src/components/coaching/` | Formulario completo de coaching |
| `CoachingStationSection` | `src/components/coaching/` | Sección de evaluación por estación |
| `CoachingGeneralSection` | `src/components/coaching/` | Sección de competencias generales |
| `CoachingHistory` | `src/components/coaching/` | Historial de coachings de un empleado |
| `CoachingPendingCard` | `src/components/coaching/` | Card de coachings pendientes |
| `MyCoachingsCard` | `src/components/cuenta/` | Card para Mi Cuenta del empleado |

### 3.2 Modificaciones a componentes existentes

| Componente | Cambio |
|------------|--------|
| `TeamPage.tsx` | Agregar tab "Coaching" junto a Personal y Horas |
| `EmployeeExpandedRow.tsx` | Agregar badges de certificación y botón "Ver Coaching" |
| `ManagerDashboard.tsx` | Agregar card de coachings pendientes del mes |
| `CuentaDashboard.tsx` | Agregar `MyCoachingsCard` |

### 3.3 Nueva página de coaching

**Archivo:** `src/pages/local/CoachingPage.tsx`

- Lista de empleados con indicador de coaching del mes
- Botón "Hacer Coaching" para cada empleado sin coaching
- Vista de matriz de certificaciones
- Historial de coachings anteriores

### 3.4 Nueva ruta

Agregar en `App.tsx`:
```text
/milocal/:branchId/equipo/coaching → CoachingPage
```

### 3.5 Niveles de certificación (visual)

| Nivel | Nombre | Significado | Color |
|-------|--------|-------------|-------|
| 0 | Sin entrenar | No puede trabajar en esa estación | Negro |
| 1 | En entrenamiento | Puede con supervisión | Amarillo |
| 2 | Certificado | Puede trabajar solo | Verde |
| 3 | Experto | Puede entrenar a otros | Azul |

---

## FASE 4: Sistema de Ayuda Contextual

### 4.1 Estado actual

La infraestructura ya existe pero **no está siendo usada**:
- `helpConfig.ts` - Configuraciones parciales
- `useContextualHelp.ts` - Hook funcional
- `PageHelp.tsx` - Componente listo

### 4.2 Completar configuraciones

Actualizar `src/lib/helpConfig.ts` con configuraciones para:

**Mi Local:**
- local-dashboard, local-team, local-coaching (NUEVO), local-schedules
- local-clockins, local-advances, local-warnings, local-regulations
- local-communications, local-shift-config

**Mi Marca:**
- brand-dashboard, brand-branch-detail (NUEVO), brand-users
- brand-central-team, brand-communications, brand-regulations
- brand-closure-config, brand-contact-messages, brand-permissions

**Mi Cuenta:**
- cuenta-dashboard, cuenta-profile, cuenta-coachings (NUEVO)

### 4.3 Integrar en cada página

Agregar al inicio de cada página:
```text
import { PageHelp } from '@/components/ui/PageHelp';

<PageHelp pageId="[ID_DE_LA_PAGINA]" />
```

### 4.4 Agregar campos a profiles

Verificar/agregar columnas:
- `help_dismissed_pages TEXT[] DEFAULT '{}'`
- `show_floating_help BOOLEAN DEFAULT true`

---

## Archivos a Crear

| Archivo | Fase |
|---------|------|
| `src/types/coaching.ts` | 1 |
| `src/hooks/useCoachings.ts` | 2 |
| `src/hooks/useCertifications.ts` | 2 |
| `src/hooks/useCoachingStats.ts` | 2 |
| `src/hooks/useStationCompetencies.ts` | 2 |
| `src/components/coaching/CertificationBadge.tsx` | 3 |
| `src/components/coaching/CertificationMatrix.tsx` | 3 |
| `src/components/coaching/CoachingForm.tsx` | 3 |
| `src/components/coaching/CoachingStationSection.tsx` | 3 |
| `src/components/coaching/CoachingGeneralSection.tsx` | 3 |
| `src/components/coaching/CoachingHistory.tsx` | 3 |
| `src/components/coaching/CoachingPendingCard.tsx` | 3 |
| `src/components/coaching/index.ts` | 3 |
| `src/components/cuenta/MyCoachingsCard.tsx` | 3 |
| `src/pages/local/CoachingPage.tsx` | 3 |

## Archivos a Modificar

| Archivo | Fase | Cambio |
|---------|------|--------|
| `src/types/workPosition.ts` | 1 | Remover 'barista' |
| `src/lib/helpConfig.ts` | 4 | Completar todas las configuraciones |
| `src/pages/local/TeamPage.tsx` | 3 | Agregar tab Coaching |
| `src/components/local/team/EmployeeExpandedRow.tsx` | 3 | Agregar badges + botón coaching |
| `src/components/local/ManagerDashboard.tsx` | 3 | Agregar card pendientes |
| `src/pages/cuenta/CuentaDashboard.tsx` | 3 | Agregar MyCoachingsCard |
| `src/App.tsx` | 3 | Agregar ruta /coaching |
| 20+ páginas | 4 | Integrar `<PageHelp />` |

---

## Flujo de Coaching

```text
ENCARGADO                          EMPLEADO
    |                                   |
    |  1. Abre CoachingPage             |
    |                                   |
    |  2. Selecciona empleado           |
    |                                   |
    |  3. Completa formulario:          |
    |     - Estaciones trabajadas       |
    |     - Competencias (1-4)          |
    |     - Notas cualitativas          |
    |     - Cambios de nivel            |
    |                                   |
    |  4. Guarda coaching               |
    |                                   |
    |---------------------------------->|
    |                                   |  5. Ve coaching en Mi Cuenta
    |                                   |
    |                                   |  6. Confirma lectura
    |<----------------------------------|
    |                                   |
    |  7. Ve confirmación               |
```

---

## Tiempo Estimado

| Fase | Descripción | Tiempo |
|------|-------------|--------|
| 1 | Base de datos y tipos | 1-2 días |
| 2 | Hooks y servicios | 1-2 días |
| 3 | UI de Coaching | 3-4 días |
| 4 | Sistema de Ayuda | 1 día |
| **Total** | | **6-9 días** |

---

## Recomendación de Implementación

1. **Aprobar este plan**
2. **Implementar Fase 1** - Base de datos (aprobar migración)
3. **Verificar** que las tablas y datos se crearon correctamente
4. **Implementar Fase 2** - Hooks
5. **Implementar Fase 3** - UI (más extensa, puede dividirse)
6. **Implementar Fase 4** - Ayuda contextual
7. **Testear** flujo completo end-to-end

---

## Próximo Paso

¿Deseas que comience con la **Fase 1: Base de Datos**?

Esto incluirá:
- Actualizar `workPosition.ts` (remover barista)
- Crear migración SQL con todas las tablas
- Insertar datos iniciales de estaciones y competencias
- Crear funciones y políticas RLS

