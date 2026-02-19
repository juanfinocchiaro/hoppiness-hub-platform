

# Plan: Bloquear productos sin venta iniciada + Acelerar modal de modificadores

## Problema 1: Se pueden agregar productos sin iniciar la venta

Actualmente, al hacer click en un producto de la grilla, se abre el modal de modificadores (o se agrega directo al carrito) sin importar si el cajero ya confirmo el canal de venta. Esto no deberia pasar.

**Solucion:** Pasar `configConfirmed` (o un flag `disabled`) a `ProductGrid`. Si la venta no esta iniciada, al hacer click en un producto se muestra un toast de advertencia y no se abre el modal.

**Archivo:** `src/pages/pos/POSPage.tsx` y `src/components/pos/ProductGrid.tsx`

- Agregar prop `disabled?: boolean` a ProductGrid
- Cuando `disabled` es true, el click en ProductCard muestra un toast "Iniciá la venta primero" y no llama a `onSelectItem`
- Pasar `disabled={!configConfirmed}` desde POSPage
- Visualmente: aplicar `opacity-60 pointer-events-none` a la grilla cuando esta deshabilitada (o solo bloquear el click sin cambiar visual, para que el cajero vea los productos)

## Problema 2: El modal de modificadores carga raro/lento

El problema es que `useItemExtras` y `useItemRemovibles` se ejecutan solo cuando se selecciona un item (queries habilitadas con `enabled: !!itemId`). Como los datos no estan en cache, hay un delay visible mientras se carga.

Ademas, la linea `if (!hasContent) return null` hace que el Dialog no se renderice hasta que lleguen los datos, generando un "pop-in" visual.

**Solucion en dos partes:**

### 2a. Mostrar el Dialog inmediatamente con skeleton
- Eliminar el `if (!hasContent) return null` al inicio del render
- Siempre renderizar el `<Dialog>` cuando `open && item` es truthy
- Si `isLoading` es true, mostrar skeletons dentro del Dialog (ya existe el codigo para esto, pero no se ejecuta porque el return null lo previene)
- Si no hay extras ni removibles (producto simple), el `useEffect` de auto-add sigue funcionando igual

### 2b. Prefetch de extras/removibles
- Precachear los datos de extras/removibles de todos los items al cargar la grilla, para que cuando el usuario haga click el dato ya este en cache
- Agregar un hook `usePrefetchModifiers` que al montarse la grilla haga queries de extras y removibles para todos los items visibles
- Alternativa mas simple: en `ProductGrid`, cuando se hace hover sobre un producto, disparar un prefetch de sus extras/removibles. Esto es mas liviano que cargar todo de golpe

**Enfoque elegido: Prefetch on hover** (equilibrio entre rendimiento y simplicidad)

**Archivos a modificar:**
- `src/components/pos/ProductGrid.tsx` - Agregar prefetch on hover de extras/removibles por item
- `src/components/pos/ModifiersModal.tsx` - Eliminar el `return null` temprano, siempre renderizar Dialog con loading state

---

## Resumen de cambios

| Archivo | Cambio |
|---|---|
| `src/components/pos/ProductGrid.tsx` | Agregar prop `disabled`, bloquear clicks sin venta. Prefetch de modificadores on hover |
| `src/components/pos/ModifiersModal.tsx` | Eliminar `if (!hasContent) return null`. Siempre mostrar Dialog con skeleton si loading |
| `src/pages/pos/POSPage.tsx` | Pasar `disabled={!configConfirmed}` a ProductGrid |

