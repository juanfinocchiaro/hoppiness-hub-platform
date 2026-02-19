
# Plan: Sincronizacion automatica de ventas POS al RDO

## Contexto del problema

El RDO obtiene las ventas del periodo desde la tabla `ventas_mensuales_local`, que se carga manualmente. Los locales con POS registran ventas en `pedidos` + `pedido_pagos`, pero esos datos nunca llegan a `ventas_mensuales_local` ni al RDO.

## Estrategia

Agregar un campo `fuente` a `ventas_mensuales_local` para saber si el registro es manual o viene del POS. Luego, en el frontend, cuando un local tiene POS habilitado, calcular las ventas en tiempo real desde `pedidos`/`pedido_pagos` y mostrarlas en el RDO sin depender de la carga manual. Los periodos historicos (cargados antes de tener POS) se mantienen intactos.

## Cambios

### 1. Base de datos: Agregar campo `fuente` a `ventas_mensuales_local`

```sql
ALTER TABLE ventas_mensuales_local 
  ADD COLUMN fuente text NOT NULL DEFAULT 'manual';
-- Valores posibles: 'manual', 'pos'
```

Esto permite que convivan registros manuales historicos con futuros registros del POS en la misma tabla.

### 2. Nuevo hook: `usePosVentasAgregadas`

Archivo: `src/hooks/usePosVentasAgregadas.ts`

Agrega las ventas desde `pedidos` + `pedido_pagos` para un branch y periodo:

- Consulta todos los `pedidos` del periodo (estado completado/entregado) con sus `pedido_pagos`
- Calcula:
  - `venta_total`: suma de `pedidos.total`
  - `efectivo`: suma de `pedido_pagos` donde `metodo = 'efectivo'`
  - `fc_total` (online): venta_total - efectivo
  - `ft_total` (efectivo): efectivo
- Solo se activa cuando `posEnabled = true`

### 3. Modificar `useVentasData` en `RdoDashboard.tsx`

Cambiar el hook interno `useVentasData` para que sea inteligente:

- Recibe `posEnabled` como parametro
- Si `posEnabled = true`: usa `usePosVentasAgregadas` para obtener los datos en tiempo real
- Si `posEnabled = false`: lee de `ventas_mensuales_local` como hasta ahora
- En ambos casos, devuelve la misma estructura `{ fc, ft, total }`

### 4. Modificar `get_rdo_report` (funcion DB)

La funcion SQL `get_rdo_report` tambien lee de `ventas_mensuales_local` para calcular porcentajes. Hay dos opciones:

**Opcion elegida**: No modificar la funcion SQL. En cambio, pasar las ventas como contexto en el frontend. Los porcentajes ya se calculan en el frontend con `totalVentas`, asi que el unico uso de ventas en la funcion es para el campo `percentage` de cada linea. Si `ventas_mensuales_local` esta vacio, `percentage` sera 0 y el frontend recalcula con el total correcto.

Esto funciona porque el RdoDashboard ya usa `totalVentas` (del hook) para todos los calculos visuales, no los `percentage` de la funcion.

### 5. Modificar `RdoDashboard.tsx`

- Importar `usePosEnabled`
- Pasar `posEnabled` al hook de ventas
- Mostrar un badge/indicador que diga "Fuente: POS" o "Fuente: Carga manual" para que el usuario sepa de donde vienen los datos
- Si POS esta habilitado pero no hay ventas del periodo, mostrar el total en $0 sin pedir carga manual

### 6. Modificar pagina `VentasMensualesLocalPage.tsx`

- Si POS esta habilitado, mostrar los datos agregados del POS como solo lectura (ya tiene el `Alert` de "POS habilitado")
- Mantener visible el historial de periodos anteriores (que pueden ser manuales)

### 7. Actualizar `CargadorRdoUnificado`

Ya tiene bloqueo cuando POS esta habilitado, no requiere cambios.

---

## Archivos a crear

| Archivo | Descripcion |
|---|---|
| `src/hooks/usePosVentasAgregadas.ts` | Hook que agrega ventas del POS por periodo |

## Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/components/rdo/RdoDashboard.tsx` | Usar datos POS cuando esta habilitado, badge de fuente |
| `src/pages/local/VentasMensualesLocalPage.tsx` | Mostrar datos POS como solo lectura si esta habilitado |

## Migracion SQL

| Cambio | SQL |
|---|---|
| Campo fuente | `ALTER TABLE ventas_mensuales_local ADD COLUMN fuente text NOT NULL DEFAULT 'manual'` |

## Flujo resultante

```text
Local CON POS habilitado:
  pedidos + pedido_pagos --> usePosVentasAgregadas --> RdoDashboard (tiempo real)
  
Local SIN POS:
  ventas_mensuales_local (carga manual) --> useVentasData --> RdoDashboard

Historico mixto:
  Periodos antes del POS: datos manuales en ventas_mensuales_local (fuente='manual')
  Periodos con POS: datos calculados en tiempo real desde pedidos
```
