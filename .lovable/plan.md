
# Plan: Sistema de Seguimiento de Coachings

## Situacion Actual

El sistema actual de coaching tiene estas limitaciones:
- **CoachingPage** solo muestra el mes actual y permite hacer evaluaciones
- **CoachingHistory** existe pero solo se usa en Mi Cuenta (vista empleado) 
- No hay forma de ver el detalle completo de un coaching pasado
- No hay visualizacion de evolucion/tendencias a lo largo del tiempo
- El **action_plan** (plan de accion) se guarda pero no hay seguimiento de si se cumplio
- No hay comparativa entre empleados o periodos

## Solucion Propuesta

Agregar una nueva pestana **Historial** en la pagina de Coaching que permita:

1. Ver todos los coachings anteriores por empleado
2. Visualizar evolucion de scores con grafico de lineas
3. Ver detalle completo de cualquier coaching pasado
4. Revisar planes de accion anteriores y su cumplimiento

```text
+----------------------------------------------------------+
|                    COACHING DEL EQUIPO                    |
|----------------------------------------------------------|
| [Equipo]  [Certificaciones]  [Historial] <-- NUEVA TAB   |
+----------------------------------------------------------+
```

## Nuevos Componentes

### 1. CoachingDetailModal
Modal para ver el detalle completo de un coaching pasado.

| Seccion | Contenido |
|---------|-----------|
| Header | Empleado, fecha, score, evaluador, estado confirmacion |
| Scores | Desglose por estacion y competencias generales |
| Feedback | Fortalezas, Areas de mejora, Plan de accion |
| Confirmacion | Fecha de lectura, notas del empleado |

### 2. EmployeeCoachingCard
Tarjeta expandible por empleado mostrando:
- Score promedio historico
- Tendencia (subiendo/bajando/estable)
- Lista de coachings con acceso al detalle
- Grafico de evolucion

```text
+-----------------------------------------------------------+
| [Avatar] Juan Perez         Promedio: 3.2/4  [Trend Up]   |
|-----------------------------------------------------------|
| [Grafico de lineas: Ene 2.8 - Feb 3.0 - Mar 3.2 - ...]   |
|-----------------------------------------------------------|
| Feb 2026  | 3.2/4 | Por: Dalma        | [Ver Detalle]    |
| Ene 2026  | 3.0/4 | Por: Dalma        | [Ver Detalle]    |
| Dic 2025  | 2.8/4 | Por: Coordinador  | [Ver Detalle]    |
+-----------------------------------------------------------+
```

### 3. CoachingHistoryTab
Nueva pestana en CoachingPage con:
- Filtros por empleado y rango de fechas
- Lista de empleados con sus historiales individuales
- Estadisticas agregadas del equipo

## Modificaciones a Archivos Existentes

### hooks/useCoachings.ts
Nuevo hook `useCoachingHistory` para obtener historiales completos con paginacion.

### hooks/useCoachingStats.ts
El hook `useEmployeeScoreHistory` ya existe pero no se usa. Integrarlo en la nueva vista.

### pages/local/CoachingPage.tsx
Agregar tercera pestana "Historial" al TabsList existente.

### types/coaching.ts
Agregar interface para tendencias y estadisticas historicas.

## Flujo de Seguimiento de Action Plan

Para el seguimiento del plan de accion del mes anterior:

1. Al crear un nuevo coaching, mostrar el `action_plan` del coaching anterior (si existe)
2. Agregar campo opcional "Seguimiento del plan anterior" en el formulario
3. Guardar en un nuevo campo `previous_action_review`

Esto requiere:
- Migracion DB: agregar columna `previous_action_review TEXT` a tabla `coachings`
- Modificar CoachingForm para mostrar el plan anterior

## Archivos a Crear

| Archivo | Descripcion |
|---------|-------------|
| `src/components/coaching/CoachingDetailModal.tsx` | Modal con detalle completo del coaching |
| `src/components/coaching/EmployeeCoachingCard.tsx` | Card expandible con historial del empleado |
| `src/components/coaching/CoachingHistoryTab.tsx` | Nueva pestana con vista historica |
| `src/components/coaching/ScoreEvolutionChart.tsx` | Grafico de evolucion usando Recharts |

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/pages/local/CoachingPage.tsx` | Agregar tab "Historial" |
| `src/hooks/useCoachings.ts` | Agregar hook para historial paginado |
| `src/components/coaching/CoachingForm.tsx` | Mostrar plan anterior si existe |
| `src/components/coaching/index.ts` | Exportar nuevos componentes |

## Migracion de Base de Datos

```sql
ALTER TABLE coachings 
ADD COLUMN previous_action_review TEXT;

COMMENT ON COLUMN coachings.previous_action_review IS 
'Revision del cumplimiento del plan de accion del mes anterior';
```

## Resultado Esperado

| Funcionalidad | Antes | Despues |
|---------------|-------|---------|
| Ver coachings pasados | Solo mes actual | Historial completo |
| Evolucion del empleado | No disponible | Grafico + tendencia |
| Detalle de coaching | Solo score basico | Desglose completo |
| Seguimiento action plan | No existe | Review en siguiente coaching |
| Comparativa temporal | No disponible | Visual con graficos |

## Consideraciones de UI/UX

- Usar el mismo estilo visual que el resto del sistema
- El grafico de evolucion usa Recharts (ya instalado)
- Cards expandibles para no sobrecargar la vista inicial
- Colores consistentes: verde=positivo, rojo=negativo, amarillo=neutral
