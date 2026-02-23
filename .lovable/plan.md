
# Fix: Error de check constraint en barrios de delivery

## Problema

Al hacer click en "Regenerar", el sistema intenta insertar barrios con `status: 'assigned'`, pero la tabla `branch_delivery_neighborhoods` tiene un CHECK constraint que solo permite estos valores:

- `enabled`
- `blocked_security`
- `blocked_conflict`

El valor `'assigned'` no esta en la lista permitida, por eso falla con el error "violates check constraint branch_delivery_neighborhoods_status_check".

## Cambios

### `src/hooks/useDeliveryConfig.ts`

Reemplazar todas las ocurrencias de `'assigned'` por `'enabled'`:

1. **Linea 150** - Tipo del parametro status en `useUpdateNeighborhoodStatus`: cambiar `'assigned'` por `'enabled'`
2. **Linea 196** - Tipo del array toInsert: cambiar `'assigned'` por `'enabled'`
3. **Linea 208** - Valor insertado en regenerar: cambiar `'assigned'` por `'enabled'`
4. **Linea 333** - Query de busqueda en `useDeliveryQuote`: cambiar `.eq('status', 'assigned')` por `.eq('status', 'enabled')`

### `src/pages/admin/BranchDeliveryDetailPage.tsx`

Reemplazar filtros y acciones que usan `'assigned'`:

1. **Linea 82** - Filtro de conteo: `n.status === 'assigned'` por `n.status === 'enabled'`
2. **Linea 84** - Filtro de asignados: `n.status === 'assigned'` por `n.status === 'enabled'`
3. **Linea 132** - Accion de desbloquear: `status: 'assigned'` por `status: 'enabled'`

### `src/pages/local/LocalDeliveryZonesPage.tsx`

1. **Linea 47** - Filtro de habilitados: ya usa `'enabled'`, no necesita cambio (correcto)

Total: ~7 lineas cambiadas, mismo string reemplazado en cada caso.
