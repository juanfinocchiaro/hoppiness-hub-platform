
# Sistema RDO (Resultado de Operaciones)

## Contexto
El sistema RDO unifica la categorización de todos los costos del negocio (ingredientes, insumos, servicios) para generar automáticamente el Estado de Resultados (P&L) que coincide con el RDO en Excel del cliente.

Actualmente el P&L es un cálculo simple (ventas - compras - gastos - consumos). El RDO lo reemplaza con una estructura jerárquica de categorías con costos variables y fijos.

**Dato clave:** Las tablas `insumos`, `gastos` e `items_factura` están vacías (0 registros), así que no hay migración de datos legacy.

## Fases de Implementación

### FASE 1: Base de Datos — Tabla `rdo_categories` + Seed

Crear tabla maestra de categorías RDO con estructura jerárquica de 3 niveles.

```sql
CREATE TABLE public.rdo_categories (
  code text PRIMARY KEY,
  name text NOT NULL,
  parent_code text REFERENCES rdo_categories(code),
  level integer NOT NULL CHECK (level BETWEEN 1 AND 3),
  rdo_section text NOT NULL, -- 'costos_variables' | 'costos_fijos'
  behavior text NOT NULL,    -- 'variable' | 'fijo'
  allowed_item_types text[], -- {'ingrediente','insumo','servicio'}
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

Seed con todas las categorías del documento:

**Costos Variables:**
- CMV: cmv_hamburguesas, cmv_bebidas_alcohol, cmv_bebidas_sin_alcohol, descartables_salon, descartables_delivery, insumos_clientes
- Comisiones: comision_mp_point, comision_rappi, comision_pedidosya
- Delivery: cadetes_rappiboy, cadetes_terceros
- Publicidad: fee_marca, marketing

**Costos Fijos:**
- Estructura: limpieza_higiene, descartables_cocina, mantenimiento, uniformes
- Laborales: sueldos, cargas_sociales, comida_personal
- Administración: software_gestion, estudio_contable, bromatologia
- Servicios: alquiler, expensas, gas, internet_telefonia, energia_electrica

RLS: lectura para todo staff autenticado, escritura solo superadmin.

### FASE 2: Base de Datos — Nuevos campos en tablas existentes

**`insumos`:**
- `tipo_item varchar DEFAULT 'insumo'` — 'ingrediente' | 'insumo'
- `rdo_category_code text REFERENCES rdo_categories(code)` — categoría RDO
- `tracks_stock boolean DEFAULT false` — si trackea stock

**`gastos`:**
- `rdo_category_code text REFERENCES rdo_categories(code)` — categoría RDO
- `proveedor_id uuid REFERENCES proveedores(id)` — proveedor opcional

**`items_factura`:**
- `rdo_category_code text REFERENCES rdo_categories(code)` — hereda del insumo o se asigna

**`proveedores`:**
- `tipo_proveedor text[]` — {'ingrediente','insumo','servicio'}
- `rdo_categories_default text[]` — categorías que suele proveer

### FASE 3: Vista de Reporte y Función

Crear vista `rdo_report_data` que consolide:
- Items de facturas (compras) agrupados por rdo_category_code
- Gastos agrupados por rdo_category_code
- Consumos manuales mapeados a categorías RDO

Crear función `get_rdo_report(branch_id, periodo)` que retorne:
- Cada línea del RDO con monto, porcentaje sobre ventas, sección, comportamiento

### FASE 4: Tipos TypeScript y Hooks

**Nuevo `src/types/rdo.ts`:**
- RdoCategory type (desde Supabase types)
- RdoReportLine interface
- Constantes de secciones y comportamientos

**Nuevo `src/hooks/useRdoCategories.ts`:**
- useRdoCategories(filters?) — lista categorías con filtros opcionales
- useRdoCategoryOptions(itemType?) — para selectores

**Nuevo `src/hooks/useRdoReport.ts`:**
- useRdoReport(branchId, periodo) — reporte completo

### FASE 5: Componentes UI

**Nuevo `src/components/rdo/RdoCategorySelector.tsx`:**
- Select con búsqueda y agrupación por sección
- Filtra por allowed_item_types según contexto

**Nuevo `src/components/rdo/RdoCategoryBadge.tsx`:**
- Badge que muestra nombre + variable/fijo

**Actualizar formularios existentes:**
- `InsumoFormModal.tsx` — agregar tipo_item + RdoCategorySelector + tracks_stock
- `GastoFormModal.tsx` — agregar RdoCategorySelector + proveedor opcional
- `CompraFormModal.tsx` — items heredan rdo_category_code del insumo

### FASE 6: Dashboard RDO (reemplaza P&L actual)

**Nuevo `src/components/rdo/RdoDashboard.tsx`:**
- Reemplazar el contenido de PLDashboardPage con dashboard basado en RDO
- Estructura jerárquica: sección > categoría > subcategoría
- Columnas: Concepto | Monto | % sobre Ventas
- Totales por sección (Total Costos Variables, Total Costos Fijos)
- Resultado Operativo = Ventas - Costos Variables - Costos Fijos
- Comparativo con período anterior (cuando haya datos)

## Archivos a crear

| Archivo | Descripción |
|---------|-------------|
| Migración SQL (Fase 1) | Tabla rdo_categories + seed |
| Migración SQL (Fase 2) | ALTER TABLE insumos, gastos, items_factura, proveedores |
| Migración SQL (Fase 3) | Vista rdo_report_data + función get_rdo_report |
| `src/types/rdo.ts` | Tipos TypeScript |
| `src/hooks/useRdoCategories.ts` | Hook de categorías |
| `src/hooks/useRdoReport.ts` | Hook de reporte |
| `src/components/rdo/RdoCategorySelector.tsx` | Selector de categoría |
| `src/components/rdo/RdoCategoryBadge.tsx` | Badge de categoría |
| `src/components/rdo/RdoDashboard.tsx` | Dashboard principal |

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/finanzas/InsumoFormModal.tsx` | Agregar tipo_item, rdo_category_code, tracks_stock |
| `src/components/finanzas/GastoFormModal.tsx` | Agregar rdo_category_code, proveedor_id |
| `src/components/finanzas/CompraFormModal.tsx` | Items heredan rdo_category_code |
| `src/types/financial.ts` | Agregar campos RDO a InsumoFormData |
| `src/types/compra.ts` | Agregar rdo_category_code a GastoFormData |
| `src/pages/local/PLDashboardPage.tsx` | Usar RdoDashboard |
| `src/components/finanzas/ProveedorFormModal.tsx` | Agregar tipo_proveedor |

## Orden de ejecución

1. ✅ Migración Fase 1 (rdo_categories + seed) — completado
2. ✅ Migración Fase 2 (campos en tablas existentes) — completado
3. ✅ Migración Fase 3 (vista + función) — completado
4. ✅ Tipos + Hooks (Fase 4) — completado
5. ✅ Componentes UI (Fase 5) — completado
6. ✅ Dashboard RDO (Fase 6) — completado

## Notas técnicas

- Las tablas están vacías, no hay datos legacy que migrar
- El campo `categoria_pl` existente en insumos y items_factura se mantiene por compatibilidad pero se deriva de rdo_category_code
- Los gastos menores (caja chica, propinas) NO necesitan categoría RDO — son gastos operativos que ya tienen su propia categorización
- La tabla `conceptos_servicio` existente se integra: cada concepto puede tener un rdo_category_code default
