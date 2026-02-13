
## Fix: Extras y Removibles toggles no funcionan

### Diagnostico

**Bug 1 - Extras ("Porcion Bacon" no se activa):**
El item extra "Extra Porcion Bacon" fue previamente eliminado (soft-delete: `activo=false`, `deleted_at` con valor). Cuando se intenta activar:
1. `findExistingExtra` lo encuentra (no filtra por `activo` ni `deleted_at`)
2. Crea la asignacion correctamente (status 200)
3. Pero `useItemsCarta()` filtra `.eq('activo', true).is('deleted_at', null)`, asi que el extra no aparece en la lista
4. `useExtraAutoDiscovery` no puede cruzar el extra con la asignacion, y muestra `activo: false`

**Bug 2 - Removibles ("Porcion Bacon" no se activa):**
La tabla `item_removibles` tiene unique indexes **parciales** (`WHERE insumo_id IS NOT NULL` / `WHERE preparacion_id IS NOT NULL`). PostgREST no soporta `ON CONFLICT` con indices parciales. El upsert falla con error 400: `"there is no unique or exclusion constraint matching the ON CONFLICT specification"`.

### Cambios

**`src/hooks/useToggleExtra.ts`** - Fix `findExistingExtra`:
- Cuando encuentra un extra soft-deleted, reactivarlo (`activo: true`, `deleted_at: null`) antes de crear la asignacion
- Cambiar `findExistingExtra` para devolver el objeto completo (id + activo + deleted_at) en vez de solo el id

**`src/hooks/useItemRemovibles.ts`** - Fix upsert para removibles:
- Reemplazar `upsert` con logica manual: primero buscar si existe el registro, si existe hacer update, si no existe hacer insert
- Aplicar a ambos: `toggleInsumo` y `togglePreparacion`
