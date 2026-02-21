
# Fix: 3 Puntos de Fuga + Bug Post-Confirmacion en la WebApp

## Resumen

Hay 4 problemas donde el usuario es expulsado de la tienda o ve una pantalla incorrecta. Todos se resuelven manteniendo al usuario DENTRO de `/pedir/:slug`, usando Sheets y paneles inline.

---

## Problema 1: Banner "Ver estado" no funciona en mobile

**Causa**: `ActiveOrderBanner.onShowTracking` solo alimenta `CartSidePanel` (desktop). En mobile, `CartSheet` nunca recibe el tracking code ni se abre.

**Solucion**: En `PedirPage.tsx`, cuando `externalTrackingCode` cambia, tambien abrir el `CartSheet` en mobile con step `tracking`.

**Archivo**: `PedirPage.tsx`
- Agregar un `useEffect` que reaccione a `externalTrackingCode`: si tiene valor, setear `cartOpen=true` y `cartInitialStep='tracking'` (o un nuevo estado `trackingCodeForSheet`).
- Pasar `externalTrackingCode` como prop al `CartSheet`.

**Archivo**: `CartSheet.tsx`
- Agregar prop `externalTrackingCode?: string | null`.
- Cuando reciba un tracking code externo, setear `step='tracking'` y `trackingCode` internamente.

---

## Problema 2: "Mis pedidos" navega fuera de la tienda

**Causa**: `UserMenuDropdown` hace `navigate('/cuenta/pedidos')`.

**Solucion**: Crear un `MisPedidosSheet` que se abre inline dentro de la tienda. Extraer la logica de lista de `MisPedidosPage` a un componente reutilizable.

**Archivos nuevos**:
- `src/components/webapp/MisPedidosSheet.tsx` — Sheet (mobile) / Dialog (desktop) que muestra el historial de pedidos inline.

**Archivo modificado**: `UserMenuDropdown.tsx`
- Agregar prop `onMisPedidos?: () => void`.
- Si existe `onMisPedidos`, llamarlo en vez de `navigate('/cuenta/pedidos')`.
- Cuando se usa dentro de la tienda, pasar el callback.

**Archivo modificado**: `WebappMenuView.tsx`
- Pasar `onMisPedidos` callback a `UserMenuDropdown`.
- Manejar estado `misPedidosOpen` y renderizar `MisPedidosSheet`.

**Archivo modificado**: `PedirPage.tsx`
- Pasar callback `onMisPedidosTrack` para que desde el sheet de "Mis pedidos", el boton "Ver tracking" abra el CartSheet/CartSidePanel en modo tracking (mismo mecanismo que Problema 1).

---

## Problema 3: "Ver tracking" navega fuera de la tienda

**Causa**: En `MisPedidosPage` y el futuro `MisPedidosSheet`, el boton "Ver tracking" hace `navigate('/pedido/:code')`.

**Solucion**: Dentro del `MisPedidosSheet`, el boton "Ver tracking" cierra el sheet y dispara el tracking inline (via `externalTrackingCode`).

La ruta `/pedido/:code` sigue existiendo como fallback para links externos.

**Implementacion**: El `MisPedidosSheet` recibe un callback `onShowTracking(trackingCode)` que:
1. Cierra el sheet de Mis Pedidos
2. Abre el CartSheet/CartSidePanel en modo tracking

---

## Problema 4: Post-confirmacion muestra "Tu carrito esta vacio"

**Causa**: En `CartSheet.tsx` linea 360, la condicion `cart.items.length === 0` se evalua ANTES de verificar `step === 'tracking'`. Despues de confirmar un pedido el carrito se limpia, asi que se muestra el estado vacio en vez del tracking.

**Solucion**: Reorganizar la logica condicional para que `step === 'tracking'` se verifique PRIMERO, antes del check de carrito vacio.

**Archivo**: `CartSheet.tsx`
- Mover el bloque `step === 'tracking'` ANTES del check `cart.items.length === 0`.
- Actualizar el header para mostrar titulo contextual cuando step es tracking.
- Ocultar el stepper visual cuando step es tracking.

---

## Detalle tecnico de cambios por archivo

| Archivo | Tipo | Cambios |
|---------|------|---------|
| `CartSheet.tsx` | Modificar | Reordenar logica (tracking antes de carrito vacio), agregar prop `externalTrackingCode`, actualizar header para tracking |
| `CartSidePanel.tsx` | Sin cambios | Ya funciona correctamente |
| `PedirPage.tsx` | Modificar | Conectar banner con CartSheet en mobile, manejar estado de MisPedidosSheet |
| `UserMenuDropdown.tsx` | Modificar | Agregar prop `onMisPedidos` opcional |
| `WebappMenuView.tsx` | Modificar | Pasar `onMisPedidos` y renderizar MisPedidosSheet |
| `MisPedidosSheet.tsx` | Crear | Sheet inline con lista de pedidos, botones "Ver tracking" y "Repetir" |
| `MisPedidosPage.tsx` | Sin cambios | Se mantiene para uso fuera de la tienda (en /cuenta) |
