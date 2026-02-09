
# Plan: Jornada Operativa en Dashboard de Mi Local

## Problema Identificado

A las 00:30 del domingo, el dashboard muestra:
- Fecha: "domingo 9 feb" (correcto calendario)
- Turnos: vacíos (incorrecto operativamente)
- Equipo fichado: 0 (incorrecto, hay gente del cierre)
- Sin historial de cierres anteriores

La raíz del problema es que el sistema usa `new Date().toISOString().split('T')[0]` que convierte a UTC, causando un desfase de 3 horas (Argentina es UTC-3).

## Soluccion Propuesta

Implementar el concepto de **Jornada Operativa** ya existente en el editor de horarios, pero aplicado al dashboard de Mi Local.

### Regla de Negocio
- Horas 00:00-04:59 pertenecen a la jornada operativa del DIA ANTERIOR
- A las 00:30 del domingo, el sistema debe mostrar datos del SABADO
- El turno de "Noche" del sabado sigue activo hasta que se cierre

## Cambios Tecnicos

### 1. Crear Utilidad Centralizada

Archivo nuevo: `src/lib/operationalDate.ts`

```text
/**
 * getOperationalDate - Retorna la fecha operativa actual
 * 
 * Regla: Si son las 00:00-04:59, retorna el dia anterior
 * Esto permite que el turno de cierre (Noche/Trasnoche) 
 * permanezca visible hasta que realmente termine
 */
export function getOperationalDate(): Date
export function getOperationalDateString(): string // yyyy-MM-dd
export function isEarlyMorning(): boolean // true si 00:00-04:59
```

### 2. Modificar ManagerDashboard.tsx

**Hook `useCurrentlyWorking`** (linea 50):
- Cambiar: `const today = new Date().toISOString().split('T')[0]`
- Por: `const today = getOperationalDateString()`
- Esto mostrara a las personas que ficharon en el turno de cierre

**Hook `useTodayClosures`** (linea 158):
- Ya usa `useDateClosures(branchId, new Date())`
- Cambiar a usar `getOperationalDate()` para mostrar cierres de la jornada actual

**Header con fecha** (linea 200):
- Mostrar "(cierre)" cuando `isEarlyMorning()` es true
- Ejemplo: "sabado 8 feb (cierre)"

### 3. Modificar useShiftClosures.ts

**Funcion `useTodayClosures`** (linea 58):
- Cambiar: `return useDateClosures(branchId, new Date())`
- Por: `return useDateClosures(branchId, getOperationalDate())`

### 4. Crear Pagina de Historial de Cierres

Archivo nuevo: `src/pages/local/SalesHistoryPage.tsx`

Contenido:
- Selector de rango de fechas (ultimos 7/15/30 dias)
- Tabla con fecha, turno, hamburguesas, vendido, alertas
- Usa el hook existente `useClosuresByDateRange`

### 5. Agregar Link en Dashboard

En `ManagerDashboard.tsx`, debajo de la seccion "Ventas Hoy":
- Agregar boton/link "Ver historial de ventas"
- Navega a `/milocal/:branchId/ventas/historial`

### 6. Agregar Ruta y Navegacion

**App.tsx**: Agregar ruta `/milocal/:branchId/ventas/historial`

**LocalSidebar.tsx**: Considerar si agregar en menu lateral (opcional, el link desde dashboard puede ser suficiente)

## Flujo de Usuario Resultante

A las 00:30 del domingo:
1. Dashboard muestra: "sabado 8 feb (cierre)"
2. Seccion "Ventas Hoy" muestra turnos del sabado (Mediodia, Noche)
3. "Equipo Ahora" muestra personal que ficho el sabado y sigue trabajando
4. Link "Ver historial" permite ver cierres anteriores

A las 05:00 del domingo:
1. Dashboard muestra: "domingo 9 feb"
2. Turnos se resetean al domingo (vacios)
3. El sistema "cambia de dia" operativamente

## Archivos a Crear
- `src/lib/operationalDate.ts` (utilidad centralizada)
- `src/pages/local/SalesHistoryPage.tsx` (historial de cierres)

## Archivos a Modificar
- `src/components/local/ManagerDashboard.tsx` (usar fecha operativa + link historial)
- `src/hooks/useShiftClosures.ts` (usar fecha operativa en useTodayClosures)
- `src/App.tsx` (agregar ruta de historial)

## Principio de Fuente Unica de Verdad
- `getOperationalDate()` es LA funcion que define que dia operativo es
- Todos los componentes que necesiten "hoy" en contexto operativo usan esta funcion
- No hay logica duplicada de zona horaria/jornada dispersa
