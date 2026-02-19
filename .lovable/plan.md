

# Rediseno Completo del Sistema de Stock

Este plan implementa la guia GUIA_REDISENO_STOCK_HOPPINESS.md al 100%, reescribiendo la pantalla de Stock y creando la infraestructura necesaria.

---

## Parte 1: Base de Datos

### 1.1 Nueva tabla `stock_conteos`

Almacena conteos fisicos completos como documentos historicos.

| Campo | Tipo | Descripcion |
|---|---|---|
| id | uuid PK | |
| branch_id | uuid FK branches | |
| fecha | date NOT NULL | Fecha del conteo |
| periodo | text | "2026-02" (opcional) |
| nota_general | text | "Conteo mensual febrero" |
| resumen | jsonb | Total insumos, con/sin diferencia, valor diferencias |
| status | text DEFAULT 'borrador' | 'borrador', 'confirmado' |
| created_by | uuid | Usuario que hizo el conteo |
| confirmed_at | timestamptz | Cuando se confirmo |
| created_at | timestamptz | |

### 1.2 Nueva tabla `stock_conteo_items`

Items individuales de cada conteo.

| Campo | Tipo | Descripcion |
|---|---|---|
| id | uuid PK | |
| conteo_id | uuid FK stock_conteos | |
| insumo_id | uuid FK insumos | |
| stock_teorico | numeric | Lo que decia el sistema |
| stock_real | numeric NULL | Lo que conto el encargado |
| diferencia | numeric | real - teorico |
| costo_unitario | numeric | Costo al momento del conteo |
| valor_diferencia | numeric | diferencia * costo |

### 1.3 Agregar campos a `stock_actual`

```sql
ALTER TABLE stock_actual ADD COLUMN IF NOT EXISTS stock_minimo_local numeric;
ALTER TABLE stock_actual ADD COLUMN IF NOT EXISTS stock_critico_local numeric;
```

Esto permite personalizar min/crit por local (separado del default de marca que ya existe en `stock_minimo`/`stock_critico`).

### 1.4 Agregar campo `nota` a `stock_movimientos`

```sql
ALTER TABLE stock_movimientos ADD COLUMN IF NOT EXISTS nota text;
```

### 1.5 RLS

Todas las tablas nuevas con politicas via `has_branch_access_v2` o `is_superadmin`.

---

## Parte 2: Hook `useStock` (reescritura)

El hook actual solo lee `stock_actual`. Se reescribe completamente:

### 2.1 `useStockCompleto(branchId)`

Query principal que:
1. Lee todos los insumos activos de la marca (no solo los que estan en `stock_actual`)
2. Hace LEFT JOIN con `stock_actual` para traer cantidades existentes
3. Trae el ultimo movimiento de cada insumo (para columna "Ultimo movimiento")
4. Calcula estado (OK / Bajo / Critico / Sin stock) en el frontend

Retorna array con: `{ insumo_id, nombre, unidad, categoria, cantidad, stock_minimo, stock_critico, estado, ultimo_movimiento }` para TODOS los insumos, incluso los que tienen cantidad 0 o no existen en `stock_actual`.

### 2.2 `useStockInicialMasivo(branchId)`

Mutation que recibe un array de `{ insumo_id, cantidad }` y hace upsert masivo en `stock_actual`, registrando movimientos tipo `stock_inicial`.

### 2.3 `useAjusteInline(branchId)`

Mutation para ajustar un insumo individual con motivo y nota.

### 2.4 `useStockMovimientos(branchId, insumoId)`

Query para el historial de movimientos de un insumo especifico (para la fila expandible).

### 2.5 `useStockConteo(branchId)`

CRUD completo para conteos fisicos: crear borrador, guardar progreso, confirmar (ajusta stock de todos los insumos).

### 2.6 `useStockResumen(branchId)`

Query ligera que retorna solo los contadores: total insumos, OK, bajos, criticos, sin stock. Para la barra de resumen y la card del dashboard.

---

## Parte 3: StockPage.tsx (reescritura completa)

### 3.1 Deteccion de estado

La pagina detecta automaticamente en que estado esta:

- **Estado 1 (Stock inicial)**: No hay registros en `stock_actual` para este branch, o todos estan en 0 y no hay movimientos
- **Estado 2 (Operacion diaria)**: Hay stock cargado (estado habitual)
- **Estado 3 (Conteo fisico)**: Se activa al presionar boton "Conteo fisico"

### 3.2 Estado 1: Carga inicial inline

- Banner informativo: "Tu local tiene X insumos configurados. Carga las cantidades iniciales."
- Tabla completa con TODOS los insumos, cantidad editable inline (inputs numericos en la tabla)
- Tab para saltar entre campos
- Boton "Guardar stock inicial" que hace save masivo
- Transiciona a Estado 2 al guardar

### 3.3 Estado 2: Operacion diaria

**Barra superior:**
- Busqueda por nombre
- Filtro por estado (Todos / Critico / Bajo / OK / Sin stock)
- Filtro por categoria de insumo
- Boton "Exportar Excel"
- Boton "Conteo fisico"

**Barra de resumen:**
- Cards: X insumos | Y OK | Z Bajo | W Critico | V Sin stock

**Tabla principal:**
- Ordenada por defecto: criticos primero, luego bajos, luego OK
- Columnas: Insumo, Unidad, Stock, Min, Crit, Estado, Ultimo movimiento
- Click en celda de Stock: abre Popover inline (no modal) con:
  - Stock actual (readonly)
  - Nuevo stock (input)
  - Motivo (radio: Conteo fisico, Merma/rotura, Recepcion, Otro)
  - Nota opcional
  - Cancelar / Guardar
- Click en celda de Min/Crit: abre Popover para editar umbrales
- Indicadores visuales de estado con iconos y colores
- Fila expandible (accordion) con historial de ultimos 5 movimientos al click

### 3.4 Estado 3: Conteo fisico

- Vista comparativa: Teorico vs Real con diferencia automatica
- Todos los insumos con campo "Real" editable
- Calculo de diferencia y % en tiempo real
- Colores: verde sin diferencia, amarillo <10%, rojo >10%
- Resumen: insumos contados, con/sin diferencia, valor total diferencias
- Nota general editable
- Boton "Guardar progreso" (borrador)
- Boton "Confirmar conteo y ajustar stock" (final)
- Al confirmar: ajusta stock_actual, registra movimientos tipo conteo_fisico, guarda conteo completo

### 3.5 Mobile

- Tabla simplificada: solo Insumo + Stock + Estado
- Popovers se convierten en bottom sheets (Drawer de Vaul)
- Conteo fisico como lista vertical con inputs grandes
- Barra progreso "15 de 25 contados"

---

## Parte 4: Componentes nuevos

| Archivo | Descripcion |
|---|---|
| `src/components/stock/StockResumenBar.tsx` | Barra de resumen con contadores por estado |
| `src/components/stock/StockTable.tsx` | Tabla principal con ordenamiento, filtros, expandible |
| `src/components/stock/StockAjustePopover.tsx` | Popover inline para ajuste rapido |
| `src/components/stock/StockUmbralesPopover.tsx` | Popover para editar min/crit |
| `src/components/stock/StockHistorial.tsx` | Fila expandible con historial de movimientos |
| `src/components/stock/StockInicialInline.tsx` | Vista Estado 1: carga masiva inline |
| `src/components/stock/ConteoFisico.tsx` | Vista Estado 3: conteo comparativo |
| `src/components/stock/StockAlertCard.tsx` | Card de alertas para el dashboard del local |

---

## Parte 5: Archivos a eliminar/deprecar

| Archivo | Accion |
|---|---|
| `src/components/pos/StockInicialModal.tsx` | Eliminar (reemplazado por StockInicialInline) |
| `src/components/pos/AjusteStockModal.tsx` | Eliminar (reemplazado por StockAjustePopover) |
| `src/components/pos/CierreStockModal.tsx` | Eliminar (reemplazado por ConteoFisico) |

---

## Parte 6: Integracion con Dashboard

Agregar `StockAlertCard` al ManagerDashboard del local que muestre:
- Cantidad de insumos en estado critico con nombres
- Cantidad de insumos bajos
- Link "Ver stock completo"

---

## Parte 7: Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/pages/pos/StockPage.tsx` | Reescritura completa con 3 estados |
| `src/hooks/pos/useStock.ts` | Reescritura completa con queries y mutations nuevas |
| `src/components/local/ManagerDashboard.tsx` | Agregar StockAlertCard |

---

## Parte 8: Lo que NO se incluye en esta iteracion

Segun la guia, estos items son opcionales o dependen de otros modulos:

- **Alerta de stock en POS** (seccion 4.3 de la guia): requiere integracion con el carrito del POS, se puede agregar despues
- **Reportes de mermas y rotacion** (seccion 8): se pueden construir como pagina separada una vez que haya datos
- **Descuento automatico por ventas POS** (seccion 3.1): ya existe el trigger `descontar_stock_pedido()`, pero depende de que los productos tengan fichas tecnicas vinculadas
- **Suma automatica por compras** (seccion 3.2): ya existe el trigger `sumar_stock_desde_compra()`

Los triggers de descuento por venta y suma por compra ya existen en la base de datos. El problema principal es que `stock_actual` esta vacio y ningun insumo tiene `tracks_stock = true`, por lo que nunca se activan. Esto se resuelve al poblar stock_actual desde la nueva pantalla.

---

## Orden de implementacion

1. Migracion SQL (tablas nuevas + campos adicionales)
2. Hook `useStock.ts` reescritura completa
3. Componentes de stock (8 componentes nuevos)
4. `StockPage.tsx` reescritura completa
5. `StockAlertCard` en dashboard
6. Eliminar modales viejos

