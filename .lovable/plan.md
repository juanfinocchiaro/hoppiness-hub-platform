
# Plan Maestro de Implementación: Coaching + Horarios

## Análisis Comparativo: Documentos vs Implementación Actual

### COACHING - Estado Actual vs Propuesta

| Requisito del Documento | Estado Actual | Gap |
|-------------------------|---------------|-----|
| Marca → Evalúa Encargados | ✅ `CoachingManagersPage.tsx` implementado | - |
| Encargado → Evalúa Empleados | ✅ `CoachingPage.tsx` implementado | - |
| Franquiciado → Solo observa | ✅ Tabs condicionales implementados | - |
| Vista "Red" consolidada | ✅ `CoachingNetworkPage.tsx` implementado | - |
| Tab "Mi Encargado" (Franquiciado) | ✅ `MyManagerCoachingTab.tsx` implementado | - |
| Tab "Mi Evaluación" (Encargado) | ✅ `MyOwnCoachingTab.tsx` implementado | - |
| Competencias diferenciadas para Encargados | ⚠️ Existe `manager_competencies` pero NO SE USA en el form | Falta integrar |
| Tipo de coaching (`brand_to_manager` vs `manager_to_employee`) | ❌ No existe en BD | Falta columna |

### HORARIOS - Estado Actual vs Propuesta

| Requisito del Documento | Estado Actual | Gap |
|-------------------------|---------------|-----|
| Feriados globales en Mi Marca | ❌ Están en Mi Local (`SchedulesPage.tsx` Tab Feriados) | Mover a Mi Marca |
| Vista anual de feriados | ❌ Solo muestra mes actual + siguiente | Crear nueva página |
| Importar feriados Argentina (año completo) | ⚠️ Existe pero solo año actual | Mejorar UX |
| Separar Solicitudes de Horarios | ❌ Es un Tab dentro de `SchedulesPage.tsx` | Nueva ruta |
| Franquiciado = Solo lectura | ⚠️ Parcial (mismo componente) | Agregar banner |
| Mini-toolbar con horarios frecuentes | ❌ Usa popover separado | Rediseñar UI |
| Drag & Drop para copiar celdas | ❌ No existe | Nueva funcionalidad |
| Shift+Click multi-selección | ✅ Ya implementado | - |
| Estado Borrador vs Publicado | ❌ No existe | Nueva lógica |
| Resumen mensual (horas/días/francos) | ⚠️ Existe vista Cobertura | Mejorar |

---

## FASE 1: Coaching - Competencias Diferenciadas

### 1.1 Verificar/Crear tabla `manager_competencies`

La tabla ya existe según `useStationCompetencies.ts` pero debe poblarse con datos:

```sql
-- Competencias para evaluar ENCARGADOS (hechas por Marca)
INSERT INTO manager_competencies (key, name, description, sort_order, is_active) VALUES
  ('leadership_team', 'Gestión del equipo', 'Liderazgo, delegación, motivación', 1, true),
  ('coaching_compliance', 'Cumplimiento de coachings', '% de empleados evaluados mensualmente', 2, true),
  ('operations', 'Gestión operativa', 'Cierres, turnos, stock', 3, true),
  ('customer_service', 'Atención a clientes', 'Resolución de conflictos y quejas', 4, true),
  ('brand_standards', 'Estándares de marca', 'Cumplimiento de imagen y procesos', 5, true),
  ('communication', 'Comunicación con marca', 'Reportes, respuesta, proactividad', 6, true);
```

### 1.2 Crear sección `CoachingManagerSection.tsx`

Nuevo componente para evaluar encargados con competencias específicas:

```
src/components/coaching/CoachingManagerSection.tsx
```

- Mostrar competencias de `manager_competencies` en lugar de estaciones
- Usar escala 1-4 igual que empleados
- Agregar campos específicos: "Coachings realizados este mes", "Evolución del equipo"

### 1.3 Modificar `CoachingForm.tsx`

Detectar si el evaluado es Encargado para mostrar sección diferente:

```typescript
// Agregar prop isManager
interface CoachingFormProps {
  employee: Employee;
  branchId: string;
  isManager?: boolean; // NUEVO
  onSuccess?: () => void;
}
```

Si `isManager=true`:
- Ocultar `CoachingStationSection`
- Mostrar `CoachingManagerSection`

### 1.4 Agregar columna `coaching_type` a tabla `coachings`

```sql
-- Agregar tipo de coaching
ALTER TABLE coachings 
ADD COLUMN IF NOT EXISTS coaching_type TEXT 
CHECK (coaching_type IN ('brand_to_manager', 'manager_to_employee'))
DEFAULT 'manager_to_employee';

-- Index para filtrar
CREATE INDEX IF NOT EXISTS idx_coachings_type ON coachings(coaching_type);
```

### 1.5 Actualizar hooks de coaching

- `useCoachings.ts`: Filtrar por tipo según contexto
- `useManagersCoachingList.ts`: Usar `coaching_type = 'brand_to_manager'`
- `useNetworkCoachingStats.ts`: Solo contar `manager_to_employee`

---

## FASE 2: Horarios - Reorganizar Navegación

### 2.1 Mover Feriados a Mi Marca

**Nueva página**: `/mimarca/configuracion/calendario`

```
src/pages/admin/LaborCalendarPage.tsx
```

Contenido:
- Vista anual (12 meses en grid)
- Selector de año
- Importar feriados Argentina (todo el año)
- Lista de próximos feriados
- CRUD individual

**Modificar `BrandSidebar.tsx`**:

```typescript
// En sección Configuración
<NavItemButton 
  to="/mimarca/configuracion/calendario" 
  icon={CalendarDays} 
  label="Calendario Laboral" 
/>
```

**Modificar `App.tsx`**: Agregar ruta `/mimarca/configuracion/calendario`

### 2.2 Separar Solicitudes en su propia página

**Nueva ruta**: `/milocal/:branchId/tiempo/solicitudes`

```
src/pages/local/RequestsPage.tsx
```

Mover `PendingScheduleRequests` y agregar:
- Tabs: Pendientes / Aprobadas / Rechazadas / Todas
- Filtro por tipo (día libre, cambio turno, justificativo)
- Historial con fechas de respuesta

**Modificar `LocalSidebar.tsx`**:

```typescript
// En sección Tiempo
<NavItemButton 
  to={`${basePath}/tiempo/solicitudes`} 
  icon={ClipboardList} 
  label="Solicitudes" 
/>
```

### 2.3 Simplificar `SchedulesPage.tsx`

Eliminar tabs, dejar solo:
- Navegador de mes (ya existe)
- Grilla de horarios (`InlineScheduleEditor`)
- Resumen mensual (nuevo card)

### 2.4 Banner "Solo Lectura" para Franquiciado

En `InlineScheduleEditor.tsx`, agregar al inicio:

```tsx
{!canManageSchedules && (
  <Alert variant="info" className="mb-4">
    <Eye className="h-4 w-4" />
    <AlertTitle>Modo lectura</AlertTitle>
    <AlertDescription>
      Estás viendo los horarios en modo lectura. Solo el encargado puede modificarlos.
    </AlertDescription>
  </Alert>
)}
```

Deshabilitar interacciones de celdas cuando `!canManageSchedules`.

---

## FASE 3: Horarios - Mejorar Edición (Encargado)

### 3.1 Rediseñar sistema de selección con Mini-Toolbar

**Componente nuevo**: `ScheduleSelectionToolbar.tsx`

Reemplazar el popover actual por una barra flotante que aparece al seleccionar celdas:

```
┌────────────────────────────────────────────────┐
│ 3 celdas │ F │ 12-20 │ 14-22 │ 18-23 │ + │ Copiar │ Pegar │ Limpiar │
└────────────────────────────────────────────────┘
```

- Botones de horarios frecuentes (F = Franco)
- Horarios más usados como chips clickeables
- Botón "+" para horario personalizado (abre mini-modal)

### 3.2 Horarios frecuentes

Crear constante con horarios más comunes:

```typescript
const FREQUENT_SCHEDULES = [
  { label: '12-20', start: '12:00', end: '20:00' },
  { label: '14-22', start: '14:00', end: '22:00' },
  { label: '18-23', start: '18:00', end: '23:00' },
  { label: '19-00', start: '19:00', end: '00:00' },
];
```

Click en chip = aplica a todas las celdas seleccionadas.

### 3.3 Drag & Drop para copiar

Usar `@dnd-kit` (ya instalado) para:
- Arrastrar una celda con horario a otra celda
- Copiar el horario automáticamente
- Visual feedback durante drag

### 3.4 Acciones rápidas de semana

Agregar botones en header del editor:

```tsx
<Button variant="outline" size="sm">
  <Copy className="w-4 h-4 mr-2" />
  Copiar semana anterior
</Button>

<Button variant="outline" size="sm">
  <Repeat className="w-4 h-4 mr-2" />
  Repetir patrón
</Button>
```

Modal de confirmación con preview de cambios.

---

## FASE 4: Calendario Laboral Centralizado

### 4.1 Nueva página `LaborCalendarPage.tsx`

```
src/pages/admin/LaborCalendarPage.tsx
```

Layout:
```
┌─────────────────────────────────────────────────────────┐
│ Calendario Laboral 2026              [Importar AR] [+] │
├─────────────────────────────────────────────────────────┤
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                        │
│ │ ENE │ │ FEB │ │ MAR │ │ ABR │  ...                   │
│ │ 1   │ │ 12  │ │ 24  │ │ 2   │                        │
│ └─────┘ └─────┘ └─────┘ └─────┘                        │
│                                                         │
│ Próximos feriados:                                      │
│ • 12 Feb - Carnaval (Jue)                              │
│ • 13 Feb - Carnaval (Vie)                              │
│ • 24 Mar - Día de la Memoria (Mar)                     │
└─────────────────────────────────────────────────────────┘
```

### 4.2 Mejorar `getArgentinaHolidays()`

Retornar TODOS los feriados del año, no solo los actuales.

### 4.3 Eliminar `HolidaysManager` de `SchedulesPage`

Ya no será necesario en Mi Local.

---

## Resumen de Archivos

### Archivos a Crear

| Archivo | Descripción |
|---------|-------------|
| `src/components/coaching/CoachingManagerSection.tsx` | Sección de competencias para encargados |
| `src/pages/admin/LaborCalendarPage.tsx` | Calendario laboral anual |
| `src/pages/local/RequestsPage.tsx` | Solicitudes separadas |
| `src/components/hr/ScheduleSelectionToolbar.tsx` | Nueva toolbar inline |
| `src/components/hr/ScheduleQuickActions.tsx` | Acciones de copiar semana |

### Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/coaching/CoachingForm.tsx` | Prop `isManager`, lógica condicional |
| `src/pages/admin/CoachingManagersPage.tsx` | Pasar `isManager=true` |
| `src/components/layout/BrandSidebar.tsx` | Agregar "Calendario Laboral" |
| `src/components/layout/LocalSidebar.tsx` | Agregar "Solicitudes" |
| `src/pages/local/SchedulesPage.tsx` | Quitar tabs, simplificar |
| `src/components/hr/InlineScheduleEditor.tsx` | Banner solo lectura, nueva toolbar |
| `src/App.tsx` | Nuevas rutas |

### Migraciones SQL

```sql
-- 1. Tipo de coaching
ALTER TABLE coachings ADD COLUMN IF NOT EXISTS coaching_type TEXT 
  CHECK (coaching_type IN ('brand_to_manager', 'manager_to_employee'))
  DEFAULT 'manager_to_employee';

-- 2. Poblar competencias de encargado
INSERT INTO manager_competencies (key, name, description, sort_order, is_active) 
VALUES 
  ('leadership_team', 'Gestión del equipo', 'Liderazgo, delegación, motivación', 1, true),
  ('coaching_compliance', 'Cumplimiento de coachings', '% de empleados evaluados mensualmente', 2, true),
  ('operations', 'Gestión operativa', 'Cierres, turnos, stock', 3, true),
  ('customer_service', 'Atención a clientes', 'Resolución de conflictos y quejas', 4, true),
  ('brand_standards', 'Estándares de marca', 'Cumplimiento de imagen y procesos', 5, true),
  ('communication', 'Comunicación con marca', 'Reportes, respuesta, proactividad', 6, true)
ON CONFLICT DO NOTHING;
```

---

## Orden de Implementación Sugerido

1. **Migración SQL** - Agregar `coaching_type` y poblar `manager_competencies`
2. **Coaching: Competencias de Encargado** - `CoachingManagerSection` + modificar `CoachingForm`
3. **Calendario Laboral** - Nueva página en Mi Marca
4. **Separar Solicitudes** - Nueva ruta en Mi Local
5. **Simplificar Horarios** - Quitar tabs, agregar banner lectura
6. **Mini-Toolbar** - Rediseñar edición de celdas
7. **Acciones Rápidas** - Copiar semana, repetir patrón
8. **Drag & Drop** - Copiar celdas arrastrando

---

## Consideraciones Técnicas

- **RLS**: Las políticas existentes cubren los nuevos casos
- **Performance**: La vista anual de calendario carga 12 meses (pocas filas)
- **Mobile**: Mantener diseño responsive existente
- **Permisos**: Reutilizar `usePermissionsV2` para todo
