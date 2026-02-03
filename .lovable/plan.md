
# Plan: Sistema de Posiciones Operativas + Tablero de Permisos + UI Unificada

## Resumen de Decisiones Tomadas

| Decisión | Tu Respuesta |
|----------|--------------|
| Gestión de roles | Mi Marca = permisos de sistema, Mi Local = posiciones operativas |
| Asignación de posición | Por sucursal (Dalma es cajera en NVC, cocinera en VAL) |
| Permisos dinámicos | Básico: activar/desactivar permisos existentes |
| Salario | Solo registro de horas + posición (sin tarifas) |

---

## Parte 1: Análisis de Impacto en Panel de Usuarios

### Situación Actual

El panel `/mimarca/usuarios` usa `user_roles_v2` que tiene:
- `brand_role`: rol de marca (superadmin, coordinador, etc.)
- `local_role`: rol de sistema local (empleado, encargado, etc.)
- `branch_ids`: sucursales asignadas

Con la nueva arquitectura V2 (`user_branch_roles`), los roles locales están por sucursal, pero el panel aún lee de la tabla vieja.

### Problema Detectado

```
ARQUITECTURA ACTUAL (Híbrida)
─────────────────────────────────────────
user_roles_v2          user_branch_roles
┌───────────────┐      ┌─────────────────┐
│ brand_role    │      │ branch_id       │
│ local_role    │ ←→   │ local_role      │ ← Duplicación
│ branch_ids    │      │ clock_pin       │
└───────────────┘      └─────────────────┘
       ↑                       ↑
   Panel Usuarios         Sistema de Permisos
   (lee de aquí)          (usa este)
```

El problema es que tenemos **DOS FUENTES DE VERDAD** para roles locales.

### Solución: Consolidar en `user_branch_roles`

```
ARQUITECTURA NUEVA (Limpia)
─────────────────────────────────────────
user_roles_v2          user_branch_roles
┌───────────────┐      ┌─────────────────────┐
│ brand_role    │      │ branch_id           │
│ (sin local)   │      │ local_role          │ ← Única fuente
│ (sin branch)  │      │ default_position    │ ← NUEVO
└───────────────┘      │ clock_pin           │
       ↑               └─────────────────────┘
   Solo marca                  ↑
                      Panel Usuarios + Permisos
```

---

## Parte 2: Nueva Arquitectura de Datos

### Cambios en Base de Datos

**1. Nuevo enum para posiciones operativas**

```sql
CREATE TYPE work_position_type AS ENUM (
  'cajero',
  'cocinero', 
  'barista',
  'runner',
  'lavacopas'
);
```

**2. Agregar posición por defecto en `user_branch_roles`**

```sql
ALTER TABLE user_branch_roles 
ADD COLUMN default_position work_position_type;
```

Esta columna indica la posición "normal" del empleado en esa sucursal. 
El encargado puede cambiarla día a día en el horario.

**3. Agregar posición en `employee_schedules`**

```sql
ALTER TABLE employee_schedules 
ADD COLUMN work_position work_position_type;
```

Cuando el encargado crea horario, se llena automáticamente con `default_position` pero puede modificarlo.

**4. Nueva tabla para configuración de permisos**

```sql
CREATE TABLE permission_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_key TEXT NOT NULL UNIQUE,
  permission_label TEXT NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('brand', 'local')),
  category TEXT NOT NULL,
  allowed_roles TEXT[] NOT NULL,
  is_editable BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insertar permisos actuales como configuración inicial
INSERT INTO permission_config (permission_key, permission_label, scope, category, allowed_roles) VALUES
('canViewDashboard', 'Ver Dashboard', 'brand', 'Dashboard', ARRAY['superadmin', 'coordinador', 'informes', 'contador_marca']),
('canViewPnL', 'Ver P&L', 'brand', 'Finanzas', ARRAY['superadmin', 'informes', 'contador_marca']),
...
```

**5. Eliminar columnas obsoletas de `user_roles_v2`**

```sql
ALTER TABLE user_roles_v2 
DROP COLUMN local_role,
DROP COLUMN branch_ids;
```

Esta migración requiere que PRIMERO migremos los datos existentes a `user_branch_roles`.

---

## Parte 3: Flujo de Trabajo Optimizado

### Desde Mi Marca (Superadmin)

```
┌──────────────────────────────────────────────────────────────────┐
│ Mi Marca → Usuarios → [Dalma Ledesma]                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ACCESO A MARCA                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ [ ] Sin acceso                                              │ │
│  │ [●] Coordinador  [ ] Informes  [ ] Contador  [ ] Superadmin │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ACCESO A LOCALES                                                │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Sucursal         Rol Sistema      Posición por Defecto      │ │
│  │ ─────────────────────────────────────────────────────────── │ │
│  │ Nueva Córdoba    [Empleado ▼]     [Cajera ▼]     [Quitar]   │ │
│  │ Villa Allende    [Empleado ▼]     [Cocinera ▼]   [Quitar]   │ │
│  │                                                              │ │
│  │ [+ Agregar a otra sucursal]                                  │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│                               [Cancelar] [Guardar]               │
└──────────────────────────────────────────────────────────────────┘
```

**Cambios en UI:**
- Se muestran TODAS las sucursales donde trabaja
- Por cada sucursal: Rol de sistema + Posición operativa por defecto
- Botón para agregar/quitar sucursales

### Desde Mi Local (Encargado)

```
┌──────────────────────────────────────────────────────────────────┐
│ Mi Local → Equipo → [Agregar miembro]                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Buscar: [dalma@email.com____________]                           │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Dalma Ledesma                                               │ │
│  │ dalmalericci@gmail.com                                      │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Rol en Nueva Córdoba: [Empleado ▼]                              │
│  Posición habitual:    [Cajera ▼]                                │
│                                                                  │
│                               [Cancelar] [Agregar]               │
└──────────────────────────────────────────────────────────────────┘
```

### Crear Horario (con posición)

```
┌────────────────────────────────────────────────────────────────────┐
│ Horario de Dalma Ledesma - Febrero 2026                            │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Posición habitual: Cajera (se asigna automáticamente)             │
│                                                                    │
│  Lun 3         Mar 4         Mié 5         Jue 6         Vie 7     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────┐ │
│  │ 19:00    │  │ 19:00    │  │ FRANCO   │  │ 19:00    │  │ 19:00 │ │
│  │ 23:00    │  │ 23:00    │  │          │  │ 23:00    │  │ 23:00 │ │
│  │          │  │          │  │          │  │          │  │       │ │
│  │ [Cajera] │  │[Cocinera]│  │          │  │ [Cajera] │  │[Caja] │ │
│  │  (edit)  │  │  (edit)  │  │          │  │  (edit)  │  │(edit) │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └───────┘ │
│                                                                    │
│  [Aplicar a selección: Turno: Noche ▼  Posición: Cajera ▼]         │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## Parte 4: Impacto en Archivos Existentes

### Archivos a Modificar

| Archivo | Cambio | Prioridad |
|---------|--------|-----------|
| `src/components/admin/users/useUsersData.ts` | Leer de `user_branch_roles` en lugar de `user_roles_v2.local_role` | Alta |
| `src/components/admin/users/UsersTable.tsx` | Mostrar sucursales con rol + posición | Alta |
| `src/components/admin/users/UserRoleModal.tsx` | Rediseñar para manejar múltiples sucursales | Alta |
| `src/components/admin/users/types.ts` | Actualizar interfaces | Alta |
| `src/components/admin/BranchTeamTab.tsx` | Agregar selector de posición por defecto | Media |
| `src/components/hr/CreateScheduleWizard.tsx` | Agregar posición por día/turno | Media |
| `src/hooks/usePermissionsV2.ts` | Leer permisos desde `permission_config` (fallback a hardcoded) | Media |
| `src/pages/local/BranchLayout.tsx` | Unificar footer del sidebar | Baja |

### Archivos a Crear

| Archivo | Descripción |
|---------|-------------|
| `src/pages/admin/PermissionsConfigPage.tsx` | Tablero de permisos configurables |
| `src/hooks/usePermissionConfig.ts` | Hook para leer/escribir config de permisos |
| `src/types/workPosition.ts` | Tipos para posiciones operativas |

---

## Parte 5: Tablero de Permisos (Configuración Básica)

### UI Propuesta

```
┌────────────────────────────────────────────────────────────────────┐
│ Mi Marca → Configuración → Permisos                                │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│ PERMISOS DE MARCA                                                  │
│ ──────────────────────────────────────────────────────────────────│
│                          Super  Coord  Inform  Contad              │
│ Ver Dashboard             ●      ●       ●       ○                 │
│ Ver P&L                   ●      ○       ●       ●                 │
│ Gestionar Productos       ●      ●       ○       ○                 │
│ Crear Locales             ●      ○       ○       ○      (locked)   │
│ Asignar Roles             ●      ○       ○       ○      (locked)   │
│                                                                    │
│ PERMISOS DE SUCURSAL                                               │
│ ──────────────────────────────────────────────────────────────────│
│                          Franq  Encarg  Contad  Cajero  Empl       │
│ Ver Dashboard              ●       ●       ○       ●      ○        │
│ Cargar Ventas              ●       ●       ○       ●      ○        │
│ Ver Equipo                 ●       ●       ○       ○      ○        │
│ Editar Horarios            ●       ●       ○       ○      ○        │
│ Ver Fichajes               ●       ●       ●       ○      ○        │
│ Crear Adelantos            ●       ●       ○       ○      ○        │
│ Ver Adelantos              ●       ●       ●       ○      ○        │
│ Crear Apercibimientos      ●       ●       ○       ○      ○        │
│                                                                    │
│ ● = Habilitado   ○ = Deshabilitado                                 │
│ (locked) = No editable por seguridad                               │
│                                                                    │
│                                              [Guardar Cambios]     │
└────────────────────────────────────────────────────────────────────┘
```

---

## Parte 6: Orden de Implementación

```
FASE 1: Migraciones de Base de Datos
├── 1.1 Crear enum work_position_type
├── 1.2 Agregar default_position a user_branch_roles
├── 1.3 Agregar work_position a employee_schedules
├── 1.4 Crear tabla permission_config con datos iniciales
└── 1.5 (Opcional) Limpiar user_roles_v2 de campos redundantes

FASE 2: Refactor Panel de Usuarios
├── 2.1 Actualizar useUsersData para consolidar datos
├── 2.2 Actualizar UsersTable para mostrar múltiples sucursales
├── 2.3 Rediseñar UserRoleModal con gestión de sucursales + posiciones
└── 2.4 Actualizar types.ts

FASE 3: Integración de Posiciones en Mi Local
├── 3.1 Modificar BranchTeamTab para agregar posición por defecto
├── 3.2 Modificar CreateScheduleWizard para asignar posición por día
└── 3.3 Mostrar posición en calendario de horarios

FASE 4: Tablero de Permisos
├── 4.1 Crear PermissionsConfigPage
├── 4.2 Crear usePermissionConfig hook
└── 4.3 Modificar usePermissionsV2 para leer de DB (con fallback)

FASE 5: UI Unificada
└── 5.1 Refactorizar BranchLayout footer
```

---

## Parte 7: Resumen de Horas en Reportes

Como mencionaste que solo te interesa registro de horas + función (no tarifas), el sistema de reportes mostrará:

```
┌────────────────────────────────────────────────────────────────────┐
│ Resumen de Horas - Dalma Ledesma - Febrero 2026                    │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│ NUEVA CÓRDOBA                                                      │
│ ─────────────────────────────────────────────────────────────────  │
│ Posición       Días Trabajados    Horas Totales                    │
│ ─────────────────────────────────────────────────────────────────  │
│ Cajera              12               48h                           │
│ Cocinera             4               16h                           │
│ ─────────────────────────────────────────────────────────────────  │
│ TOTAL               16               64h                           │
│                                                                    │
│ VILLA ALLENDE                                                      │
│ ─────────────────────────────────────────────────────────────────  │
│ Posición       Días Trabajados    Horas Totales                    │
│ ─────────────────────────────────────────────────────────────────  │
│ Cocinera             8               32h                           │
│ ─────────────────────────────────────────────────────────────────  │
│ TOTAL                8               32h                           │
│                                                                    │
│ TOTAL GENERAL       24               96h                           │
└────────────────────────────────────────────────────────────────────┘
```

---

## Consideraciones de Seguridad

1. **RLS para permission_config**: Solo superadmin puede modificar
2. **Permisos locked**: Ciertos permisos críticos (crear sucursales, asignar roles) no son editables
3. **Validación**: La posición asignada debe existir en el enum
4. **Fallback**: Si permission_config está vacía, usar permisos hardcodeados actuales
