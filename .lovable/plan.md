

# Mejoras al POS inspiradas en Nucleo

## Alcance

Tres mejoras concretas que aprovechan datos y componentes que ya existen en la app, priorizadas por impacto:

---

## Mejora 1: Grilla de productos con fotos + tabs de categorias

**Problema actual**: `ProductGrid.tsx` muestra botones de texto plano con nombre y precio. Las fotos de producto ya estan en la DB (`imagen_url` en `items_carta`) pero no se muestran.

**Cambio**: Reemplazar los botones planos por cards con imagen. Si el producto tiene `imagen_url`, mostrar la foto; si no, mostrar un placeholder con las iniciales del producto. Ademas, cambiar los headers de categoria verticales por tabs horizontales scrolleables (como Nucleo) para navegar rapido entre rubros.

```text
ANTES:                          DESPUES:
+------------------+            +------------------+
| Cheese Burger    |            | [  FOTO       ]  |
| $ 10.600         |            | Cheese Burger    |
+------------------+            | $ 10.600         |
                                +------------------+
```

**Archivo**: `src/components/pos/ProductGrid.tsx`
- Agregar `imagen_url` al query (ya viene en el select `*`)
- Renderizar `<img>` con fallback a placeholder
- Agregar barra de tabs de categorias arriba de la grilla
- Al clickear una tab, hacer scroll a esa seccion (o filtrar)

---

## Mejora 2: Modal de extras y removibles (ModifiersModal)

**Problema actual**: `ModifiersModal.tsx` existe pero retorna `null`. Cuando el usuario agrega un producto, no puede elegir extras (ej: "Extra carne con queso" +$1.900) ni quitar ingredientes (ej: "Sin lechuga" $0). Nucleo tiene esto resuelto con un modal que muestra ambos grupos.

**Datos disponibles**: 
- `item_carta_extras` vincula productos con sus extras disponibles (via `preparacion_id`)
- `item_removibles` tiene los ingredientes que se pueden quitar por producto
- Los extras son `items_carta` con `tipo = 'extra'` y tienen precio

**Cambio**: Implementar `ModifiersModal` que se abre al clickear un producto en la grilla:
1. Muestra el nombre del producto y precio base
2. Seccion "Extras": lista de extras disponibles con botones +/- y precio (max 10 unidades como en Nucleo)
3. Seccion "Sin ingrediente": toggles binarios sin costo para cada removible
4. Boton "Agregar al pedido ($X.XXX)" que suma precio base + extras seleccionados

**Archivos**:
- `src/components/pos/ModifiersModal.tsx` - Implementar el modal completo
- `src/components/pos/ProductGrid.tsx` - En vez de agregar directo al carrito, abrir ModifiersModal si el producto tiene extras/removibles
- `src/pages/pos/POSPage.tsx` - Agregar estado para el modal y manejar el item seleccionado
- `src/types/pos.ts` - Extender `CartItem` para incluir extras y removibles seleccionados

**Flujo**:
- Si el producto NO tiene extras ni removibles: agregar directo al carrito (como ahora)
- Si el producto SI tiene: abrir ModifiersModal, y al confirmar agregar con las personalizaciones

---

## Mejora 3: Metodos de pago como botones visuales

**Problema actual**: `PaymentModal.tsx` usa un `<Select>` dropdown para elegir el metodo de pago. Es funcional pero lento para uso tactil.

**Cambio**: Reemplazar el Select por una grilla de botones grandes con icono (estilo Nucleo pero con el design system Hoppiness). Cada metodo de pago se muestra como un boton con icono + label, el seleccionado se destaca con borde primario.

```text
ANTES:                          DESPUES:
[v Efectivo       ]             [$ Efectivo] [Debito] [Credito]
                                [QR MP    ] [Transf ]
```

**Archivo**: `src/components/pos/PaymentModal.tsx`
- Reemplazar el `Select` por una grilla de `Button`s con iconos
- Mantener toda la logica de calculo de vuelto, propina y pago dividido sin cambios

---

## Resumen de archivos

| Archivo | Cambio |
|---|---|
| `src/components/pos/ProductGrid.tsx` | Agregar fotos de producto + tabs de categorias |
| `src/components/pos/ModifiersModal.tsx` | Implementar modal de extras/removibles (actualmente vacio) |
| `src/pages/pos/POSPage.tsx` | Estado para ModifiersModal, flujo condicional |
| `src/types/pos.ts` | Extender CartItem con extras/removibles |
| `src/components/pos/PaymentModal.tsx` | Metodos de pago como botones con icono |

## Notas

- No se cambia logica de negocio ni flujo de cobro
- Los datos de extras, removibles e imagenes ya existen en la base de datos
- Se mantiene la estetica Hoppiness Hub (no se copia el look de Nucleo)
- El teclado numerico tactil se descarta por ahora (solo tiene sentido si usan tablets dedicadas)

