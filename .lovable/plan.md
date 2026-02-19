

## Analisis y Roadmap: WebApp de Pedidos Hoppiness

### Que ya existe en tu sistema

Tu plataforma ya tiene varios bloques fundamentales construidos que la guia da por sentado:

| Componente | Estado | Detalle |
|---|---|---|
| Tabla `pedidos` | Completa | Ya soporta campos `tipo` (mostrador/delivery/webapp), `canal_venta`, `tipo_servicio`, `cliente_nombre/telefono/direccion`, `numero_llamador`, `cadete_id`, `costo_delivery` |
| Tabla `pedido_items` | Completa | Items con cantidad, precio, notas, estacion, modificadores |
| Tabla `pedido_pagos` | Completa | Pagos con metodo, monto, vuelto |
| Tabla `items_carta` | Completa | Catalogo con precios, imagenes, categorias, disponibilidad delivery, costos |
| Sistema de modificadores | Completo | Grupos opcionales, extras con precio, removibles, sustituciones |
| POS (punto de venta) | Completo | Grilla de productos, carrito, pagos divididos, configuracion de canal/servicio |
| KDS (cocina) | Completo | Pantalla fullscreen, estados por item, timer de urgencia, sonido de notificacion, realtime |
| Llamadores | Completo | Tabla `llamadores` con asignacion atomica via `asignar_llamador()` y `liberar_llamador()` |
| Cadetes | Existe | Tabla `cadetes`, pagina de asignacion de delivery |
| Caja registradora | Completa | Turnos, movimientos, cierres |
| Facturacion ARCA | Completa | Emision de facturas A/B/C |

### Que falta construir

| Componente | Prioridad | Complejidad |
|---|---|---|
| Frontend publico del cliente (la WebApp) | Critica | Alta |
| Pasarela de pagos (Mercado Pago) | Critica | Alta |
| Configuracion de WebApp por local | Alta | Media |
| Notificaciones push al cliente | Media | Media |
| Registro opcional de clientes | Media | Media |
| Historial y favoritos del cliente | Baja | Baja |
| Analytics de WebApp | Baja | Media |

---

### Roadmap por Fases

#### FASE 1: Infraestructura y Configuracion (1-2 sesiones)

Objetivo: Preparar la base de datos y configuracion para que la WebApp funcione.

- Crear tabla `webapp_config` por sucursal (horarios, delivery habilitado, radio cobertura, costo envio, modo recepcion auto/manual, estado abierto/pausado/cerrado, colores, textos)
- Agregar campo `webapp_disponible` a `items_carta` (o reusar `disponible_delivery` + nuevo `disponible_webapp`)
- Agregar campos a `pedidos`: `pago_online_id`, `pago_estado` (pendiente/pagado/devuelto), `origen` (pos/webapp), `webapp_tracking_code` (ej: HP-0042)
- Crear tabla `webapp_customers` (nombre, telefono, email, direcciones guardadas - registro opcional)
- RLS policies para acceso publico de lectura al menu y escritura de pedidos

#### FASE 2: Menu Publico y Carrito (2-3 sesiones)

Objetivo: El cliente puede ver el menu y armar su pedido.

- Ruta publica `/pedir/:branchSlug` (ej: `/pedir/general-paz`)
- Landing del local: nombre, direccion, estado (abierto/cerrado/pausado), seleccion de servicio (retiro/delivery/comer aca)
- Pantalla de menu: categorias con scroll spy, busqueda, cards de productos con imagen
- Modal de personalizacion: ingredientes removibles, extras con precio, notas, cantidad
- Carrito: items con modificaciones visibles, control de cantidad, sugerencias complementarias
- Validaciones: pedido minimo para delivery, horario de cierre
- Todo el estado del carrito en memoria local (sin login requerido)

#### FASE 3: Checkout y Pago (2-3 sesiones)

Objetivo: El cliente puede confirmar y pagar su pedido.

- Formulario de datos: nombre, telefono, email opcional
- Si delivery: input de direccion con validacion de radio de cobertura
- Metodos de pago: "Pagar online" (Mercado Pago) y "Pagar al retirar" (solo retiro)
- Integracion Mercado Pago Checkout Pro via edge function
- Edge function `crear-pedido-webapp`: valida stock, procesa pago, crea pedido en DB, asigna llamador
- Pantalla de confirmacion con numero de pedido y llamador
- Webhook de Mercado Pago para confirmar pago

#### FASE 4: Tracking y Notificaciones (1-2 sesiones)

Objetivo: El cliente sigue el estado de su pedido en tiempo real.

- Pantalla de tracking con timeline de estados (realtime via Supabase)
- Barra de progreso con tiempo estimado
- Notificaciones push via Service Worker (cuando el pedido esta listo)
- Pagina de "pedido listo" con numero de llamador prominente

#### FASE 5: Recepcion en POS y KDS (1-2 sesiones)

Objetivo: El local recibe y procesa pedidos WebApp.

- Banner no bloqueante en el POS cuando entra un pedido WebApp (ya tenes la base de notificaciones en KDS)
- Sonido diferenciado para pedidos WebApp
- Badge con icono "globo" en la barra de pedidos activos del POS
- Boton de pausa WebApp accesible desde el POS/dashboard del encargado
- El KDS ya soporta esto: solo agregar badge visual para distinguir canal

#### FASE 6: Configuracion y Admin (1 sesion)

Objetivo: El encargado/franquiciado configura la WebApp desde Mi Local.

- Nueva seccion en configuracion del local: Horarios WebApp, delivery (radio, costo), retiro (llamadores), pausa manual
- Gestion de disponibilidad de productos en la WebApp (toggle por producto)
- Modo de recepcion (auto vs manual)

#### FASE 7: Registro, Historial y Mejoras (1-2 sesiones)

Objetivo: Funciones complementarias para el cliente.

- Registro opcional (telefono + codigo SMS o email)
- Historial de pedidos con boton "Repetir"
- Favoritos
- Cupones de descuento
- Analytics basico en dashboard de Mi Marca (pedidos WebApp vs Apps, ahorro en comisiones)

---

### Recomendacion de Arranque

Empezar por **Fase 1 + Fase 2** juntas: crear las tablas de configuracion y la interfaz del menu publico. Esto permite tener algo visible rapidamente sin tocar el POS ni integrar pagos. El carrito funciona completo pero sin checkout real, lo que sirve para testear el flujo visual.

La Fase 3 (Mercado Pago) es la mas compleja y requiere configurar credenciales de la pasarela. Conviene tener el menu y carrito funcionando antes de meternos ahi.

### Nota sobre Arquitectura

La guia menciona "PWA con React/Next.js" pero tu proyecto es React + Vite. La WebApp del cliente se puede construir como rutas publicas dentro de la misma app (bajo `/pedir/:slug`), sin necesidad de un proyecto separado. Esto reutiliza toda la infraestructura existente (Supabase client, tipos, componentes UI). Si en el futuro necesitas separarlo para performance, se puede extraer.

