# Especificación: Delivery como servicio, Rappi/Peya/MP, RDO y promociones

**Fecha:** Febrero 2026  
**Estado:** Decisiones y plan de implementación

---

## 1. Vender el servicio de logística de Delivery a los clientes

### Pregunta
¿Crear "Delivery" como ítem de carta o dejarlo integrado en otra parte más lógica? Se usa sobre todo en la WebApp y ahí debe entrar automáticamente.

### Decisión recomendada: **Integrado, no como ítem de carta**

- **WebApp:** El costo de envío ya entra automáticamente:
  - Se calcula con la función `calculate-delivery` (distancia/barrio).
  - En el checkout se muestra y se envía como `delivery_cost_calculated` en `create-webapp-order`.
  - El pedido se guarda con `costo_delivery` y `total = subtotal + costo_delivery`.

- **No conviene** un ítem de carta "Envío" porque:
  - En la web el precio depende de la dirección (dinámico).
  - Duplicaría lógica (precio en ítem vs precio calculado).
  - El RDO y la facturación ya pueden tratar el monto de envío como parte del total del pedido.

- **Opcional (futuro):** Si se quisiera mostrar "Envío" como línea en el ticket/POS para pedidos por Apps (Rappi/Peya/MP), se puede mostrar en el resumen del pedido como concepto, sin ser ítem de carta. Ya se implementa el campo **costo envío cobrado al cliente** para esos pedidos (ver punto 2).

**Resumen:** Dejarlo integrado. En WebApp ya está; para pedidos por Apps en mostrador se agrega el campo para cargar el costo de envío que se cobra al cliente.

---

## 2. Pedidos Rappi / Peya / Mercado Pago por mostrador – Costo de envío

### Necesidad
Cuando el pedido entra por Rappi/Peya/MP y se pasa por el mostrador, poder cargar el **costo de envío que se le cobra al cliente** (un click / campo).

### Implementación

- **OrderConfig** (POS): Se agrega `costoDelivery?: number` (opcional). Solo relevante cuando `canalVenta === 'apps'`.
- **OrderConfigPanel:** Cuando el canal es "Apps Delivery", se muestra un campo numérico: **"Costo envío cobrado al cliente ($)"**. Por defecto 0.
- **Creación del pedido:** Al crear el pedido desde POS con canal Apps:
  - `pedidos.costo_delivery` = valor ingresado.
  - `pedidos.subtotal` = suma de ítems (sin envío).
  - `pedidos.total` = subtotal - descuento + costo_delivery + propina (si aplica).

Con esto el RDO y los reportes ya incluyen ese ingreso en el total del pedido, y se puede desglosar por `costo_delivery` si hace falta.

---

## 3. RDO económico: “Venta” y “Pago” de Delivery

### Situación actual

- **RDO Multivista:** La vista `rdo_multivista_ventas_base` usa `p.total` por pedido. Ese total **ya incluye** el `costo_delivery` cuando existe. Es decir, la “venta” de delivery ya está sumada en el resultado por canal/día.
- **Categorías RDO (costos):** Bajo `delivery` están:
  - `cadetes_rappiboy` – Pago a RappiBoys
  - `cadetes_terceros` – Cadetes terceros

Es decir: **lado pago** (gastos a cadetes) ya tiene categorías; **lado venta** (lo que cobrás por envío) está dentro del total del pedido.

### Qué tenés hoy

- **Venta:** Todo lo que cobrás (productos + envío) está en `pedidos.total` y se refleja en el RDO por canal.
- **Pago:** Los gastos a cadetes (Rappiboy, terceros) se cargan en conceptos/gastos con `rdo_category_code` en `cadetes_rappiboy` o `cadetes_terceros`.

### Mejora opcional (reporte)

Si querés ver en el RDO una línea explícita **“Entrega Delivery”** o **“Venta por envío”**:

- Opción A: En el reporte RDO Multivista, agregar un desglose que sume `pedidos.costo_delivery` por período/canal y lo muestre como fila “Entrega Delivery” en la sección de ventas/ingresos.
- Opción B: Dejar el total como está y solo usar filtros por canal (webapp vs rappi vs mostrador) para analizar; el detalle de envío se puede ver en reportes de pedidos (`costo_delivery`).

Recomendación: implementar **Opción A** en la vista/export del RDO cuando se priorice el desglose “Venta delivery” vs “Venta productos”.

---

## 4. Promociones, efectivo, códigos y panel por tipo de usuario

### Requerimientos resumidos

1. Ciertos productos solo permiten **pago en efectivo** en la tienda online si tienen promociones determinadas.
2. Promociones que varían por **día y hora**.
3. **Panel de promociones fijas** (ej. “2x1 Lunes a Jueves”).
4. **Códigos de descuento** aplicables en la WebApp.
5. **Panel de promociones** que permita asignar promociones según **tipo de usuario** (ej. invitado, registrado, segmento).

### Estado actual en el proyecto

- **Precio de referencia / descuento:** Existe `precio_referencia` en ítems de carta y en `pedido_items`; se usa para calcular descuento promocional (ej. en `usePromoDiscountData` y en la guía de precios/promos). No hay aún restricción “solo efectivo” por producto/promo.
- **Cupones:** No hay tabla de códigos de descuento ni aplicación en checkout.
- **Promociones por día/hora o por usuario:** No hay modelo ni panel.

### Plan de implementación sugerido (por fases)

**Fase 4.1 – Restricción “solo efectivo” para productos/promos**

- En **items_carta** (o en una tabla de reglas de promo por item): campo o flag `solo_efectivo_en_webapp` (o asociado a una “promo” que lo exija).
- En **WebApp (checkout):** Si el carrito contiene algún producto con esa restricción, deshabilitar Mercado Pago y dejar solo “Pago en efectivo al recibir”.
- Documentar en Centro de Costos / carta que ese producto es “promo efectivo”.

**Fase 4.2 – Panel de promociones fijas**

- Nueva tabla, ej. `promociones` (o `promociones_fijas`): branch_id, nombre, descripción, tipo (porcentaje, monto fijo, 2x1, etc.), fechas vigencia, días de semana, hora_desde, hora_hasta, activa.
- Relación con productos/categorías (qué ítems aplican).
- En WebApp y POS: al armar pedido, aplicar la promo si aplica por día/hora y ítem.

**Fase 4.3 – Códigos de descuento (cupones)**

- Tabla `cupones` o `codigos_descuento`: branch_id o brand_id, código, tipo (porcentaje / monto fijo), valor, vigencia, usos máximos, usos por usuario.
- En **create-webapp-order** (y en checkout): aceptar parámetro `codigo_descuento`, validar y descontar del total (y opcionalmente registrar en pedido el cupón usado).
- En admin: pantalla para crear/editar/listar códigos.

**Fase 4.4 – Promociones por tipo de usuario**

- En `promociones` (o tabla equivalente): campo o tabla de asignación por “tipo de usuario”: invitado, registrado, o segmento (ej. por tags en `profiles` o por lista).
- En la WebApp, al calcular precios y descuentos, considerar si el usuario está logueado y su tipo/segmento y aplicar solo las promociones que correspondan.

**Mostrar promociones en efectivo en la web**

- En ficha de producto o en lista: badge o texto “Promo en efectivo” cuando `precio_referencia > precio_base` y/o cuando el producto tiene restricción “solo efectivo”.
- En checkout: mensaje claro “Este pedido incluye promociones que solo pueden pagarse en efectivo”.

---

## 5. (Sin contenido)

Punto dejado vacío para completar luego.

---

## Resumen de acciones

| # | Tema | Estado |
|---|------|--------|
| 1 | Venta de delivery — integrado, no como ítem de carta | IMPLEMENTADO |
| 2 | Rappi/Peya/MP en mostrador | Campo “Costo envío cobrado al cliente” en config del pedido (Apps) y persistir en `pedidos.costo_delivery` y en el total. **Implementado en código.** |
| 3 | RDO venta vs pago delivery | Venta ya en total; pago en categorías cadetes. Opcional: desglose “Entrega Delivery” en reporte RDO. |
| 4 | Promos efectivo, cupones, panel, por usuario | **IMPLEMENTADO v2** — Tablas `promociones`, `promocion_items`, `codigos_descuento`, `codigos_descuento_usos`. Columna `canales` en `promociones` para segmentar por canal (salon/webapp/rappi/pedidos_ya). Admin: PromocionesPage reworked con importación de productos, precios promo por item, selección de canales. POS: ProductGrid muestra badges PROMO y diálogo para aplicar precio promo. WebApp: promos webapp se aplican al menú vía useActivePromoItems. |
| 5 | Delivery hours (franjas horarias) | **IMPLEMENTADO** — Columna `delivery_hours` JSONB en `branch_delivery_config`. Admin: editor de franjas por día en BranchDeliveryDetailPage. Edge function calculate-delivery verifica horario. WebApp: DeliveryUnavailable para `outside_hours`. |
| 6 | POS fields visibility (Apps-only) | **IMPLEMENTADO** — "Costo envío cobrado al cliente" solo aparece en canal Apps, no en mostrador+delivery. |
| 7 | Mi Local menu visibility | **IMPLEMENTADO** — UserMenuDropdown usa usePermissionsWithImpersonation para soportar roles en user_branch_roles (encargado, etc). |
