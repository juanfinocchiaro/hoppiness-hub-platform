

## Fix: "Sin composición" falso para extras con referencia directa

### Problema raíz
"Extra Porcion Bacon" muestra "Sin composición" y costo $0, pero **sí tiene composición**: su campo `composicion_ref_preparacion_id` apunta a la receta "Porcion Bacon" (costo real: $380.27).

El problema tiene dos capas:

1. **La función de base de datos `recalcular_costo_item_carta`** solo busca en la tabla `item_carta_composicion`. Los extras tipo `composicion_ref_preparacion_id` / `composicion_ref_insumo_id` no tienen registros ahí -- usan una referencia directa. Por eso el costo queda en $0.

2. **El indicador visual `hasComp`** en `CentroCostosPage.tsx` usa `costo > 0` como proxy de "tiene composición". Si el costo es $0 (por el bug anterior), muestra falsamente "Sin composición".

### Cambios

**Migración SQL** - Actualizar `recalcular_costo_item_carta`:
- Agregar un paso que detecte si el item tiene `composicion_ref_preparacion_id` o `composicion_ref_insumo_id`
- Si no hay registros en `item_carta_composicion` pero sí hay referencia directa, usar el costo de la preparación o insumo referenciado
- Esto cubre el caso de extras auto-generados que no pasan por la tabla de composición

**`src/pages/admin/CentroCostosPage.tsx`** - Mejorar `hasComp`:
- Cambiar la lógica de `hasComp: c > 0` a incluir también extras con referencia directa:
  ```
  hasComp: c > 0 || !!it.composicion_ref_preparacion_id || !!it.composicion_ref_insumo_id
  ```
- Esto evita el falso "Sin composición" mientras el costo se recalcula

### Resultado esperado
- "Extra Porcion Bacon" mostrará costo $380.27 y FC% calculado correctamente
- No se mostrará "Sin composición" para extras que tienen referencia a receta/insumo
