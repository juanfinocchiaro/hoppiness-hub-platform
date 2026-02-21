# GUÍA DE REDISEÑO: WebApp de Pedidos Hoppiness Club
## Auditoría UX/UI completa + Plan de trabajo para Lovable

> **Fecha:** Febrero 2026
> **Basado en:** Análisis de código fuente (React/TypeScript/Supabase), 22 capturas de pantalla de Hoppiness, y benchmarking contra DoorDash, Rappi y McDonald's.
> **Objetivo:** Llevar la experiencia de pedidos online de Hoppiness al nivel de las mejores apps del mundo.

---

## RESUMEN EJECUTIVO

La webapp actual tiene una base técnica sólida (tipos bien definidos, hooks separados, soporte para delivery/retiro/comer acá, MercadoPago integrado, zonas de delivery, tracking de pedidos). Sin embargo, la experiencia visual y de flujo tiene gaps significativos vs. las referencias internacionales. Este documento lista **42 problemas concretos** agrupados en 8 áreas, cada uno con contexto, impacto y solución implementable.

---

## ÁREA 1: FLUJO DE SERVICIO — "¿Es delivery? ¿Es take away?"

### Problema 1.1: Pantalla completa innecesaria para elegir tipo de servicio
- **Archivo:** `src/components/webapp/BranchLanding.tsx`
- **Contexto:** Hoy, cuando el local está abierto, BranchLanding muestra una pantalla entera solo para preguntar "¿Cómo querés tu pedido?" con 1-3 botones. El usuario debe hacer 1 click extra antes de ver el menú. En DoorDash esto es un toggle simple (Delivery | Pickup) integrado en el header del menú.
- **Impacto:** Alto. Agrega fricción innecesaria y una pantalla que no aporta valor. El usuario quiere ver el menú lo antes posible.
- **Solución:** Eliminar BranchLanding como step intermedio cuando el local está abierto. Integrar el selector de tipo de servicio como un toggle/pill group dentro del header de WebappMenuView. El toggle debe mostrar los servicios habilitados con su tiempo estimado (ej: "Retiro ~15min | Delivery ~40min"). Si solo hay un servicio habilitado, auto-seleccionarlo sin mostrar toggle. BranchLanding solo se usa cuando el local está cerrado/pausado.

### Problema 1.2: No queda claro qué tipo de servicio se seleccionó
- **Archivo:** `src/components/webapp/WebappMenuView.tsx` (línea del header)
- **Contexto:** El header muestra "🛒 Retiro en local · ~20 min" como texto pequeño bajo el nombre del local. Es fácil de pasar por alto y no es interactivo (no se puede cambiar sin volver atrás).
- **Impacto:** Medio. El usuario puede avanzar sin certeza de qué eligió, y si quiere cambiar debe retroceder.
- **Solución:** Reemplazar el texto pasivo por el toggle/pill interactivo mencionado en 1.1. Al cambiar de tipo de servicio, el carrito se mantiene pero se recalcula el costo de envío y se muestran/ocultan campos de dirección en checkout.

### Problema 1.3: Falta de información de contexto sobre cada servicio
- **Contexto:** En Rappi/DoorDash, junto al toggle de servicio se muestra: dirección de pickup + mapa, tiempo estimado, costo de envío si aplica, y en pickup el tiempo de preparación. En Hoppiness solo se muestra "~20 min".
- **Solución:** En modo Retiro, mostrar la dirección del local con link a Google Maps. En modo Delivery, mostrar el costo de envío y el pedido mínimo si aplica. Los datos ya existen en `WebappConfig` (delivery_costo, delivery_pedido_minimo, tiempo_estimado_retiro_min, tiempo_estimado_delivery_min).

---

## ÁREA 2: MENÚ Y CATÁLOGO DE PRODUCTOS

### Problema 2.1: Nombres de productos truncados con "..."
- **Archivo:** `src/components/webapp/ProductCard.tsx` (clase `line-clamp-1` y `truncate`)
- **Contexto:** En desktop las cards usan `line-clamp-1` y en mobile list layout usan `truncate`. Esto produce "Ba...", "A...", "Vi...", "Ch...", "Fri...", "Co..." en la vista con carrito abierto (imagen 6 de Hoppiness). El usuario literalmente no puede saber qué hamburguesa es.
- **Impacto:** Crítico. El producto más importante de la tienda es ilegible. Esto no pasa en DoorDash ni Rappi.
- **Solución:** Usar `line-clamp-2` mínimo en todos los layouts. Priorizar el uso de `nombre_corto` (el campo ya existe en WebappMenuItem pero muchos productos no lo tienen cargado). Asegurar que las cards tengan suficiente ancho mínimo. En el layout desktop con carrito visible, las product cards se comprimen demasiado — ajustar el grid a `grid-cols-2` máximo cuando el carrito sidebar está visible.

### Problema 2.2: Descripciones insuficientes
- **Contexto:** Muchos productos muestran "Medallón de carne 100gr, cheddar, bacon y salsa..." truncado. En DoorDash, cada producto muestra nombre completo + descripción + rango calórico + badges de promo.
- **Solución:** En la card del menú, mostrar al menos los 3-4 ingredientes principales sin truncar. Considerar un formato "ingredientes como tags" (chips pequeños) en vez de texto corrido. Asegurar que `descripcion` de cada item esté completa en la base de datos.

### Problema 2.3: Falta sección "Populares" o "Más pedidos"
- **Contexto:** DoorDash tiene "Featured Items" y "Most Ordered" como primeras secciones. Rappi tiene "Populares" con badge de conteo. Hoppiness arranca directo con "Promociones en efectivo" (1 solo producto).
- **Solución:** Agregar una sección "Más pedidos" al inicio del menú, alimentada por datos reales de ventas de la webapp o POS (query a `webapp_pedido_items` agrupado por item_carta_id, top 6). Si no hay datos suficientes, permitir que el admin configure manualmente los "destacados" en webapp_config.

### Problema 2.4: Buscador ocupa mucho espacio y no aporta en catálogos chicos
- **Archivo:** `src/components/webapp/WebappMenuView.tsx`
- **Contexto:** El buscador está siempre visible ocupando una línea completa. Con ~20 productos el usuario puede scrollear más rápido que buscar.
- **Solución:** En mobile, colapsar el buscador a un ícono de lupa que se expande al tocar. En desktop, mantenerlo pero más compacto (integrado en el header, no en su propia línea).

### Problema 2.5: Sin badges de promoción ni descuentos visibles
- **Contexto:** Rappi muestra badges verdes "-30%" y precios tachados prominentemente. DoorDash muestra "Free on $15+". Hoppiness tiene la categoría "Promociones en efectivo" pero no hay indicadores visuales de descuento en las cards individuales.
- **Solución:** Si un producto tiene precio promocional o descuento, mostrar badge de porcentaje y precio anterior tachado directamente en la ProductCard. Agregar soporte en el modelo de datos si no existe (campo `precio_promo` o `descuento_porcentaje` en items_carta).

### Problema 2.6: Falta barra de promos/beneficios arriba del menú
- **Contexto:** Rappi muestra una barra horizontal con cards de beneficios ("Envío gratis", "50% OFF exclusivo Pro"). DoorDash muestra "$0 delivery fee, first order".
- **Solución:** Agregar un carrusel horizontal entre el header y las categorías con promos activas del local. Puede ser estático (configurado por admin en webapp_config) o dinámico basado en categorías de menú con descuento.

---

## ÁREA 3: CARRITO Y SIDEBAR

### Problema 3.1: El carrito sidebar comprime las product cards brutalmente
- **Archivo:** `src/components/webapp/WebappMenuView.tsx` (clase `lg:mr-[360px]`)
- **Contexto:** Cuando se abre el CartSidePanel (350px fijo), el contenido del menú se desplaza con `lg:mr-[360px]`. En pantallas de 1280-1366px esto deja ~800px para el menú con sidebar de categorías (200px) = ~600px para el grid de productos. Con `grid-cols-3` las cards se hacen minúsculas (imagen 6).
- **Impacto:** Alto. Los nombres pasan de legibles a completamente truncados.
- **Solución:** Cuando el carrito está visible en desktop, forzar `grid-cols-2` en el área de productos. Alternativamente, reducir el sidebar de categorías a 160px y el cart panel a 320px. El carrito sidebar debe ser un overlay/drawer en pantallas < 1440px en vez de empujar el contenido.

### Problema 3.2: En mobile, el checkout sale desde abajo como sheet
- **Archivo:** `src/components/webapp/CartSheet.tsx` (SheetContent side="bottom")
- **Contexto:** El carrito mobile y el checkout ambos usan un Sheet from bottom que ocupa 85vh. Esto está bien para el carrito (ver items), pero para el checkout (formulario largo con datos personales + dirección + pago + resumen) es incómodo — el usuario no ve el contexto del pedido mientras completa datos.
- **Impacto:** Medio-alto. El checkout es el momento más crítico del funnel. Un sheet from bottom no permite ver el header del local, no permite "volver al menú" fácilmente, y en mobile se siente encerrado.
- **Solución:** Mantener el Sheet para la vista del carrito (paso 1). Para el checkout (paso 2), navegar a una página dedicada full-screen (`/pedir/{slug}/checkout`) en vez de un sheet. Esto permite un layout más cómodo, header con breadcrumbs, y la sensación de estar en un paso formal de compra. Alternativamente, en desktop usar un Dialog modal más grande.

### Problema 3.3: Falta upsell/cross-sell en el carrito
- **Contexto:** DoorDash muestra "Complement your cart" con carrusel de productos sugeridos (papas, bebidas, postres) al ver el carrito (imagen 6 de DoorDash). Esto es cross-selling con impacto directo en ticket promedio.
- **Solución:** Agregar sección "¿Querés agregar algo más?" entre la lista de items y el resumen de precio en CartSheet/CartSidePanel. Mostrar items de categorías complementarias (si el usuario tiene hamburguesas, sugerir papas y bebidas). Puede ser un carrusel horizontal simple con miniatura + nombre + precio + botón "+".

### Problema 3.4: El carrito no persiste entre sesiones
- **Archivo:** `src/hooks/useWebappCart.ts`
- **Contexto:** El carrito usa `useState` puro. Si el usuario cierra el tab o refresca, pierde todo. DoorDash y Rappi persisten el carrito en localStorage.
- **Solución:** Persistir `items` y `tipoServicio` en localStorage con debounce. Al cargar, rehidratar el estado desde localStorage. Agregar expiración de 2 horas para limpiar carritos abandonados.

---

## ÁREA 4: DETALLE DE PRODUCTO Y PERSONALIZACIÓN

### Problema 4.1: Los extras/opcionales no son visibles ni claros
- **Archivo:** `src/components/webapp/ProductCustomizeSheet.tsx`
- **Contexto:** El hook `useWebappItemExtras` busca grupos opcionales de la tabla `item_carta_grupo_opcional`. Pero la UI actual no distingue entre opciones obligatorias y opcionales. No hay badge "Obligatorio" ni indicador de cuántas selecciones faltan. En DoorDash se muestra "Select Sauce 1/2 · Required · Select 1" con progreso. En Rappi: "Selección de acompañamiento · Obligatorio".
- **Impacto:** Alto. Si el usuario no selecciona un extra obligatorio, el pedido puede fallar o llegar incompleto.
- **Solución:** Agregar campo `es_obligatorio` y `max_selecciones` a `item_carta_grupo_opcional`. En la UI, mostrar badge "Obligatorio" o "Opcional" junto al nombre del grupo. Mostrar progreso: "Seleccioná 1 opción" con indicador visual. El botón "Agregar al carrito" debe indicar cuántas selecciones obligatorias faltan: "Completá 2 selecciones · $11.600" (patrón DoorDash).

### Problema 4.2: No se muestran los removibles ("Sin...")
- **Contexto:** El tipo `CartItem` tiene `removidos: string[]` y el CartSheet los muestra como "Sin pepino", pero en ProductCustomizeSheet no hay UI para seleccionar removibles. El modelo de datos (`item_carta_composicion.es_removible`) existe en la documentación pero no está implementado en la UI de la webapp.
- **Solución:** En ProductCustomizeSheet, agregar una sección "¿Querés sacar algo?" debajo de los extras. Mostrar los ingredientes marcados como removibles con toggles (switch on/off). Esto es especialmente importante para alergias e intolerancias.

### Problema 4.3: Precio dinámico no se actualiza visualmente al seleccionar extras
- **Archivo:** `src/components/webapp/ProductCustomizeSheet.tsx`
- **Contexto:** Actualmente el total se calcula como `(item.precio_base + extrasTotal) * cantidad` y se muestra en el botón "Agregar al carrito · $X". Esto funciona pero no hay feedback visual inmediato al seleccionar cada extra — el precio del botón cambia pero no hay animación ni highlight.
- **Solución:** Agregar transición suave al precio cuando cambia (ej: scale bounce o color flash). Mostrar el desglose: "Base: $11.600 + Extra cheddar: $1.500 = $13.100" encima del botón.

### Problema 4.4: La foto del producto es pequeña en el sheet
- **Contexto:** El sheet usa `h-48 lg:h-56` para la imagen. En Rappi/DoorDash desktop, el modal de producto usa ~40% del height para la imagen, creando un efecto hero que vende.
- **Solución:** En desktop (Dialog modal), usar una imagen más grande con aspect-ratio 16:9 o que ocupe al menos 300px de alto. En mobile, mantener el tamaño actual pero considerar hacer la imagen sticky para que se vea parcialmente mientras se scrollea las opciones.

---

## ÁREA 5: CHECKOUT Y PAGO — "¿Pago justo? ¿Hay vuelto? ¿MercadoPago?"

### Problema 5.1: No queda claro qué métodos de pago hay disponibles antes de llegar al checkout
- **Contexto:** El usuario no sabe si puede pagar con MercadoPago, efectivo, o ambos hasta que llega al último paso. En Rappi, los métodos de pago son prominentes desde el inicio.
- **Solución:** Mostrar íconos de métodos de pago disponibles en el header del menú o en la card del carrito: "💳 MercadoPago | 💵 Efectivo". Si solo acepta efectivo, mostrarlo antes para evitar que el usuario arme un pedido que luego no puede pagar como quiere.

### Problema 5.2: Falta campo "¿Con cuánto pagás?" para efectivo
- **Archivo:** `src/components/webapp/CartSheet.tsx`
- **Contexto:** Cuando el usuario selecciona "Efectivo" y el servicio es retiro, no hay campo para indicar con cuánto billete va a pagar. El local necesita preparar vuelto. En apps de delivery es estándar preguntar "¿Con cuánto pagás?" cuando se selecciona efectivo.
- **Solución:** Agregar campo numérico "¿Con cuánto pagás?" que aparece solo cuando `metodoPago === 'efectivo'`. Incluir opciones rápidas (botones con montos redondos: "$15.000", "$20.000", "Monto justo"). Enviar este dato al backend en `create-webapp-order`.

### Problema 5.3: MercadoPago redirige fuera de la app
- **Archivo:** `src/components/webapp/CartSheet.tsx` (línea `window.location.href = mpData.init_point`)
- **Contexto:** Al pagar con MP, el usuario es redirigido a MercadoPago externamente. Al completar, vuelve a la URL de tracking. Esto rompe la experiencia y puede confundir al usuario.
- **Solución:** A corto plazo, mostrar un mensaje claro antes de redirigir: "Te vamos a llevar a MercadoPago para completar el pago. Una vez confirmado, volvés acá para ver el estado de tu pedido." A mediano plazo, investigar Checkout Pro de MP con iframe/modal integrado.

### Problema 5.4: El checkout no tiene pasos visibles/numerados
- **Contexto:** DoorDash muestra "1. Sign in, 2. Shipping details, 3. Payment details" con numbers claros. Hoppiness tiene todo en un solo scroll largo dentro del sheet.
- **Solución:** Implementar stepper visual en el checkout: paso 1 = Tus datos, paso 2 = Método de pago + Resumen. Mostrar indicador de progreso arriba (dos circles conectados por una línea, con el paso actual highlighted).

### Problema 5.5: Validación de formulario sin feedback inline
- **Contexto:** El botón se deshabilita si los campos no cumplen las validaciones, pero no hay mensajes de error inline explicando qué falta (ej: "Ingresá un teléfono válido", "La dirección debe tener al menos 5 caracteres").
- **Solución:** Agregar validación inline con mensajes debajo de cada campo. Marcar campos con error en rojo. Mostrar cuántos campos faltan completar en el botón: "Completá 2 campos para continuar".

---

## ÁREA 6: NAVEGACIÓN Y CONSISTENCIA VISUAL

### Problema 6.1: La flecha de volver cambia de posición en cada pantalla
- **Contexto observado:**
  - Landing (Pedir.tsx): "← Volver" arriba a la DERECHA en el header
  - BranchLanding: flecha arriba a la IZQUIERDA, dentro del panel, sin texto
  - WebappMenuView: flecha arriba a la IZQUIERDA, en el header sticky
  - CartSheet: flecha arriba a la IZQUIERDA, dentro del SheetTitle
- **Impacto:** Alto. Rompe el modelo mental del usuario. La navegación hacia atrás debe ser predecible.
- **Solución:** Estandarizar: flecha siempre arriba a la izquierda, siempre en el header principal, siempre mismo tamaño e ícono. En Pedir.tsx, mover el "← Volver" a la izquierda.

### Problema 6.2: Todo es muy blanco — falta la identidad de marca
- **Contexto:** El hero de la landing tiene azul, naranja y personalidad. Pero una vez que entrás al flujo de pedido, todo es blanco con azul genérico. Los colores de la marca (azul oscuro, naranja, amarillo) desaparecen. Las categorías del sidebar son azul pero podrían ser de cualquier app.
- **Solución:** Incorporar el naranja como color de acción (CTAs, badges de promo, highlights de categoría activa). El azul se mantiene para identidad de marca (header, títulos de categoría). El amarillo se usa como accent para badges y elementos de urgencia. Agregar un sutil degradado azul oscuro → blanco en el header del menú para conectar visualmente con la landing.

### Problema 6.3: Badge "Cerrado" aparece en VERDE
- **Archivo:** `src/pages/Pedir.tsx` (BranchCard) — Corregido en el código actual usa gris para cerrado
- **Contexto:** En capturas anteriores de la web, el badge "Cerrado" aparecía con punto verde, lo cual contradice la convención universal (verde = abierto). En el código actual (`Pedir.tsx`), el badge de cerrado usa `text-muted-foreground bg-muted` que es gris, lo cual es correcto. Pero en `webapp_config` la pantalla de "Cerrado" usa un punto rojo, que es mejor.
- **Solución:** Verificar consistencia: cerrado = punto rojo o gris, nunca verde. Abierto = punto verde animado (pulse). Pausado = ícono de pausa amarillo/ámbar. Esto ya está mayormente bien en el código pero confirmar que el deploy refleja lo mismo.

### Problema 6.4: El horario muestra "12:00:00" con segundos
- **Archivo:** `src/components/webapp/BranchLanding.tsx`
- **Contexto:** Los campos `opening_time` y `closing_time` de la branch se muestran crudos: "Abre 12:00:00", "Cierra 23:30:00".
- **Solución:** Formatear como "Abre a las 12:00" o "Abre al mediodía". Agregar helper function `formatTime(time: string)` que elimine los segundos y agregue artículo.

### Problema 6.5: Falta horario completo de la semana
- **Contexto:** Cuando el local está cerrado, la página muestra "Este local no está recibiendo pedidos en este momento" con un botón "Ver menú igualmente". No muestra los horarios de la semana para que el usuario sepa cuándo volver.
- **Solución:** Agregar tabla de horarios semanales debajo del mensaje de cerrado. El campo `public_hours` ya existe en la query de branches. Mostrar cada día con horario de apertura/cierre y resaltar el día actual.

---

## ÁREA 7: MAPA Y UBICACIÓN

### Problema 7.1: No hay mapa con la ubicación del local
- **Contexto:** DoorDash en modo Pickup muestra un mapa Mapbox con la ubicación del local (imagen 4 de DoorDash). Hoppiness no muestra ningún mapa en ninguna pantalla del flujo de pedido, a pesar de que la query de branches ya carga `latitude` y `longitude`.
- **Solución:** En BranchLanding y en el header del menú (modo retiro), mostrar un mini-mapa con un pin del local. Usar Google Maps embed o Leaflet (gratis). Incluir botón "Cómo llegar" que abra Google Maps/Waze con las coordenadas.

### Problema 7.2: La dirección del local no es clickeable
- **Contexto:** La dirección se muestra como texto plano: "Wilfredo Meloni 3778, Local 6, Ribera de Manantiales, Córdoba". No se puede copiar fácilmente ni abrir en mapa.
- **Solución:** Hacer la dirección un link que abra Google Maps. Formato: `https://maps.google.com/?q={latitude},{longitude}`. Agregar ícono de mapa al lado.

---

## ÁREA 8: FUNCIONALIDADES FALTANTES (BENCHMARKING)

### Problema 8.1: Sin notificación cuando el local abra
- **Contexto:** Cuando el local está cerrado y el usuario quiere pedir, no hay manera de que le avisen cuando abra. Solo puede volver a entrar después.
- **Solución:** Agregar botón "Avisame cuando abra" que pida email o push notification. Implementar con una tabla simple `webapp_notify_open(branch_id, email/push_token, created_at)`.

### Problema 8.2: Sin historial de pedidos para el cliente
- **Contexto:** DoorDash y Rappi permiten reordenar pedidos anteriores. Hoppiness no tiene cuentas de cliente ni historial.
- **Solución:** A corto plazo, al confirmar un pedido, guardar nombre + teléfono en localStorage y pre-llenar en el siguiente pedido. A mediano plazo, implementar login simple con número de teléfono (OTP) para ver historial de pedidos y repetir.

### Problema 8.3: Sin tiempo de espera real/live
- **Contexto:** Se muestra "~20 min" como estimado estático. En realidad el tiempo varía según la carga del local.
- **Solución:** A corto plazo, mantener el estimado estático pero hacerlo configurable dinámicamente por el encargado desde el panel de admin. A mediano plazo, calcular basado en cantidad de pedidos pendientes en cocina.

### Problema 8.4: Sin link compartible de producto
- **Contexto:** No se puede compartir un link a un producto específico del menú. En DoorDash/Rappi cada producto tiene su URL.
- **Solución:** Agregar deep linking: al abrir un producto, actualizar la URL a `/pedir/{slug}?item={itemId}`. Al cargar la página con ese query param, abrir automáticamente el ProductCustomizeSheet.

### Problema 8.5: Falta foto del local en las cards de sucursales
- **Archivo:** `src/pages/Pedir.tsx`
- **Contexto:** Las branch cards solo muestran nombre + dirección + status. Sin foto, todas las cards se ven iguales. Rappi y DoorDash usan banner images de cada local.
- **Solución:** Agregar campo `cover_image_url` a branches o usar las fotos de locales que ya existen en assets (`local-gp.jpg`, `local-man.jpg`, etc.) como banner en la card.

### Problema 8.6: PWA incompleta
- **Contexto:** Existe `manifest.json` y `sw.js` pero la experiencia no es de PWA optimizada. No hay pantalla offline, no hay cache de menú.
- **Solución:** Implementar cache de menú y assets en el service worker. Mostrar pantalla offline amigable "Parece que no tenés conexión. Cuando vuelvas, tu carrito va a seguir acá."

---

## PRIORIZACIÓN DE IMPLEMENTACIÓN

### Sprint 1 — Quick Wins (1-2 semanas)
1. **[2.1]** Arreglar truncamiento de nombres — `line-clamp-2`, grid responsivo
2. **[6.4]** Formatear horarios sin segundos
3. **[6.1]** Estandarizar posición de flecha volver
4. **[6.3]** Verificar consistencia de badges abierto/cerrado
5. **[3.4]** Persistir carrito en localStorage
6. **[1.2]** Hacer el tipo de servicio visible y clickeable en el header del menú

### Sprint 2 — Mejoras de Flujo (2-3 semanas)
7. **[1.1]** Integrar selector de servicio como toggle en el menú (eliminar pantalla intermedia)
8. **[4.1]** Mostrar extras obligatorios vs. opcionales con progreso en botón
9. **[4.2]** Agregar UI de removibles ("¿Querés sacar algo?")
10. **[3.1]** Arreglar compresión de cards cuando el carrito sidebar está abierto
11. **[5.2]** Agregar campo "¿Con cuánto pagás?" para efectivo
12. **[5.5]** Validación inline en checkout

### Sprint 3 — Nivel Profesional (2-3 semanas)
13. **[7.1]** Agregar mapa del local
14. **[6.2]** Rediseño de colores (naranja CTAs, identidad de marca en el flujo)
15. **[3.3]** Upsell "¿Querés agregar algo más?" en el carrito
16. **[2.3]** Sección "Más pedidos" al inicio del menú
17. **[5.4]** Stepper visual en checkout
18. **[6.5]** Horario semanal en pantalla de local cerrado

### Sprint 4 — Diferenciadores (3-4 semanas)
19. **[2.5]** Badges de descuento y precios tachados
20. **[2.6]** Barra de promos arriba del menú
21. **[8.2]** Pre-llenado de datos del cliente con localStorage
22. **[8.4]** Deep linking de productos
23. **[8.5]** Fotos de locales en branch cards
24. **[5.3]** Mensaje pre-redirección a MercadoPago

---

## REFERENCIA: ESTRUCTURA DE ARCHIVOS A MODIFICAR

```
src/
├── pages/
│   ├── Pedir.tsx                         → Branch list (6.1, 6.3, 8.5)
│   └── webapp/
│       ├── PedirPage.tsx                 → Main orchestrator (1.1, 1.2)
│       └── TrackingPage.tsx              → Post-order tracking
├── components/webapp/
│   ├── BranchLanding.tsx                 → Service selection (1.1, 6.4, 6.5, 7.1)
│   ├── WebappMenuView.tsx                → Menu layout (1.2, 2.3, 2.4, 3.1)
│   ├── ProductCard.tsx                   → Product cards (2.1, 2.2, 2.5)
│   ├── ProductCustomizeSheet.tsx         → Product detail (4.1, 4.2, 4.3, 4.4)
│   ├── CartBar.tsx                       → Mobile cart bar (OK, minor tweaks)
│   ├── CartSidePanel.tsx                 → Desktop cart (3.1, 3.3)
│   └── CartSheet.tsx                     → Cart + Checkout (3.2, 5.1-5.5)
├── hooks/
│   ├── useWebappCart.ts                  → Cart state (3.4)
│   └── useWebappMenu.ts                 → Menu data + extras
├── types/
│   └── webapp.ts                         → Type definitions
└── supabase/functions/
    ├── create-webapp-order/index.ts      → Order creation (5.2)
    └── mp-checkout/index.ts              → MercadoPago integration
```

---

## REFERENCIA: PATRONES DE DISEÑO A SEGUIR

### Colores de la marca
- **Azul oscuro (#0A1172 o similar):** Header, títulos, identidad
- **Naranja (#FF6B2C o similar):** CTAs primarios, badges de promo, "Agregar al carrito"
- **Amarillo (#FFB800 o similar):** Highlights, urgencia, badges "Nuevo"
- **Blanco/Gris claro:** Fondo de contenido, cards
- **Gris oscuro:** Texto principal, precios

### Regla de CTAs
- Botón primario (agregar al carrito, confirmar pedido) → Naranja
- Botón secundario (ver menú, volver) → Outline azul o ghost
- Botón destructivo (eliminar, cancelar) → Rojo suave

### Regla de badges de estado
- Abierto → Verde con pulse animation
- Cerrado → Rojo/Gris
- Pausado → Ámbar/Amarillo
- Promo/Descuento → Naranja o verde con porcentaje

### Tipografía
- Títulos y marca → Font brand (HamburgHand-Bold) disponible en `/public/fonts/`
- Navegación y UI → System font o Inter
- Precios → Bold, azul o naranja según contexto
