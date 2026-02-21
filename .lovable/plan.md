

# Fix de Navegacion Inline + 7 Bugs del CartSidePanel

## Resumen

La implementacion anterior creo los sheets (PerfilSheet, DireccionesSheet) y los conecto a PedirPage, pero hay problemas pendientes del prompt original mas 7 bugs criticos en el CartSidePanel de desktop.

---

## Parte 1: Verificar y corregir Sheets inline

Los sheets ya existen y estan conectados en PedirPage. Verificar que los callbacks `onMiPerfil` y `onMisDirecciones` se pasan correctamente a traves de toda la cadena: PedirPage -> WebappMenuView -> WebappHeader -> UserMenuDropdown. Si hay algun eslabon roto, corregirlo.

**Archivos**: `UserMenuDropdown.tsx`, `WebappHeader.tsx`, `WebappMenuView.tsx`, `PedirPage.tsx`

---

## Parte 2: Landing - ya implementada

El header transparente con scroll ya funciona en Index.tsx. Se verifica que no haya logo duplicado en el hero (ya fue removido).

---

## Parte 3: BranchLanding - ya usa WebappHeader

Verificado que BranchLanding.tsx ya importa y usa WebappHeader.

---

## Parte 4: TrackingPage - ya usa WebappHeader

Verificado que TrackingPage.tsx ya importa WebappHeader.

---

## Parte 5: CuentaLayout - "Ir a la Tienda"

Ya tiene el boton con ShoppingBag. Verificar que funciona correctamente.

---

## Parte 6: Paginas institucionales con carrito

Ya implementado en Nosotros.tsx. Verificar Franquicias.tsx y Contacto.tsx.

---

## Bugs criticos del CartSidePanel (Parte 7)

### Bug 7A: "Ver estado" del banner no funciona en desktop

**Problema**: El `useEffect` en CartSidePanel que escucha `externalTrackingCode` no se re-dispara si el valor no cambia.

**Solucion**: Agregar un `trackingTrigger` counter en PedirPage que se incrementa cada vez que se llama `handleShowTracking`. Pasar ese trigger como prop a CartSidePanel y usarlo como dependencia del useEffect.

**Archivos**: `PedirPage.tsx`, `CartSidePanel.tsx`

### Bug 7B: "Pedir algo mas" destruye el tracking sin retorno

**Problema**: `handleNewOrder` borra `localStorage` y el trackingCode, perdiendo toda referencia al pedido activo.

**Solucion**: Implementar un sistema de tabs con multiples pedidos activos:
- Cambiar de un unico `trackingCode` a un array `activeOrders: string[]`
- Agregar un `selectedTab: 'cart' | string` (string = trackingCode)
- "Pedir algo mas" cambia a tab 'cart' sin borrar los pedidos activos
- Los pedidos se remueven de tabs cuando llegan a estado terminal (entregado/cancelado)
- Renderizar tabs en la parte superior del panel

**Archivo**: `CartSidePanel.tsx`

### Bug 7C: ActiveOrderBanner solo muestra UN pedido

**Problema**: La query usa `.limit(1)`.

**Solucion**: Quitar el `.limit(1)` y usar `.maybeSingle()` cambiado a select normal. Si hay multiples pedidos activos, mostrar "Tenes N pedidos activos -- Ver estado". Si hay uno solo, mantener el formato actual.

**Archivo**: `ActiveOrderBanner.tsx`

### Bug 7D: Posicionamiento fijo del side panel con `top-[114px]` hardcodeado

**Problema**: El valor 114px no se ajusta cuando el header cambia de altura (con/sin banner, con/sin search bar).

**Solucion**: Cambiar de layout `fixed` a un layout flex integrado. El side panel se convierte en un `aside` sticky dentro del layout flex principal de WebappMenuView, eliminando el posicionamiento fijo.

**Archivos**: `CartSidePanel.tsx`, `WebappMenuView.tsx` (o `PedirPage.tsx`)

### Bug 7E: Upsell aparece con carrito vacio

**Problema**: Las sugerencias de "Queres agregar algo mas?" se muestran incluso cuando el carrito esta vacio despues de un pedido, lo cual es confuso.

**Solucion**: Mover el bloque de upsell dentro de la condicion `cart.items.length > 0`. Si el carrito esta vacio y no hay tracking activo, mostrar el estado vacio limpio.

**Archivo**: `CartSidePanel.tsx`

### Bug 7F: "Ver estado" abre CartSheet mobile en desktop

**Problema**: El `useEffect` en PedirPage que escucha `externalTrackingCode` siempre hace `setCartOpen(true)`, lo cual abre el CartSheet de mobile incluso en desktop.

**Solucion**: Solo abrir CartSheet cuando no hay side panel visible (`!showSidePanel`).

```typescript
useEffect(() => {
  if (externalTrackingCode && !showSidePanel) {
    setCartOpen(true);
  }
}, [externalTrackingCode]);
```

**Archivo**: `PedirPage.tsx`

---

## Resumen de archivos a modificar

| Archivo | Cambios |
|---------|---------|
| `CartSidePanel.tsx` | Sistema multi-pedido con tabs, fix upsell solo con items, cambiar de fixed a layout flex/sticky, trigger externo para tracking |
| `PedirPage.tsx` | Agregar trackingTrigger counter, fix CartSheet solo en mobile, pasar trigger a CartSidePanel |
| `ActiveOrderBanner.tsx` | Soportar multiples pedidos activos, quitar .limit(1) |
| `WebappMenuView.tsx` | Ajustar layout para integrar side panel como flex child en vez de fixed |
| `Franquicias.tsx` | Agregar showCart con lectura de localStorage |
| `Contacto.tsx` | Agregar showCart con lectura de localStorage |

## Detalle tecnico del sistema de tabs

```text
Estado del CartSidePanel:
  activeOrders: string[]        -- tracking codes de pedidos activos
  selectedTab: 'cart' | string  -- 'cart' para carrito nuevo, o un trackingCode

UI:
  +--------------------------------------------+
  |  [Carrito (2)]  [#64 Prep.]  [#65 Enviado] |  <-- tabs
  +--------------------------------------------+
  |  (contenido segun tab seleccionada)        |
  +--------------------------------------------+

Flujos:
  - Pedido confirmado -> se agrega code a activeOrders, selectedTab = code
  - "Pedir algo mas" -> selectedTab = 'cart' (no borra activeOrders)
  - Pedido entregado/cancelado -> se remueve de activeOrders
  - Click en tab -> cambia selectedTab
```

