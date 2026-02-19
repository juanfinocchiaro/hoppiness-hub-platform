

# Rediseno Visual del POS - Plan de Implementacion

## Resumen

Aplicar la guia de rediseno visual al POS existente. Esto es un cambio puramente visual y de layout — no agrega funcionalidad nueva. Los cambios principales son: zonas diferenciadas con fondos distintos, modal de Nueva Venta reemplazado por panel lateral en Zona C, grilla de llamadores mejorada, cards de productos consistentes, colores por medio de pago, header compacto de cuenta, y boton "Enviar a cocina" con estados visuales claros.

**Lo que NO se implementa ahora** (requiere funcionalidad nueva que no existe):
- Sidebar minimo / tab bar superior (requiere layout propio del POS, hoy vive dentro de BranchLayout)
- Barra inferior de pedidos activos (requiere soporte de multiples pedidos simultaneos)
- Llamadores con estado "ocupado" (requiere query de pedidos activos por llamador)
- Preseleccion inteligente basada en frecuencia de canal
- Micro-animaciones de vuelo de badge "+1" (complejidad alta, bajo impacto)
- Badge de stock bajo en cards (no hay modulo de stock conectado)

---

## Cambios a Implementar

### 1. Layout de Zonas Diferenciadas

Reemplazar el fondo uniforme por zonas con identidad visual:

- **Zona B (catalogo/grilla):** Fondo `slate-100` (`bg-slate-100`) para que las cards blancas resalten
- **Zona C (cuenta):** Fondo blanco, es el "papel" del pedido
- **Zona A (header):** Se elimina el PageHeader y se usa un header compacto inline con el nombre de la sucursal

**Archivo:** `src/pages/pos/POSPage.tsx`
- Quitar `<PageHeader>` del POS
- Aplicar `bg-slate-50` o `bg-slate-100` a la columna izquierda (grilla)
- La columna derecha mantiene fondo blanco

### 2. Modal de Nueva Venta reemplazado por Panel en Zona C

Actualmente hay un modal centrado con overlay oscuro (`fixed inset-0 bg-black/60`). La guia pide que la configuracion de nueva venta viva en el panel derecho (Zona C), y la grilla muestre un estado vacio.

**Archivo:** `src/pages/pos/POSPage.tsx`
- Eliminar el div `fixed inset-0` del modal de configuracion
- Cuando `!configConfirmed`: mostrar el `ConfigForm` dentro de la columna derecha (donde va la cuenta), y en la columna izquierda mostrar un estado vacio con icono y texto "Configura el pedido para ver el menu"
- Cuando `configConfirmed`: mostrar ProductGrid + AccountPanel como ahora

### 3. Grilla de Llamadores Mejorada

Actualmente los 30 llamadores estan en una grilla `grid-cols-6` con `max-h-44 overflow-y-auto` (requiere scroll). La guia pide que se vean todos sin scroll.

**Archivo:** `src/components/pos/OrderConfigPanel.tsx`
- Cambiar la grilla de llamadores a `grid-cols-10` (o `grid-cols-6 sm:grid-cols-10`) sin `max-h` ni `overflow-y-auto`
- Reducir el tamanio de cada boton para que quepan todos (`h-8` en vez de `h-10`)
- Los estados visuales (disponible, seleccionado) ya existen. Los estados "ocupado" se dejan para cuando haya query de pedidos activos.

### 4. Cards de Productos: Consistencia Visual

**Archivo:** `src/components/pos/ProductGrid.tsx`
- Fondo uniforme para zona de imagen: `bg-slate-100` en vez de `bg-muted`
- Precio mas grande y prominente: `text-base font-bold` en vez de `text-xs font-semibold`
- Nombre: `text-sm font-semibold` (ya esta similar)
- Badge de cantidad: ya existe, mantener

### 5. Tabs de Categoria con Indicador de Items en Pedido

**Archivo:** `src/components/pos/ProductGrid.tsx`
- Agregar un punto indicador (dot) en las tabs de categorias que tienen items en el carrito
- Calcular `categoriesWithItems` a partir del `cart` + `items` (mapear item_carta_id a categoria)
- Mostrar un circulito junto al nombre de la categoria activa

### 6. Panel de Cuenta: Header Compacto + Colores de Pago

**Archivo:** `src/components/pos/AccountPanel.tsx`

Header de cuenta:
- Agregar props `orderConfig` al AccountPanel
- Mostrar resumen compacto: canal + servicio + llamador/nombre
- Boton "Editar" que llame a un callback para reabrir la config

Colores por medio de pago:
- Efectivo: verde (`bg-emerald-500/10 border-emerald-500/20`)
- Debito: azul (`bg-blue-500/10 border-blue-500/20`)
- Credito: violeta (`bg-violet-500/10 border-violet-500/20`)
- QR MP: celeste (`bg-sky-500/10 border-sky-500/20`)
- Transferencia: indigo (`bg-indigo-500/10 border-indigo-500/20`)

Area de saldo con fondo contextual:
- Falta cobrar: `bg-amber-50 text-amber-800`
- Cobrado ($0): `bg-emerald-50 text-emerald-800`

Boton "Enviar a cocina":
- Deshabilitado: gris con texto contextual (ya implementado)
- Habilitado: `bg-emerald-500 hover:bg-emerald-600`, mas alto (`h-14`), con icono y detalle de items + total

### 7. RegisterPaymentPanel: Colores por Metodo

**Archivo:** `src/components/pos/RegisterPaymentPanel.tsx`
- Aplicar colores distintos a cada boton de metodo de pago cuando esta seleccionado (verde para efectivo, azul para debito, etc.)

---

## Archivos a Modificar

| Archivo | Cambio Principal |
|---|---|
| `src/pages/pos/POSPage.tsx` | Layout de zonas, reemplazar modal por panel lateral, quitar PageHeader |
| `src/components/pos/ProductGrid.tsx` | Fondo de cards, precio mas grande, dots en tabs de categoria |
| `src/components/pos/AccountPanel.tsx` | Header con config, colores por metodo de pago, area de saldo con fondo, boton enviar mejorado |
| `src/components/pos/OrderConfigPanel.tsx` | Grilla de llamadores sin scroll (grid-cols-10, sin max-h) |
| `src/components/pos/RegisterPaymentPanel.tsx` | Colores por metodo de pago |

## Archivos que NO se tocan

- Logica de pagos, caja, pedidos (sin cambios funcionales)
- BranchLayout / sidebar (el cambio a sidebar minimo o tab bar es un proyecto aparte)
- Base de datos (no hay migraciones)

---

## Orden de Implementacion

1. `POSPage.tsx` - Layout de zonas + panel lateral en vez de modal
2. `OrderConfigPanel.tsx` - Grilla de llamadores mejorada
3. `ProductGrid.tsx` - Cards consistentes + dots en tabs
4. `AccountPanel.tsx` - Header, colores, area de saldo, boton mejorado
5. `RegisterPaymentPanel.tsx` - Colores por metodo

