

## Ocultar categorias vacias en la Carta

### Problema
La pagina "Items de Venta" (Carta) muestra TODAS las categorias, incluso las que quedan con 0 items despues de filtrar los extras. Por eso "EXTRAS/MODIFICADORES" aparece vacia (todos sus items son `tipo=extra` y se filtran correctamente, pero la categoria sigue visible).

### Causa raiz
El filtro de `tipo === 'extra'` que agregamos funciona bien para los items, pero el renderizado de categorias itera sobre TODAS las categorias activas sin verificar si tienen items visibles.

### Solucion
En `MenuCartaPage.tsx`, filtrar las categorias para mostrar solo las que tienen al menos 1 item visible.

### Cambio tecnico

**`src/pages/admin/MenuCartaPage.tsx`**

En la seccion donde se renderizan las categorias (dentro del `SortableContext`), cambiar el `.map` de categorias para saltar las que no tienen items visibles:

```text
{categorias?.filter((cat: any) => (itemsByCategory[cat.id] || []).length > 0).map((cat: any) => (
  <SortableCategoryCard ... />
))}
```

Esto oculta cualquier categoria cuyo contenido filtrado sea 0 items (como EXTRAS/MODIFICADORES), mientras que ACOMPAÑAMIENTOS (que tiene el Pote de barbacoa, tipo=`item`) se sigue mostrando correctamente.

### Impacto
- Solo afecta la vista de Carta
- No afecta Centro de Costos ni la base de datos
- Las categorias siguen existiendo, simplemente no se muestran cuando no tienen items visibles en Carta
