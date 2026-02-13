

## Simplificar pestaña "Asignados" en extras

### Problema
La pestaña "Asignados" de un item tipo `extra` tiene toggles (Switch) para activar/desactivar la asignación desde el extra. Esto duplica la funcionalidad que ya existe en la pestaña "Composicion > Extras Disponibles" de cada producto, creando dos fuentes de verdad para la misma acción.

### Solución
Convertir la pestaña "Asignados" en una vista de solo lectura que liste los productos que tienen asignado ese extra, sin posibilidad de modificar desde ahí. La gestión se hace exclusivamente desde el producto.

### Cambios

**`src/components/centro-costos/ItemExpandedPanel.tsx`** - Componente `AsignadosInline`:
- Eliminar el import y uso de `useToggleExtraAssignment`
- Eliminar el `Switch` de cada fila
- Filtrar la lista para mostrar solo los productos que **tienen** el extra asignado (no todos los productos)
- Cambiar el texto descriptivo a algo como "Productos que actualmente incluyen este extra en su carta"
- Si no hay productos asignados, mostrar mensaje "Ningún producto ofrece este extra. Asignalo desde la pestaña Composicion de cada producto."
- Mantener el Badge de categoría para contexto

**`src/hooks/useToggleExtra.ts`** - Opcional:
- Se puede mantener `useToggleExtraAssignment` por si se usa en otro lado, pero dejar de importarlo en `ItemExpandedPanel`

### Resultado visual
En lugar de una lista de TODOS los productos con toggles, se verá una lista limpia de solo los productos asignados, tipo informativa, sin acciones.

