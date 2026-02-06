
# Plan: Completar Sistema de Visibilidad Jerárquica de Coaching

## Situación Actual

El sistema de coaching tiene implementada la **lógica de quién evalúa a quién** correctamente:
- ✅ Marca (Superadmin/Coordinador) → Evalúa Encargados
- ✅ Encargado → Evalúa Empleados/Cajeros
- ✅ Franquiciado → No puede evaluar (solo observar)

**Lo que falta** son las rutas de navegación y vistas específicas para que cada rol acceda a lo que le corresponde ver.

---

## Funcionalidades a Implementar

### 1. Nuevas Rutas en Mi Marca

**a) `/mimarca/coaching/encargados`** - Coaching a Encargados
- Lista consolidada de todos los encargados de la red
- Filtro por sucursal
- Posibilidad de hacer coaching directo (sin navegar a cada local)
- Solo visible para: Superadmin, Coordinador

**b) `/mimarca/coaching/red`** - Dashboard de Red
- Vista de todos los coachings de empleados hechos por encargados
- Solo lectura (Coordinador no evalúa staff, solo ve)
- Métricas consolidadas: promedio por local, empleados sin evaluar, tendencias
- Visible para: Superadmin, Coordinador, Informes

### 2. Nuevas Vistas en Mi Local (sin rutas nuevas, tabs dentro de Coaching)

**a) Tab "Mi Encargado"** (solo visible para Franquiciado)
- Muestra el coaching del encargado hecho por Marca
- Solo lectura
- Si no hay coaching, muestra "Pendiente de evaluación por Marca"

**b) Tab "Mi Evaluación"** (solo visible para Encargado)
- Muestra su propio coaching recibido de Marca
- Puede confirmar lectura (acknowledgment)
- Ve evolución histórica

### 3. Actualizar Sidebar de Mi Marca

Agregar sección "Coaching" con:
```
└── Coaching
    ├── Encargados (evaluar)
    └── Red (ver dashboard)
```

### 4. Actualizar CoachingPage en Mi Local

Agregar tabs condicionales:
- Tab "Mi Encargado" si rol es `franquiciado`
- Tab "Mi Evaluación" si rol es `encargado`

---

## Cambios Técnicos Detallados

### Archivos a Crear

| Archivo | Descripción |
|---------|-------------|
| `src/pages/admin/CoachingManagersPage.tsx` | Coaching a encargados de toda la red |
| `src/pages/admin/CoachingNetworkPage.tsx` | Dashboard de coachings de empleados (red) |
| `src/components/coaching/MyManagerCoachingTab.tsx` | Vista del coaching del encargado (para Franquiciado) |
| `src/components/coaching/MyOwnCoachingTab.tsx` | Vista del coaching propio (para Encargado) |

### Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/layout/BrandSidebar.tsx` | Agregar sección Coaching con 2 items |
| `src/pages/local/CoachingPage.tsx` | Agregar tabs condicionales según rol |
| `src/App.tsx` | Agregar rutas `/mimarca/coaching/encargados` y `/mimarca/coaching/red` |

### Hooks Necesarios

| Hook | Descripción |
|------|-------------|
| `useNetworkCoachingStats()` | Estadísticas consolidadas de toda la red |
| `useManagersCoachingList()` | Lista de encargados con estado de coaching |
| `useBranchManagerCoaching()` | Coaching del encargado de un local específico |

---

## Flujo de Navegación Resultante

```text
MI MARCA
├── Dashboard
├── Sucursales
│   └── [Sucursal] > Equipo (mantiene coaching inline)
├── Coaching ← NUEVO
│   ├── Encargados → Evaluar encargados de toda la red
│   └── Red → Ver coachings de empleados (solo lectura)
└── ...

MI LOCAL (como Encargado)
├── Dashboard
├── Personal
│   ├── Equipo
│   └── Coaching
│       ├── Tab Equipo (evaluar empleados)
│       ├── Tab Mi Evaluación ← NUEVO
│       ├── Tab Análisis
│       └── Tab Historial

MI LOCAL (como Franquiciado)
├── Dashboard
├── Personal
│   ├── Equipo (solo lectura)
│   └── Coaching
│       ├── Tab Mi Encargado ← NUEVO
│       ├── Tab Empleados (solo lectura)
│       └── Tab Análisis
```

---

## Matriz de Visibilidad Final

| Rol | Ve Coachings de... |
|-----|-------------------|
| Superadmin | Encargados (los que hizo) + Staff de toda la red |
| Coordinador | Encargados (los que hizo) + Staff de toda la red |
| Informes | Solo dashboard de red (lectura) |
| Franquiciado | SU encargado (hecho por marca) + Staff de SU local |
| Encargado | SU evaluación (hecha por marca) + Staff que él evaluó |
| Empleado | Solo SU propia evaluación (en Mi Cuenta) |

---

## Orden de Implementación

1. **Fase 1**: Nuevos tabs en `CoachingPage.tsx` (Mi Local)
   - Tab "Mi Encargado" para Franquiciado
   - Tab "Mi Evaluación" para Encargado
   
2. **Fase 2**: Páginas de Mi Marca
   - `CoachingManagersPage.tsx` - Evaluar encargados
   - `CoachingNetworkPage.tsx` - Dashboard de red
   - Actualizar `BrandSidebar.tsx`
   
3. **Fase 3**: Hooks de soporte
   - Estadísticas consolidadas
   - Queries optimizadas

---

## Consideraciones

- **RLS**: Las políticas existentes deberían cubrir los nuevos casos ya que usan `is_hr_for_branch_v2` y `can_access_branch`
- **Performance**: La vista de red necesitará paginación para escalar
- **Mobile**: Las nuevas páginas seguirán el patrón responsive existente
