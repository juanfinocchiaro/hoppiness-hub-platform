
## Corregir cálculo de costo de extras: usar porción en vez de unidad base

### Problema

Los extras como "Bastones de muzzarella" y "Bacon ahumado" muestran el costo de 1 unidad base del insumo en vez de la porción real que lleva la receta:

- **Bastones de muzzarella**: muestra $18 (1g) en vez de ~$1,455 (80g que lleva la receta)
- **Bacon ahumado**: muestra $127 (1 feta) en vez de ~$380 (3 fetas que lleva la receta)

### Causa raíz

El flujo actual tiene un conflicto:
1. Cuando se activa un extra, `useToggleExtra` guarda correctamente `costo_total = costo_por_unidad_base * cantidad`
2. Pero la función RPC `recalcular_costo_item_carta` (que se ejecuta en recálculos masivos y triggers) **sobreescribe** ese costo usando solo `costo_por_unidad_base` (sin multiplicar por cantidad), porque los extras no tienen filas en `item_carta_composicion`

El RPC tiene dos caminos:
- **Camino estándar** (con composición): `SUM(cantidad * costo)` -- correcto
- **Camino fallback** (sin composición, usado por extras): `costo_por_unidad_base` directo -- **incorrecto, falta la cantidad**

### Solución

Crear una fila en `item_carta_composicion` para cada extra al momento de activarlo, con la cantidad correcta de la porción. Así el RPC siempre usa el camino estándar que multiplica `cantidad * costo`.

### Cambios

**1. `src/hooks/useToggleExtra.ts`**

- Agregar parámetro `cantidad` a la mutación (default 1)
- Al crear o reactivar un extra, crear/actualizar una fila en `item_carta_composicion` con la cantidad y referencia correcta
- Al desactivar, eliminar la fila de composición del extra

**2. `src/hooks/useExtraAutoDiscovery.ts`**

- Agregar campo `cantidad` al tipo `DiscoveredExtra`
- Pasar la cantidad de la porción desde `deepGroups` (ya disponible como `ing.cantidad`)
- Para sub-preparaciones, usar cantidad 1 (ya representa la porción completa de la receta)

**3. Componente que llama a `useToggleExtra`** (donde se activa/desactiva el toggle de extras)

- Pasar la `cantidad` del `DiscoveredExtra` al llamar la mutación

**4. Migración SQL: corregir datos existentes**

- Para cada extra activo sin composición, crear la fila en `item_carta_composicion` con la cantidad correcta basada en las recetas que lo originaron
- Ejecutar `recalcular_costo_item_carta` para cada extra para actualizar los costos

### Resultado

- Los costos de extras reflejarán la porción real de la receta
- Los recálculos masivos ya no sobreescribirán el costo correcto
- Los nuevos extras se crearán siempre con su fila de composición
