

## Corregir Extras Disponibles y alinear tablas

### Problemas identificados

1. **Extras muestra recetas de composicion**: El hook `useExtraAutoDiscovery.ts` (lineas 74-88) agrega las recetas de nivel composicion (ej: "Hamburguesa Bacon", "Porcion papas fritas delivery/salon") como extras potenciales. Estas son recetas top-level y no deberias poder convertirlas en extras -- solo los sub-ingredientes y sub-preparaciones internas deben aparecer.

2. **Falta columna "Nombre carta" en Extras**: Cuando activas un extra, no hay forma de editar como se llama en la carta (ej: "Extra Cheddar" en vez de "Queso Cheddar Fetas Americano Tonadita"). Removibles ya tiene esa columna pero Extras no.

3. **Desalineacion visual**: Las columnas de Extras y Removibles no tienen anchos consistentes, se ven desalineadas entre si.

### Cambios

**`src/hooks/useExtraAutoDiscovery.ts`**
- Eliminar el bloque de lineas 74-88 que agrega "Recipes directly in composition" al array de discovered. Solo deben quedar los deep ingredients y sub-preparaciones de las recetas.

**`src/components/centro-costos/ItemExpandedPanel.tsx`**

Seccion **Extras Disponibles** (lineas 353-391):
- Agregar columna "Nombre carta" con el mismo ancho que en Removibles (`w-[140px]`)
- Cuando el extra esta activo, mostrar un Input editable con el nombre del extra en la carta (campo `extra_nombre` del DiscoveredExtra)
- El nombre se edita via el campo `nombre` del item tipo `extra` en `items_carta`
- Unificar anchos de columnas: Componente (flex-1), Origen (w-[120px]), Nombre carta (w-[140px]), Extra toggle (w-14), Estado/precio (w-20)

Seccion **Removibles** (lineas 404-446):
- Ajustar anchos para que coincidan exactamente con Extras: mismas clases CSS para cada columna

Componente **RemovibleRow** (lineas 496-530):
- Ajustar anchos de columnas para coincidir con el header

### Resultado esperado
- Las recetas top-level ("Hamburguesa Bacon", "Porcion papas fritas") ya no aparecen en Extras Disponibles
- Solo aparecen los ingredientes internos (Bolita smash, Salsa Hoppiness, Queso Cheddar, etc.)
- Extras y Removibles tienen columnas perfectamente alineadas con los mismos anchos
- Extras activos muestran un campo editable con el nombre de carta del extra
