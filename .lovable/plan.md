
# Upsell: Top Acompañamientos + Bebidas

## Problema actual
La seccion "Queres agregar algo mas?" muestra los primeros 3 items del menu que no estan en el carrito, sin importar la categoria. Esto resulta en sugerencias poco utiles (muestra otras hamburguesas en vez de complementos).

## Solucion
Filtrar las sugerencias para mostrar solo items de las categorias **ACOMPAÑAMIENTOS** y **BEBIDAS**, que son los complementos naturales de una hamburguesa.

## Cambio

### `src/components/webapp/CartSidePanel.tsx`
Modificar la logica de `suggestions` (linea 80-82):

Actualmente:
```ts
const suggestions = (suggestedItems || [])
  .filter(item => !cart.items.some(ci => ci.itemId === item.id))
  .slice(0, 3);
```

Nuevo:
```ts
const UPSELL_CATEGORIES = ['ACOMPAÑAMIENTOS', 'BEBIDAS'];

const suggestions = (suggestedItems || [])
  .filter(item =>
    !cart.items.some(ci => ci.itemId === item.id) &&
    item.tipo !== 'extra' &&
    item.categoria_nombre &&
    UPSELL_CATEGORIES.includes(item.categoria_nombre.toUpperCase())
  )
  .slice(0, 4);
```

Esto muestra hasta 4 sugerencias (para tener variedad), solo de acompañamientos y bebidas, excluyendo items ya en el carrito y los de tipo "extra".

### Agregar subtitulos por categoria
Separar visualmente los dos grupos:
- Primero los acompañamientos disponibles (hasta 2)
- Luego las bebidas disponibles (hasta 2)

Esto se logra mostrando dos mini-secciones dentro del bloque de upsell, cada una con su label ("Acompañamientos" y "Bebidas"), solo si hay items de esa categoria.

## Archivos modificados
| Archivo | Cambio |
|---------|--------|
| `src/components/webapp/CartSidePanel.tsx` | Filtrar sugerencias por categoria ACOMPAÑAMIENTOS y BEBIDAS, mostrar en dos grupos |
