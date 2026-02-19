

# Mejoras POS - Plan de Implementacion

Basado en el analisis, filtro lo que tiene impacto real considerando que ya resolvimos ModifiersModal, ProductGrid con fotos, y PaymentModal con botones. Quedan 4 cambios de alto impacto y una limpieza.

---

## Cambio 1: Desbloquear la grilla (eliminar "Comenzar venta")

El analisis tiene razon: obligar al cajero a hacer clic en "Comenzar venta" cuando los defaults ya son correctos (Mostrador + Takeaway) es friccion innecesaria. El 80% de las ventas no necesita cambiar la config.

**Cambio en `POSPage.tsx`**:
- Eliminar el estado `saleStarted` y toda la logica asociada
- Eliminar el overlay con blur que bloquea la grilla
- Eliminar el placeholder "El carrito aparecera aca"
- La grilla y el carrito estan siempre visibles y funcionales
- `OrderConfigPanel` arranca en modo compacto mostrando "Mostrador > Para llevar" con boton "Editar"
- La validacion de config se hace solo al momento de "Cobrar" (como ya lo hace `handleCobrar`)

**Cambio en `OrderConfigPanel.tsx`**:
- Eliminar el boton "Comenzar venta" (`onConfirm` ya no se necesita en modo inicial)
- Siempre renderizar en modo `compact` con summary line + boton editar
- Quitar la prop `onConfirm` del uso principal

---

## Cambio 2: Notas por item en el carrito

El campo `notas` ya existe en `CartItem` pero no hay UI. Agregar un input inline.

**Cambio en `OrderPanel.tsx`**:
- Agregar un icono de "nota" (MessageSquare) en cada item del carrito
- Al clickear, se abre un input inline debajo del item para escribir la nota
- Si el item ya tiene notas (de ModifiersModal), mostrarlas en texto chico debajo del nombre
- Agregar prop `onUpdateNotes: (index: number, notes: string) => void` al componente

**Cambio en `POSPage.tsx`**:
- Agregar handler `updateNotes` que modifica las notas de un item en el carrito

---

## Cambio 3: Montos rapidos en cobro efectivo

Cuando se paga en efectivo, agregar botones de acceso rapido con billetes comunes.

**Cambio en `PaymentModal.tsx`**:
- Cuando `metodo === 'efectivo'`, debajo del input "Monto recibido" agregar una fila de botones:
  - "Exacto" (pone el total exacto)
  - Billetes redondeados: el sistema calcula los 3-4 billetes mas probables que el cliente entregaria (ej: si el total es $8.500, muestra $9.000, $10.000, $15.000, $20.000)
- Al tocar un boton, se llena el input automaticamente y se muestra el vuelto

---

## Cambio 4: Barra sticky mobile con total + Cobrar

En mobile, el boton "Cobrar" queda enterrado al fondo del scroll. Necesita estar siempre visible.

**Cambio en `POSPage.tsx`**:
- Agregar una barra fija al fondo de la pantalla visible solo en mobile (`lg:hidden`)
- Muestra: "Items: X | Total: $X.XXX" + boton "Cobrar" grande
- Solo aparece cuando hay items en el carrito
- En desktop no cambia nada (el OrderPanel ya tiene el boton visible)

---

## Cambio 5: Limpieza de stubs muertos

Eliminar componentes que retornan `null` y no tienen uso real. Mantiene el codigo limpio.

**Archivos a eliminar**:
- `src/components/pos/DeliveryCard.tsx` (no usado en DeliveryPage)
- `src/components/pos/KitchenCard.tsx` (no usado en KitchenPage)
- `src/components/pos/RegisterCloseModal.tsx` (cierre se hace inline en RegisterPage)
- `src/components/pos/StockAlert.tsx` (nunca implementado)
- `src/components/pos/DiscountModal.tsx` (stub vacio, se implementara cuando se defina la logica de descuentos)

**Verificacion**: buscar imports de estos componentes y eliminarlos tambien.

---

## Que NO hago (y por que)

| Sugerencia del analisis | Razon para postergar |
|---|---|
| Busqueda en ProductGrid | Las tabs de categoria ya resuelven la navegacion. Si el menu crece a 50+ items se agrega |
| Seccion "Frecuentes" | Requiere datos de ventas historicas que aun no se generan en volumen |
| DiscountModal completo | Necesita definicion de reglas de negocio (% fijo, monto, promos, cortesias) antes de implementar |
| Reorganizar RegisterPage con tabs | Es un cambio grande que no impacta el flujo de venta diario |
| KitchenPage con urgencia/sonidos | Valido pero es un modulo separado, no afecta al POS del cajero |
| Bottom sheet para carrito mobile | La barra sticky es mas simple y resuelve el 90% del problema. El bottom sheet agrega complejidad de UI |

---

## Resumen de archivos

| Archivo | Cambio |
|---|---|
| `src/pages/pos/POSPage.tsx` | Eliminar saleStarted, config siempre compact, barra sticky mobile, handler notas |
| `src/components/pos/OrderConfigPanel.tsx` | Eliminar boton "Comenzar venta", siempre compact |
| `src/components/pos/OrderPanel.tsx` | UI de notas por item |
| `src/components/pos/PaymentModal.tsx` | Botones de monto rapido en efectivo |
| 5 archivos stub | Eliminar |

