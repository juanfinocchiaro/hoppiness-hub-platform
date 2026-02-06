

# Plan: Refactorización Completa del Módulo de Reuniones v2.0

## Resumen del Cambio

El documento v2.0 identifica **problemas críticos** en la implementación actual que requieren una refactorización significativa:

| Problema Actual | Corrección Requerida |
|-----------------|---------------------|
| La reunión se crea y cierra en un solo paso | Separar en 2 fases: CONVOCATORIA + EJECUCIÓN |
| Solo existe estado "closed" | Agregar estados: `convocada`, `en_curso`, `cerrada` |
| Asistencia se marca durante la creación | Asistencia solo durante ejecución (cuando la reunión ocurre) |
| Acuerdos se agregan en la creación | Acuerdos solo durante ejecución |
| Mi Marca no puede crear reuniones de red | Agregar wizard con selector multi-sucursal |
| Solo notifica al cerrar | Notificar al convocar Y al cerrar |
| No se puede editar/cancelar una reunión convocada | Agregar edición y cancelación pre-ejecución |

---

## Fase 1: Cambios en Base de Datos

### 1.1 Modificar tabla `meetings`

```sql
-- Agregar nuevos campos según documento
ALTER TABLE meetings 
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'mi_local';

-- Hacer branch_id nullable para reuniones de red
ALTER TABLE meetings ALTER COLUMN branch_id DROP NOT NULL;

-- Hacer notes nullable (se completa al ejecutar)
ALTER TABLE meetings ALTER COLUMN notes DROP NOT NULL;

-- Migrar datos existentes: date → scheduled_at, closed_at = created_at
UPDATE meetings SET 
  scheduled_at = date,
  closed_at = created_at,
  status = 'cerrada'
WHERE scheduled_at IS NULL;
```

### 1.2 Modificar tabla `meeting_participants`

```sql
-- Agregar campos según documento
ALTER TABLE meeting_participants
  ADD COLUMN IF NOT EXISTS was_present BOOLEAN, -- null = sin tomar, true/false = tomada
  ADD COLUMN IF NOT EXISTS notified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_count INTEGER DEFAULT 0;

-- Migrar attended → was_present
UPDATE meeting_participants SET was_present = attended;
```

---

## Fase 2: Actualizar Tipos TypeScript

### 2.1 `src/types/meeting.ts`

```typescript
// Estados de reunión
export type MeetingStatus = 'convocada' | 'en_curso' | 'cerrada';
export type MeetingSource = 'mi_local' | 'mi_marca';

export interface Meeting {
  id: string;
  title: string;
  scheduled_at: string;         // Fecha/hora programada
  area: MeetingArea;
  branch_id: string | null;     // null = reunión de red
  created_by: string;
  status: MeetingStatus;
  notes: string | null;         // null hasta que se ejecute
  started_at: string | null;    // Cuando inició ejecución
  closed_at: string | null;     // Cuando se cerró
  source: MeetingSource;
  created_at: string;
}

export interface MeetingParticipant {
  id: string;
  meeting_id: string;
  user_id: string;
  was_present: boolean | null;  // null = no tomada, true/false después
  read_at: string | null;
  notified_at: string | null;
  reminder_count: number;
}
```

---

## Fase 3: Nuevo Flujo de UI - Dos Fases

### 3.1 Fase 1: Convocatoria (Crear Reunión)

**Nuevo wizard simplificado de 1 solo paso:**

| Campo | Requerido | Descripción |
|-------|-----------|-------------|
| Título | Sí | Nombre de la reunión |
| Fecha/Hora | Sí | Cuando ocurrirá (futuro o hoy) |
| Área | Sí | Preseleccionar área del creador |
| Participantes | Sí | Lista de personas a convocar |

**Al presionar "Convocar":**
1. Se crea reunión con `status = 'convocada'`
2. Se notifica a todos los participantes (push + in-app)
3. La reunión aparece en lista con badge "Convocada"

### 3.2 Fase 2: Ejecución (Iniciar → Documentar → Cerrar)

**Desde el detalle de una reunión CONVOCADA:**

```text
┌─────────────────────────────────────────────────────────────┐
│ Reunión: Coordinación semanal                               │
│ 📅 Lunes 10 feb, 10:00 • General                           │
│                                                             │
│ Estado: CONVOCADA                                           │
│ Participantes: 5 convocados                                 │
│                                                             │
│ [Editar]  [Cancelar]  [Iniciar Reunión]                    │
└─────────────────────────────────────────────────────────────┘
```

**Al presionar "Iniciar Reunión":**
- Estado cambia a `en_curso`
- Se habilita formulario de ejecución:
  - Tomar asistencia (Presente/Ausente por persona)
  - Escribir notas (obligatorio para cerrar)
  - Agregar acuerdos con asignados (opcional)

**Al presionar "Cerrar y Notificar":**
- Estado cambia a `cerrada`
- Se notifica a TODOS (presentes + ausentes)
- Participantes ven reunión como "Sin leer"

---

## Fase 4: Componentes a Crear/Modificar

### 4.1 Nuevos Componentes

| Componente | Descripción |
|------------|-------------|
| `MeetingConveneModal.tsx` | Modal simple para convocar (1 paso) |
| `MeetingExecutionForm.tsx` | Formulario de ejecución (asistencia + notas + acuerdos) |
| `MeetingDetailConvocada.tsx` | Vista de reunión convocada (para encargado) |
| `MeetingDetailEnCurso.tsx` | Vista de reunión en ejecución |
| `MeetingDetailCerrada.tsx` | Vista de reunión cerrada (ya existe, adaptar) |
| `BrandMeetingConveneModal.tsx` | Modal para convocar desde Mi Marca (multi-sucursal) |

### 4.2 Componentes a Modificar

| Componente | Cambios |
|------------|---------|
| `MeetingWizard.tsx` | Eliminar o refactorizar a solo convocatoria |
| `MeetingDetail.tsx` | Dividir según estado (convocada/en_curso/cerrada) |
| `MeetingCard.tsx` | Mostrar badge de estado (Convocada/En Curso/Cerrada) |
| `MeetingsList.tsx` | Agregar filtro por estado |
| `MeetingsPage.tsx` | Adaptar a nuevo flujo |
| `BrandMeetingsPage.tsx` | Agregar botón "+ Nueva" y wizard de marca |

---

## Fase 5: Hooks a Modificar

### 5.1 `useMeetings.ts`

```typescript
// CREAR
useConveneMeeting()        // Crear reunión en estado CONVOCADA

// EJECUTAR
useStartMeeting()          // Cambiar a EN_CURSO
useUpdateAttendance()      // Marcar asistencia
useSaveNotes()             // Guardar notas
useAddAgreement()          // Agregar acuerdo
useCloseMeeting()          // Cerrar y notificar

// EDITAR/CANCELAR
useUpdateConvokedMeeting() // Editar reunión CONVOCADA
useCancelMeeting()         // Cancelar reunión CONVOCADA

// LEER
useMeetingDetail()         // Con status dinámico
useBranchMeetings()        // Con filtro por estado
useMyMeetings()            // Separar convocadas vs cerradas

// MARCA
useBrandConveneMeeting()   // Crear reunión de red
useAllNetworkMembers()     // Para selector multi-sucursal
```

---

## Fase 6: Vista Consolidada Mi Marca

### 6.1 Mejoras en `BrandMeetingsPage.tsx`

- **Agregar botón "+ Nueva Reunión de Red"**
- **Filtro por estado**: Convocada / En Curso / Cerrada
- **Selector de participantes multi-sucursal** con filtro por rol
- **Badge de origen**: "Red" vs nombre de sucursal

### 6.2 Wizard de Marca

```text
┌─────────────────────────────────────────────────────────────┐
│ Nueva Reunión de Red                                        │
├─────────────────────────────────────────────────────────────┤
│ Título: [___________________________________]               │
│ Fecha: [10/02/2026]  Hora: [10:00]                         │
│ Área: [Operaciones ▼]                                       │
│                                                             │
│ Alcance: [Todas las sucursales ▼]                          │
│                                                             │
│ Participantes:                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Filtrar: [Solo encargados ▼]                            │ │
│ │ [✓] Juan Pérez (General Paz - Encargado)                │ │
│ │ [✓] María García (Nueva Córdoba - Encargado)            │ │
│ │ [✓] Carlos López (Manantiales - Franquiciado)           │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│                              [Cancelar]  [Convocar]         │
└─────────────────────────────────────────────────────────────┘
```

---

## Fase 7: Integración Home del Franquiciado

Las reuniones de red donde el franquiciado es convocado se muestran en su sección de Comunicados (ya existe `MyCommunicationsCard` - usar patrón similar):

- Cuando está convocado: "📅 Reunión: [título] — Convocado — [fecha]"
- Cuando está cerrada: "📅 Reunión: [título] — Confirmar — [fecha]"

---

## Resumen de Archivos

### Nuevos Archivos

| Archivo | Descripción |
|---------|-------------|
| `src/components/meetings/MeetingConveneModal.tsx` | Modal de convocatoria |
| `src/components/meetings/MeetingExecutionForm.tsx` | Formulario de ejecución |
| `src/components/meetings/BrandMeetingConveneModal.tsx` | Modal para reuniones de red |
| `src/components/meetings/MeetingStatusBadge.tsx` | Badge de estado |

### Archivos a Modificar

| Archivo | Cambios |
|---------|--------|
| `supabase/migrations/` | Nueva migración con cambios de schema |
| `src/types/meeting.ts` | Actualizar tipos con nuevos estados y campos |
| `src/hooks/useMeetings.ts` | Nuevas mutaciones para el flujo de 2 fases |
| `src/components/meetings/MeetingDetail.tsx` | Renderizado condicional por estado |
| `src/components/meetings/MeetingCard.tsx` | Badge de estado dinámico |
| `src/components/meetings/MeetingsList.tsx` | Filtro por estado |
| `src/components/meetings/MeetingWizard.tsx` | Simplificar a solo convocatoria |
| `src/pages/local/MeetingsPage.tsx` | Adaptar flujo |
| `src/pages/admin/BrandMeetingsPage.tsx` | Agregar creación + filtros |

### Archivos a Eliminar

| Archivo | Razón |
|---------|-------|
| `src/components/meetings/MeetingWizardStep2.tsx` | Asistencia va en ejecución, no en creación |
| `src/components/meetings/MeetingWizardStep3.tsx` | Acuerdos van en ejecución, no en creación |

---

## Orden de Implementación

| Paso | Tarea | Dependencia |
|------|-------|-------------|
| 1 | Migración SQL (nuevos campos + estados) | - |
| 2 | Actualizar `types/meeting.ts` | Paso 1 |
| 3 | Refactorizar hooks con nuevo flujo | Paso 2 |
| 4 | Crear `MeetingConveneModal` (1 paso) | Paso 3 |
| 5 | Crear `MeetingExecutionForm` | Paso 3 |
| 6 | Refactorizar `MeetingDetail` por estado | Paso 4, 5 |
| 7 | Actualizar `MeetingCard` y `MeetingsList` | Paso 6 |
| 8 | Actualizar `MeetingsPage` | Paso 7 |
| 9 | Crear `BrandMeetingConveneModal` | Paso 4 |
| 10 | Actualizar `BrandMeetingsPage` | Paso 9 |
| 11 | Integrar en Home del Franquiciado | Paso 10 |

