

# Fix: Modal de producto cortado cuando hay muchos modificadores

## Problema

En desktop, el `DialogContent` tiene `max-h-[90vh]` pero no tiene una altura explicita. El div interno usa `h-full` que no se resuelve correctamente sin una altura definida en el padre. Cuando hay muchos extras/removibles (como Victoria con 6 removibles), el contenido empuja el footer (boton "Agregar al carrito") fuera del area visible.

## Causa raiz

El `DialogContent` de Radix usa `grid` por defecto. Aunque se pasa `flex flex-col`, la combinacion de `max-h` sin `h` explicito hace que el `h-full` del hijo no se calcule bien. El area scrollable (`flex-1 overflow-y-auto`) no se limita y el footer se sale del viewport.

## Cambio

### `src/components/webapp/ProductCustomizeSheet.tsx`

Linea 335 - Cambiar las clases del `DialogContent` en desktop:

**Antes:**
```
max-w-lg p-0 overflow-hidden max-h-[90vh] flex flex-col
```

**Despues:**
```
max-w-lg p-0 overflow-hidden max-h-[90vh] h-[90vh] flex flex-col
```

Agregar `h-[90vh]` para que el contenedor tenga una altura definida. Esto permite que `h-full` del hijo funcione y que `flex-1 overflow-y-auto` del area de contenido se limite correctamente, manteniendo el footer siempre visible al fondo.

Cambio de 1 linea. El footer con el boton "Agregar al carrito" y el selector de cantidad sera siempre visible, independientemente de cuantos extras/removibles tenga el producto.
