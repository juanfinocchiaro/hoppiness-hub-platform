

# Plan de Implementación: Módulo de Reuniones

## Resumen del Módulo

El módulo de Reuniones permite a encargados y gerentes registrar reuniones de equipo, controlar asistencia, documentar acuerdos y asegurar que toda la información llegue a cada empleado (haya asistido o no). Incluye confirmación de lectura obligatoria y seguimiento por encargados.

---

## Fase 1: Modelo de Datos y CRUD Básico

### 1.1 Tablas a Crear

```text
┌──────────────────────────────────────────────────────────────────┐
│                         meetings                                  │
├──────────────────────────────────────────────────────────────────┤
│ id (UUID PK)                                                      │
│ title (TEXT NOT NULL)                                             │
│ date (TIMESTAMPTZ NOT NULL)                                       │
│ area (TEXT NOT NULL) - "general", "cocina", "salon", etc.        │
│ branch_id (UUID FK branches)                                      │
│ created_by (UUID FK auth.users)                                   │
│ status (TEXT DEFAULT 'closed')                                    │
│ notes (TEXT NOT NULL)                                             │
│ created_at (TIMESTAMPTZ DEFAULT now())                            │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                    meeting_participants                           │
├──────────────────────────────────────────────────────────────────┤
│ id (UUID PK)                                                      │
│ meeting_id (UUID FK meetings)                                     │
│ user_id (UUID FK auth.users)                                      │
│ attended (BOOLEAN NOT NULL)                                       │
│ read_at (TIMESTAMPTZ NULL) - cuándo confirmó lectura             │
│ created_at (TIMESTAMPTZ DEFAULT now())                            │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                     meeting_agreements                            │
├──────────────────────────────────────────────────────────────────┤
│ id (UUID PK)                                                      │
│ meeting_id (UUID FK meetings)                                     │
│ description (TEXT NOT NULL)                                       │
│ created_at (TIMESTAMPTZ DEFAULT now())                            │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                   meeting_agreement_assignees                     │
├──────────────────────────────────────────────────────────────────┤
│ id (UUID PK)                                                      │
│ agreement_id (UUID FK meeting_agreements)                         │
│ user_id (UUID FK auth.users)                                      │
└──────────────────────────────────────────────────────────────────┘
```

### 1.2 RLS Policies

| Tabla | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| meetings | Participantes + Encargados/Franquiciados del local | Solo encargados/gerentes | Solo creador | Solo creador |
| meeting_participants | Participante propio + Encargados | Solo encargados | read_at por el propio user | No permitido |
| meeting_agreements | Igual que meetings | Solo encargados | No permitido | Solo creador |
| meeting_agreement_assignees | Igual que meetings | Solo encargados | No permitido | Solo creador |

---

## Fase 2: Componentes de UI

### 2.1 Estructura de Archivos

```text
src/
├── pages/local/
│   └── MeetingsPage.tsx           # Página principal lista + detalle
│
├── components/meetings/
│   ├── MeetingsList.tsx           # Lista de reuniones con filtros
│   ├── MeetingCard.tsx            # Card de reunión en la lista
│   ├── MeetingDetail.tsx          # Vista detalle de reunión
│   ├── MeetingWizard.tsx          # Modal wizard de 3 pasos
│   ├── MeetingWizardStep1.tsx     # Info básica + participantes
│   ├── MeetingWizardStep2.tsx     # Asistencia + notas
│   ├── MeetingWizardStep3.tsx     # Acuerdos
│   ├── MeetingReadTracker.tsx     # Panel de seguimiento lectura
│   ├── MeetingPendingCard.tsx     # Card para dashboard
│   └── index.ts
│
├── hooks/
│   └── useMeetings.ts             # CRUD + queries de reuniones
│
└── types/
    └── meeting.ts                 # Tipos TypeScript
```

### 2.2 Flujo de Creación (Wizard)

```text
┌─────────────────────────────────────────────────────────────────┐
│ Paso 1: Información Básica                                       │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Título: [________________________]                          │ │
│ │ Fecha: [06/02/2026]  Hora: [14:30]                         │ │
│ │ Área: [General ▼]                                           │ │
│ │                                                             │ │
│ │ Participantes:                                              │ │
│ │ [✓] Juan Pérez        [✓] María García                     │ │
│ │ [✓] Carlos López      [ ] Ana Rodríguez                    │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                    [Cancelar] [Siguiente →]      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Paso 2: Asistencia y Notas                                       │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Asistencia:                                                 │ │
│ │ Juan Pérez       [✓ Presente] [○ Ausente]                  │ │
│ │ María García     [○ Presente] [✓ Ausente]                  │ │
│ │ Carlos López     [✓ Presente] [○ Ausente]                  │ │
│ │                                                             │ │
│ │ Notas de la reunión: *                                      │ │
│ │ ┌─────────────────────────────────────────────────────────┐ │ │
│ │ │ Se discutieron los siguientes temas...                  │ │ │
│ │ │ 1. Nuevo protocolo de limpieza                          │ │ │
│ │ │ 2. Cambios en horarios de cierre                        │ │ │
│ │ └─────────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                               [← Anterior] [Siguiente →]         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Paso 3: Acuerdos                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Acuerdo 1:                                                  │ │
│ │ [Implementar nuevo protocolo de limpieza desde el lunes]   │ │
│ │ Asignados: [Juan] [María] [Carlos]                [✕]      │ │
│ │                                                             │ │
│ │ Acuerdo 2:                                                  │ │
│ │ [Revisar inventario semanal]                               │ │
│ │ Asignados: [Carlos]                               [✕]      │ │
│ │                                                             │ │
│ │ [+ Agregar acuerdo]                                         │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                    [← Anterior] [Cerrar y notificar a todos]     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Fase 3: Integración con Sistema Existente

### 3.1 Sidebar de Mi Local

Agregar "Reuniones" dentro de la sección **Personal**:

```tsx
// LocalSidebar.tsx - Dentro de NavSectionGroup "Personal"
{canViewTeam && (
  <NavItemButton to={`${basePath}/equipo`} icon={Users} label="Equipo" exact />
)}
{canViewCoaching && (
  <NavItemButton to={`${basePath}/equipo/coaching`} icon={ClipboardList} label="Coaching" />
)}
{canViewTeam && (
  <NavItemButton to={`${basePath}/equipo/reuniones`} icon={Calendar} label="Reuniones" />
)}
```

### 3.2 Dashboard de Mi Local

Nueva card similar a `CoachingPendingCard`:

```tsx
// MeetingsPendingCard.tsx
<Card>
  <CardHeader>
    <CardTitle>Reuniones</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Última reunión: hace 3 días</p>
    <p className="text-amber-600">2 pendientes de lectura</p>
    <Button>Ver reuniones</Button>
  </CardContent>
</Card>
```

Nueva línea en card "Pendientes":

```tsx
// En ManagerDashboard.tsx, sección Pendientes
<Link to={`/milocal/${branch.id}/equipo/reuniones`}>
  <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
    <div className="flex items-center gap-3">
      <Calendar className="w-4 h-4 text-muted-foreground" />
      <span className="text-sm">Reuniones sin leer</span>
    </div>
    <Badge variant={pending?.unreadMeetings ? 'destructive' : 'secondary'}>
      {pending?.unreadMeetings || 0}
    </Badge>
  </div>
</Link>
```

### 3.3 Portal del Empleado (Mi Cuenta)

Nueva card `MyMeetingsCard.tsx` similar a `MyCommunicationsCard`:

```tsx
// En CuentaDashboard.tsx
<MyMeetingsCard />  // Muestra reuniones pendientes de confirmar
```

---

## Fase 4: Permisos

### 4.1 Nuevos Permisos en usePermissionsV2

```typescript
local: {
  // ... permisos existentes
  canCreateMeetings: hasCurrentBranchAccess && (isSuperadmin || isEncargado),
  canViewMeetings: hasCurrentBranchAccess && (isSuperadmin || isEncargado || isFranquiciado || isEmpleado || isCajero),
  canTrackMeetingReads: hasCurrentBranchAccess && (isSuperadmin || isEncargado),
}
```

---

## Fase 5: Hooks de Datos

### 5.1 useMeetings.ts

```typescript
// Funciones principales
useBranchMeetings(branchId)      // Lista de reuniones del local
useMyMeetings()                  // Reuniones donde soy participante
useMeetingDetail(meetingId)      // Detalle completo con acuerdos
useUnreadMeetingsCount(branchId) // Contador para badges

// Mutaciones
useCreateMeeting()               // Wizard completo
useMarkMeetingAsRead()           // Botón "Visto"
useResendNotification()          // Reenviar a participante
```

---

## Resumen de Archivos a Crear/Modificar

### Archivos Nuevos

| Archivo | Descripción |
|---------|-------------|
| `src/types/meeting.ts` | Tipos TypeScript |
| `src/hooks/useMeetings.ts` | CRUD y queries |
| `src/pages/local/MeetingsPage.tsx` | Página principal |
| `src/components/meetings/MeetingsList.tsx` | Lista con filtros |
| `src/components/meetings/MeetingCard.tsx` | Card de reunión |
| `src/components/meetings/MeetingDetail.tsx` | Vista detalle |
| `src/components/meetings/MeetingWizard.tsx` | Modal wizard |
| `src/components/meetings/MeetingWizardStep1.tsx` | Paso 1 |
| `src/components/meetings/MeetingWizardStep2.tsx` | Paso 2 |
| `src/components/meetings/MeetingWizardStep3.tsx` | Paso 3 |
| `src/components/meetings/MeetingReadTracker.tsx` | Seguimiento |
| `src/components/meetings/MeetingPendingCard.tsx` | Card dashboard |
| `src/components/cuenta/MyMeetingsCard.tsx` | Card Mi Cuenta |

### Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/hooks/usePermissionsV2.ts` | Agregar permisos de reuniones |
| `src/components/layout/LocalSidebar.tsx` | Agregar item Reuniones |
| `src/pages/local/BranchLayout.tsx` | Nueva ruta `/equipo/reuniones` |
| `src/components/local/ManagerDashboard.tsx` | Card + línea en Pendientes |
| `src/pages/cuenta/CuentaDashboard.tsx` | Agregar `MyMeetingsCard` |
| `src/App.tsx` | Nueva ruta |

### Migraciones SQL

1. Crear tabla `meetings`
2. Crear tabla `meeting_participants`
3. Crear tabla `meeting_agreements`
4. Crear tabla `meeting_agreement_assignees`
5. Configurar RLS policies
6. Habilitar realtime (opcional para actualizaciones en vivo)

---

## Orden de Implementación Sugerido

| Paso | Tarea | Dependencias |
|------|-------|--------------|
| 1 | Crear migraciones SQL (4 tablas + RLS) | Ninguna |
| 2 | Crear tipos TypeScript | Paso 1 |
| 3 | Crear hook `useMeetings.ts` | Paso 2 |
| 4 | Crear componentes del Wizard | Paso 3 |
| 5 | Crear `MeetingsPage.tsx` + lista/detalle | Paso 4 |
| 6 | Integrar en sidebar y rutas | Paso 5 |
| 7 | Agregar cards en dashboards | Paso 6 |
| 8 | Agregar `MyMeetingsCard` en Mi Cuenta | Paso 6 |
| 9 | Probar flujo completo | Todo anterior |

