

## Plan: Rediseno Profesional de la WebApp de Pedidos

Basado en el analisis de todas las referencias (DoorDash, Rappi, PedidosYa, BK, McDonald's) y el plan previamente aprobado, este es el plan completo de implementacion.

### Resumen de cambios

Se va a transformar la WebApp de un layout mobile-only a un sistema responsivo profesional con 3 breakpoints claros, inspirado en DoorDash/Rappi.

---

### 1. Selector de Locales (`src/pages/Pedir.tsx`)

**Problemas actuales**: `opacity-70` en locales cerrados, `max-w-3xl` deja mucho espacio vacio, grilla solo 2 columnas.

**Cambios**:
- Quitar `opacity-70` de locales cerrados (usar solo badge de estado)
- Cambiar `max-w-3xl` a `max-w-5xl`
- Grilla responsiva: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`

---

### 2. Landing del Local (`src/components/webapp/BranchLanding.tsx`)

**Problema**: No hay forma de volver a `/pedir`.

**Cambios**:
- Agregar boton "Volver" en el hero que navega a `/pedir`
- Pasar `onBack` como prop desde `PedirPage.tsx`

---

### 3. Menu de Productos - Layout Responsivo (`src/components/webapp/WebappMenuView.tsx`)

Este es el cambio principal. Layout inspirado en DoorDash imagen 789/792:

```text
MOBILE (<1024px)                    DESKTOP (>=1024px)
+---------------------+            +------+-----------------------+
| [Header + Search]   |            | [Header full-width]         |
| [Tabs categorias]   |            +------+-----------------------+
+---------------------+            | Side | Productos             |
| Productos           |            | bar  | 2 cols horizontal     |
| 2 cols grid         |            | cats | (texto izq, img der)  |
|                     |            |      |                       |
+---------------------+            +------+-----------------------+
```

**Cambios**:
- Agregar sidebar de categorias visible solo en `lg:` (sticky, ~200px ancho)
- Ocultar tabs horizontales en `lg:` (`lg:hidden`)
- Contenedor principal `max-w-6xl mx-auto`
- Grilla de productos adaptativa: `grid-cols-2` mobile, `md:grid-cols-3` tablet, en desktop 2 columnas de cards horizontales (estilo DoorDash)
- Scroll-spy sincronizado entre sidebar y tabs

---

### 4. Cards de Producto (`src/components/webapp/ProductCard.tsx`)

Inspirado en DoorDash imagen 788/789: cards horizontales con texto a la izquierda e imagen cuadrada a la derecha.

**Cambios**:
- **Mobile (grid)**: Mantener cards verticales compactas pero reducir aspect-ratio de imagen a `aspect-[3/2]`
- **Desktop**: Nuevo layout horizontal estilo DoorDash: nombre (bold), descripcion (2 lineas max), precio a la izquierda. Imagen cuadrada ~100px a la derecha con bordes redondeados. Boton "+" discreto sobre la imagen.
- Preparar estructura para futuros badges de promo (precio tachado, badge "%-OFF") -- se renderiza condicionalmente, hoy no hay datos

---

### 5. Detalle de Producto (`src/components/webapp/ProductCustomizeSheet.tsx`)

Inspirado en DoorDash imagenes 790/793: modal centrado en desktop.

**Cambios**:
- **Mobile**: Mantener Sheet desde abajo (funciona bien)
- **Desktop (lg+)**: Usar `Dialog` (modal centrado) con imagen arriba, opciones debajo, footer sticky con cantidad + "Agregar $X"
- Crear wrapper que detecte viewport y renderice Sheet o Dialog segun corresponda

---

### 6. Carrito: Panel Lateral Desktop (`src/components/webapp/CartSidePanel.tsx` - NUEVO)

Inspirado en DoorDash imagen 795 (carrito lateral derecho en checkout).

**Nota**: Este componente se agrega como mejora futura opcional. Por ahora el foco esta en los puntos 1-5 que son los mas impactantes visualmente. Se puede implementar en una segunda iteracion si se desea.

---

### 7. Barra de Carrito (`src/components/webapp/CartBar.tsx`)

**Cambio menor**: Ocultar en desktop cuando se implemente el CartSidePanel (futuro). Por ahora se mantiene.

---

### 8. Pagina del Pedido (`src/pages/webapp/PedirPage.tsx`)

**Cambios**:
- Pasar prop `onBack` a `BranchLanding` para navegar a `/pedir`

---

### Archivos a modificar

| Archivo | Tipo de cambio |
|---------|---------------|
| `src/pages/Pedir.tsx` | Quitar opacity, mejorar grilla, max-width |
| `src/pages/webapp/PedirPage.tsx` | Pasar onBack a BranchLanding |
| `src/components/webapp/BranchLanding.tsx` | Agregar boton volver |
| `src/components/webapp/WebappMenuView.tsx` | Layout responsivo, sidebar desktop, max-width |
| `src/components/webapp/ProductCard.tsx` | Cards estilo DoorDash horizontal para desktop |
| `src/components/webapp/ProductCustomizeSheet.tsx` | Dialog en desktop, Sheet en mobile |

### Secuencia de implementacion

1. `Pedir.tsx` - Arreglos rapidos (opacity, grilla)
2. `BranchLanding.tsx` + `PedirPage.tsx` - Boton volver
3. `ProductCard.tsx` - Cards compactas estilo DoorDash
4. `WebappMenuView.tsx` - Layout responsivo con sidebar desktop
5. `ProductCustomizeSheet.tsx` - Dialog en desktop

### Preparacion para futuras mejoras

- **Promociones**: Las cards quedan preparadas con espacio condicional para badge de descuento y precio tachado. Solo falta agregar `precio_promo` al tipo `WebappMenuItem` cuando se implemente.
- **Tracking**: Ya esta implementado en `/pedido/:trackingCode` con realtime.
- **CartSidePanel desktop**: La arquitectura queda lista para agregar un panel lateral de carrito en desktop en una segunda fase.

