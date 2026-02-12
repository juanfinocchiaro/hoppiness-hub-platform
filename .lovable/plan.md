

## Ocultar Extras/Modificadores de la Carta

### Problema
La pagina "Items de Venta" (Carta) muestra todos los items activos, incluyendo los de tipo `extra` (como "Extra Carne 45g") que no se venden de forma independiente. Solo los items de tipo `item` deberian aparecer ahi.

### Solucion
Filtrar la query de la Carta para excluir items con `tipo = 'extra'`.

### Cambios

**1. `src/pages/admin/MenuCartaPage.tsx`**
- En el `useMemo` que agrupa items por categoria, agregar un filtro que excluya items donde `tipo === 'extra'`.
- Esto hara que la categoria "EXTRAS/MODIFICADORES" aparezca vacia (0 items) o directamente no se muestre si no tiene items visibles.

**2. Alternativa mas limpia (opcional):** Tambien se podria filtrar desde el hook `useItemsCarta`, pero como el Centro de Costos SI necesita ver los extras, es mejor filtrar solo en la pagina de Carta.

### Detalle tecnico

En `MenuCartaPage.tsx`, dentro del `useMemo` de `itemsByCategory` (linea ~168), se agrega la condicion:

```text
const filtered = (items || []).filter((item) => {
  if (item.tipo === 'extra') return false;  // <-- nueva linea
  if (!search) return true;
  return item.nombre.toLowerCase().includes(search.toLowerCase());
});
```

Con esto, las categorias que solo contengan extras (como "EXTRAS/MODIFICADORES") mostraran "0 items" en la Carta, lo cual es correcto ya que esos items se gestionan desde el Centro de Costos, dentro de la composicion de cada producto.

### Impacto
- Centro de Costos: sin cambios, sigue mostrando todo.
- Carta: solo muestra items vendibles al publico.
- No requiere cambios de base de datos.
