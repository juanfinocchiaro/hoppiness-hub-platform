

## Plan: WebApp - Carrito lateral, menos azul, mas profesional

### Problemas detectados

**1. "Se ve roto" (Imagen 1 - BranchLanding)**
- El hero azul ocupa ~40% de la pantalla, el contenido util queda flotando en un vacio blanco enorme.
- En desktop, el card de "Cerrado / Ver menu" es demasiado estrecho (`max-w-md`) centrado en un oceano de espacio vacio.

**2. Carrito ocupa toda la pantalla (Imagen 2)**
- El `CartSheet` se abre como sheet bottom al 85% de altura, tapando todo el menu.
- En desktop deberia ser un panel lateral fijo a la derecha que conviva con el menu.

**3. Demasiado azul**
- Header del menu: fondo `bg-primary` (azul oscuro) de borde a borde.
- Landing: hero completamente azul.
- Solucion: Header blanco con texto oscuro, acentos de color solo en badges/botones. Fondo general blanco.

---

### Cambios por archivo

**1. `src/components/webapp/BranchLanding.tsx`**
- Reducir el hero: fondo blanco en vez de `bg-primary`, logo mas pequeno, info del local en texto oscuro.
- Badge de estado (Abierto/Cerrado) con colores sutiles sobre fondo blanco.
- Ampliar el card de opciones de servicio a `max-w-lg` y centrarlo mejor.
- Quitar el estilo "splash screen azul" y reemplazar por un layout limpio profesional.

**2. `src/components/webapp/WebappMenuView.tsx`**
- **Header**: Cambiar de `bg-primary text-primary-foreground` a `bg-white border-b text-foreground`. Logo y nombre en oscuro. Search con borde gris.
- **Tabs de categorias**: Sobre fondo blanco, tab activa con `bg-primary text-white`, inactivas con `bg-muted`.
- **Layout desktop**: Agregar espacio para el panel lateral de carrito cuando hay items (`cart.totalItems > 0`). El area de productos se comprime para dejar ~350px al carrito.
- Recibir flag `showCartPanel` como prop para ajustar el layout.

**3. `src/components/webapp/CartSidePanel.tsx` (NUEVO)**
- Panel lateral derecho, solo visible en `lg:` cuando hay items en el carrito.
- Sticky, `w-[350px]`, borde izquierdo.
- Muestra: titulo "Tu pedido", lista de items con thumbnail + nombre + controles +/-, subtotal, envio, total, boton "Continuar".
- Al hacer click en "Continuar", abre el `CartSheet` en step checkout (datos del cliente + pago).

**4. `src/components/webapp/CartBar.tsx`**
- Ocultar en desktop (`lg:hidden`) cuando el `CartSidePanel` esta visible.
- Mantener en mobile como esta.

**5. `src/pages/webapp/PedirPage.tsx`**
- Pasar el `CartSidePanel` como parte del layout del menu en desktop.
- Integrar el flujo: CartSidePanel (desktop) -> click Continuar -> CartSheet step checkout.

**6. `src/components/webapp/CartSheet.tsx`**
- Agregar prop `initialStep` para poder abrirse directamente en step `checkout` (cuando viene del side panel).
- En desktop, el step `cart` ya no se necesita (lo maneja el side panel), solo se abre en `checkout`.

---

### Paleta de colores actualizada (menos azul)

| Elemento | Antes | Despues |
|----------|-------|---------|
| Header menu | `bg-primary` (azul oscuro) | `bg-white border-b` |
| Texto header | Blanco | `text-foreground` (oscuro) |
| Search bar | `bg-white/15` sobre azul | `bg-muted border-border` sobre blanco |
| Landing hero | `bg-primary` full | `bg-white` con logo y texto oscuro |
| Tabs activa | `bg-accent` sobre azul | `bg-primary text-white` sobre blanco |
| Tabs inactiva | `bg-white/10` sobre azul | `bg-muted text-muted-foreground` |
| Boton "Agregar" | `bg-accent` (naranja) | Mantener naranja (es el CTA) |
| Category headers | `text-primary uppercase` | Mantener (funciona bien sobre blanco) |

---

### Layout desktop resultante

```text
+--------------------------------------------------+
| [<-] Logo  Manantiales  Retiro ~20min  [Search]  |  <- Header blanco
+------+---------------------------+---------------+
| Side | Productos                 | Tu Pedido     |
| bar  | (grid/list cards)         | Item 1  $X    |
| cats |                           | Item 2  $X    |
|      |                           | ----------    |
|      |                           | Total   $XX   |
|      |                           | [Continuar]   |
+------+---------------------------+---------------+
```

---

### Archivos involucrados

| Archivo | Cambio |
|---------|--------|
| `src/components/webapp/BranchLanding.tsx` | Fondo blanco, layout limpio |
| `src/components/webapp/WebappMenuView.tsx` | Header blanco, layout con espacio para cart panel |
| `src/components/webapp/CartSidePanel.tsx` | **NUEVO** - Panel lateral de carrito desktop |
| `src/components/webapp/CartBar.tsx` | `lg:hidden` cuando hay side panel |
| `src/components/webapp/CartSheet.tsx` | Prop `initialStep` para abrir en checkout |
| `src/pages/webapp/PedirPage.tsx` | Integrar CartSidePanel en el layout |

