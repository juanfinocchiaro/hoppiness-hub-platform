
# Plan: Rediseno completo de Cocina (KDS - Kitchen Display System)

## Problema actual

La pantalla de Cocina es extremadamente basica:
- Solo muestra numero de pedido y un badge de estado generico
- Los items no muestran nombre del producto (algunos tienen el campo `nombre` vacio en la DB)
- No hay informacion de contexto: tipo de servicio, llamador, tiempo de espera
- La interaccion para cambiar estado es un badge de texto pequeno sin feedback visual
- No hay realtime (solo polling manual)
- No hay sonido/alerta para pedidos nuevos
- El empty state es un texto plano sin personalidad

## Solucion: KDS profesional estilo cocina real

### Datos disponibles en la DB

De `pedidos`: `numero_pedido`, `tipo_servicio` (comer_aca/takeaway/delivery), `numero_llamador`, `canal_venta`, `cliente_nombre`, `created_at`, `estado`

De `pedido_items`: `nombre`, `cantidad`, `notas`, `estacion`, `estado`

De `pedido_item_modificadores`: `descripcion`, `tipo`, `precio_extra`

### Diseno visual

Cada pedido sera una tarjeta grande con:

1. **Header de la tarjeta**:
   - Numero de pedido grande y bold (#1, #2...)
   - Tipo de servicio con icono (tenedor = Comer aca, bolsa = Takeaway, moto = Delivery)
   - Numero de llamador si existe ("Llamador #8")
   - Timer con tiempo transcurrido desde `created_at` (ej: "3 min", "12 min")
   - Color de fondo del header segun urgencia: verde (< 5 min), amarillo (5-10 min), rojo (> 10 min)

2. **Lista de items**:
   - Cantidad en negrita grande + nombre del producto
   - Modificadores debajo en texto mas chico y gris (ej: "+ Extra cheddar", "Sin cebolla")
   - Notas del item si existen (fondo amarillo sutil)
   - Checkbox/boton grande por item para marcar "listo" (toggle visual claro)
   - Items listos aparecen tachados con fondo verde sutil

3. **Footer de la tarjeta**:
   - Boton grande "PEDIDO LISTO" que aparece cuando todos los items estan listos
   - Boton con color primario, ancho completo, texto grande

4. **Columnas por estado** (layout tipo Kanban):
   - Columna izquierda: "Pendientes" (fondo rojo/naranja sutil)
   - Columna centro: "En preparacion" (fondo amarillo sutil)
   - Columna derecha: "Listos" (fondo verde sutil, auto-ocultar despues de 2 min)

### Realtime

- Suscripcion a cambios en tabla `pedidos` para la branch actual
- Sonido de notificacion cuando entra un pedido nuevo (usar `/public/sounds/notification.mp3` que ya existe)
- Animacion de entrada para pedidos nuevos

### Funcionalidades de interaccion

- Click en un item: cicla estado `pendiente` -> `en_preparacion` -> `listo` con animacion
- Click en badge de estado del pedido: cambia estado global del pedido
- Boton "LISTO" en el footer cuando todos los items completados
- Auto-refresh via realtime (no solo polling)
- Contador de pedidos activos en el header

---

## Cambios tecnicos

### 1. Reescribir `src/hooks/pos/useKitchen.ts`

- Agregar select de `pedido_item_modificadores` (join anidado)
- Agregar suscripcion realtime a tabla `pedidos` (canal de Supabase)
- Refetch automatico al recibir cambios
- Query: `pedidos` con `pedido_items(*, pedido_item_modificadores(*))` 

### 2. Reescribir `src/pages/pos/KitchenPage.tsx`

Reemplazar la implementacion actual por un KDS completo:

- Layout en 3 columnas (Kanban): Pendientes | En Preparacion | Listos
- En mobile: tabs en vez de columnas
- Componentes internos:
  - `KitchenOrderCard`: tarjeta individual de pedido con header coloreado, items, footer
  - `KitchenItemRow`: fila de item con checkbox, modificadores, notas
  - `KitchenTimer`: componente que calcula y muestra tiempo transcurrido con color dinamico
- Sonido al detectar pedido nuevo (comparar IDs previos vs actuales)
- Contador en header: "X pedidos activos"
- Empty state con icono de ChefHat y mensaje amigable

### 3. Habilitar realtime en tabla `pedidos`

- Migracion SQL: `ALTER PUBLICATION supabase_realtime ADD TABLE public.pedidos;`

---

## Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/hooks/pos/useKitchen.ts` | Reescribir con join de modificadores + realtime |
| `src/pages/pos/KitchenPage.tsx` | Reescribir completo con layout Kanban, cards ricas, timer, sonido |

## Migracion SQL

| Cambio | SQL |
|---|---|
| Realtime | `ALTER PUBLICATION supabase_realtime ADD TABLE public.pedidos` |

## Resultado esperado

Una pantalla de cocina profesional donde:
- Se ve claramente QUE preparar (items con modificadores)
- Se ve PARA QUIEN (llamador, tipo de servicio)
- Se ve HACE CUANTO espera (timer con colores de urgencia)
- Se interactua facilmente (botones grandes, feedback visual claro)
- Se actualiza en tiempo real (sin recargar pagina)
- Suena una alerta cuando entra un pedido nuevo
