

# Plan Consolidado: 7 Partes del Prompt Final

Este plan implementa todas las mejoras del documento que subiste, en orden. Incluye migraciones SQL, cambios en edge functions, y modificaciones en la webapp y el admin.

---

## PARTE 1: Migraciones SQL

### 1A. Seed de barrios
Los 485 barrios ya estan cargados en la base. No se necesita ejecutar el seed.

### 1B. Migrar delivery a asignacion exclusiva
- Vaciar `branch_delivery_neighborhoods` (actualmente tiene datos con status `enabled` y `blocked_security`)
- Cambiar constraint de status a solo `assigned` y `blocked_security`
- Default a `assigned`
- Eliminar columna `conflict_with_branch_id`
- Crear indice unico para que un barrio solo pueda estar `assigned` a un local

### 1C. Columnas de delivery en pedidos
- Agregar `delivery_address TEXT` y `delivery_neighborhood TEXT` a `pedidos`

### 1D. Tabla `branch_item_availability`
- Crear tabla con columnas: `branch_id`, `item_carta_id`, `available`, `available_webapp`, `available_salon`, `out_of_stock`
- RLS: lectura publica, escritura para admins de marca, update para staff local
- Seed inicial: una fila por cada combinacion branch x item activo

---

## PARTE 2: Edge Function `calculate-delivery`

**Archivo**: `supabase/functions/calculate-delivery/index.ts`

- Agregar `suggested_branch` a la interface de respuesta
- Agregar reasons: `assigned_other_branch`, `not_assigned`
- Reemplazar paso 4 (blocklist) por logica de exclusividad territorial:
  1. Buscar barrio por nombre en `city_neighborhoods`
  2. Verificar bloqueo de seguridad
  3. Verificar asignacion exclusiva: si esta asignado a otro local, devolver `suggested_branch` con datos del local correcto
  4. Si no esta asignado a ningun local, devolver `not_assigned`
- Actualizar funcion `unavailable` para incluir `suggested_branch: null`

---

## PARTE 3: Webapp - Sugerencia de local alternativo

### 3A. `src/components/webapp/DeliveryUnavailable.tsx`
- Reescribir con soporte para `reason` y `suggestedBranch`
- Si `reason === 'assigned_other_branch'` y hay `suggestedBranch`: mostrar card amber con boton "Pedir desde [Nombre]" que navega a `/pedir/[slug]`
- Caso generico: mantener card roja actual con opciones de retiro/cambiar direccion

### 3B. `src/hooks/useDeliveryConfig.ts`
- Actualizar tipo de retorno de `useCalculateDelivery` para incluir `suggested_branch` y los nuevos reasons
- Cambiar `'enabled'` a `'assigned'` en `useUpdateNeighborhoodStatus` y `useRegenerateBranchNeighborhoods`
- Agregar hook `useNeighborhoodAssignments(neighborhoodIds)` para verificar asignaciones cruzadas

### 3C. `src/components/webapp/CartSheet.tsx`
- Agregar `suggested_branch` al state de `deliveryCalc`
- Pasar `reason` y `suggestedBranch` al componente `DeliveryUnavailable`

### 3D. `src/components/webapp/CheckoutInlineView.tsx`
- Mismo cambio que CartSheet: agregar `suggested_branch` al state y pasarlo a `DeliveryUnavailable`

---

## PARTE 4: Admin delivery - Asignacion exclusiva

### 4A. `src/pages/admin/BranchDeliveryDetailPage.tsx`
- Eliminar todas las referencias a `blocked_conflict`
- Cambiar `'enabled'` a `'assigned'` en conteos y filtros
- Usar `useNeighborhoodAssignments` para detectar barrios asignados a otros locales
- Mostrar badge "Asignado a [Nombre Local]" (amber) para barrios de otro local
- No mostrar boton de accion para barrios asignados a otro local
- `handleUnblock` pasa a usar status `'assigned'` en vez de `'enabled'`

---

## PARTE 5: Extras y Removibles - Tablas correctas

### 5A. `src/hooks/useWebappMenu.ts`
- Reescribir `useWebappItemExtras`: consultar `item_extra_asignaciones` + `items_carta` (precio real de venta via `precio_base`)
- Reescribir `useWebappItemRemovables`: consultar `item_removibles` con `nombre_display`, `insumos`, `preparaciones`

### 5B. `src/components/webapp/ProductCustomizeSheet.tsx`
- Eliminar logica de grupos opcionales (`es_obligatorio`, `max_selecciones`, `missingRequired`)
- Simplificar `toggleExtra` a toggle simple sin logica de grupos
- Renderizar extras como lista plana con nombre y precio real
- Renderizar removibles usando `comp.nombre` directo (ya mapeado en el hook)
- Boton "Agregar" siempre habilitado (sin validacion de selecciones obligatorias)
- Limpiar import de `AlertCircle`

---

## PARTE 6: Disponibilidad de productos por local

### 6A. `src/hooks/useWebappMenu.ts` - `useWebappMenuItems`
- Primero consultar `branch_item_availability` filtrando por `available=true`, `available_webapp=true`, `out_of_stock=false`
- Luego consultar `items_carta` solo con los IDs disponibles
- Fallback: si no hay filas en `branch_item_availability`, usar query original sin filtro

### 6B. `src/hooks/useItemsCarta.ts`
- Agregar parametro opcional `branchId` a `useItemsCarta`
- Si se pasa `branchId`, filtrar por `branch_item_availability` con `available_salon=true`
- Fallback si no hay filas: mostrar todo
- Actualizar queryKey a incluir `branchId`
- No romper callers existentes (sin argumento = sin filtro)

---

## PARTE 7: Fix build errors

### `src/components/ui/page-header.tsx`
- Cambiar tipo de `icon` de `ReactNode` a `ReactNode | React.ComponentType`
- Simplificar render: `typeof icon === 'function' ? createElement(icon, { className: 'w-6 h-6' }) : icon`
- Eliminar checks de `isValidElement` y `$$typeof` que causan errores TS

---

## Resumen de archivos a modificar

| Archivo | Partes |
|---|---|
| SQL Migration | 1B, 1C, 1D |
| `supabase/functions/calculate-delivery/index.ts` | 2 |
| `src/components/webapp/DeliveryUnavailable.tsx` | 3A |
| `src/hooks/useDeliveryConfig.ts` | 3B, 4 |
| `src/components/webapp/CartSheet.tsx` | 3C |
| `src/components/webapp/CheckoutInlineView.tsx` | 3D |
| `src/pages/admin/BranchDeliveryDetailPage.tsx` | 4A |
| `src/hooks/useWebappMenu.ts` | 5A, 6A |
| `src/components/webapp/ProductCustomizeSheet.tsx` | 5B |
| `src/hooks/useItemsCarta.ts` | 6B |
| `src/components/ui/page-header.tsx` | 7 |

## Archivos que NO se tocan
- `DeliveryPage.tsx` (despacho POS)
- `WebappConfigPage.tsx`
- `UserMenuDropdown.tsx`
- No se crea UI de gestion de disponibilidad por local (solo tabla + filtros backend)

