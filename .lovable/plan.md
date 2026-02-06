
# Plan: Sistema de Visibilidad Jerárquica de Coaching - COMPLETADO ✅

## Resumen de Implementación

Se implementó el sistema completo de visibilidad jerárquica de coaching según la matriz definida.

---

## ✅ Funcionalidades Implementadas

### 1. Nuevas Rutas en Mi Marca

**a) `/mimarca/coaching/encargados`** - CoachingManagersPage.tsx
- Lista consolidada de todos los encargados de la red
- Filtro por sucursal  
- Posibilidad de hacer coaching directo (sin navegar a cada local)
- Solo visible para: Superadmin, Coordinador

**b) `/mimarca/coaching/red`** - CoachingNetworkPage.tsx
- Vista de todos los coachings de empleados hechos por encargados
- Solo lectura (Coordinador no evalúa staff, solo ve)
- Métricas consolidadas: promedio por local, empleados sin evaluar, tendencias
- Gráficos de tendencia y comparativa por sucursal
- Top/Low performers
- Visible para: Superadmin, Coordinador, Informes

### 2. Nuevos Tabs en Mi Local (CoachingPage.tsx)

**a) Tab "Mi Encargado"** (solo visible para Franquiciado)
- Muestra el coaching del encargado hecho por Marca
- Solo lectura con gráfico de evolución
- Si no hay coaching, muestra "Pendiente de evaluación por Marca"

**b) Tab "Mi Evaluación"** (solo visible para Encargado)
- Muestra su propio coaching recibido de Marca
- Permite confirmar lectura (acknowledgment) con comentarios
- Ve evolución histórica y detalles completos

### 3. Sidebar de Mi Marca Actualizado

Nueva sección "Coaching" con:
```
└── Coaching
    ├── Encargados (evaluar)
    └── Red (ver dashboard)
```

---

## Archivos Creados

| Archivo | Descripción |
|---------|-------------|
| `src/pages/admin/CoachingManagersPage.tsx` | Coaching a encargados de toda la red |
| `src/pages/admin/CoachingNetworkPage.tsx` | Dashboard de coachings de empleados (red) |
| `src/components/coaching/MyManagerCoachingTab.tsx` | Vista del coaching del encargado (para Franquiciado) |
| `src/components/coaching/MyOwnCoachingTab.tsx` | Vista del coaching propio (para Encargado) |
| `src/hooks/useManagersCoachingList.ts` | Lista de encargados con estado de coaching |
| `src/hooks/useNetworkCoachingStats.ts` | Estadísticas consolidadas de toda la red |
| `src/components/ui/progress.tsx` | Componente Progress para barras de progreso |

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `src/components/layout/BrandSidebar.tsx` | Agregada sección Coaching con 2 items |
| `src/pages/local/CoachingPage.tsx` | Tabs condicionales según rol |
| `src/App.tsx` | Nuevas rutas de coaching |
| `src/components/coaching/index.ts` | Exportaciones de nuevos componentes |

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

## Flujo de Navegación Final

```text
MI MARCA
├── Dashboard
├── Sucursales
│   └── [Sucursal] > Equipo (mantiene coaching inline)
├── Coaching ← IMPLEMENTADO
│   ├── Encargados → Evaluar encargados de toda la red
│   └── Red → Ver coachings de empleados (solo lectura)
├── Personas
├── Comunicación
└── Configuración

MI LOCAL (como Encargado)
├── Dashboard
├── Equipo
└── Coaching
    ├── Tab Mi Evaluación ← IMPLEMENTADO
    ├── Tab Equipo (evaluar empleados)
    ├── Tab Análisis
    ├── Tab Certificaciones
    └── Tab Historial

MI LOCAL (como Franquiciado)
├── Dashboard
├── Equipo (solo lectura)
└── Coaching
    ├── Tab Mi Encargado ← IMPLEMENTADO
    ├── Tab Empleados (solo lectura)
    ├── Tab Análisis
    ├── Tab Certificaciones
    └── Tab Historial
```
