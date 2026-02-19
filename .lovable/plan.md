

# Plan: KDS Profesional + Sistema de Impresion por Red (Implementacion Combinada)

Este plan transforma la pantalla de Cocina actual en un KDS profesional de nivel industria y agrega un sistema completo de impresion de comandas por red TCP/IP a impresoras termicas ESC/POS.

---

## Parte A: Base de Datos (Migraciones)

### Nuevas tablas

**1. `branch_printers`** - Impresoras fisicas por local

| Campo | Tipo | Descripcion |
|---|---|---|
| id | uuid PK | |
| branch_id | uuid FK branches | |
| name | text NOT NULL | "Impresora Cocina" |
| connection_type | text DEFAULT 'network' | 'network' (todas son IP) |
| ip_address | text | IP de la impresora |
| port | int DEFAULT 9100 | Puerto TCP |
| paper_width | int DEFAULT 80 | 58 o 80mm |
| is_active | boolean DEFAULT true | |
| created_at | timestamptz | |

**2. `kitchen_stations`** - Estaciones configurables por local

| Campo | Tipo | Descripcion |
|---|---|---|
| id | uuid PK | |
| branch_id | uuid FK branches | |
| name | text NOT NULL | "Parrilla", "Freidora" |
| icon | text DEFAULT 'flame' | Icono lucide |
| sort_order | int DEFAULT 0 | |
| kds_enabled | boolean DEFAULT true | Mostrar en pantalla |
| printer_id | uuid FK branch_printers NULL | Impresora asignada |
| print_on | text DEFAULT 'on_receive' | 'on_receive' o 'on_prep' |
| print_copies | int DEFAULT 1 | |
| is_active | boolean DEFAULT true | |
| created_at | timestamptz | |

**3. `print_config`** - Config de salidas especiales (ticket, delivery, backup)

| Campo | Tipo | Descripcion |
|---|---|---|
| id | uuid PK | |
| branch_id | uuid FK branches UNIQUE | |
| ticket_printer_id | uuid FK branch_printers NULL | Impresora para ticket cliente |
| ticket_enabled | boolean DEFAULT false | |
| ticket_trigger | text DEFAULT 'on_payment' | |
| delivery_printer_id | uuid FK branch_printers NULL | |
| delivery_enabled | boolean DEFAULT false | |
| backup_printer_id | uuid FK branch_printers NULL | Comanda completa backup |
| backup_enabled | boolean DEFAULT false | |
| reprint_requires_pin | boolean DEFAULT true | |
| updated_at | timestamptz | |

**4. `print_jobs`** - Cola de impresion con estado

| Campo | Tipo | Descripcion |
|---|---|---|
| id | uuid PK | |
| branch_id | uuid FK | |
| printer_id | uuid FK branch_printers | |
| job_type | text | 'comanda_estacion', 'comanda_completa', 'ticket', 'delivery' |
| pedido_id | uuid FK pedidos | |
| payload | jsonb | Datos formateados para imprimir |
| status | text DEFAULT 'pending' | 'pending', 'printing', 'done', 'failed' |
| attempts | int DEFAULT 0 | |
| error_message | text NULL | |
| created_at | timestamptz | |

### Campos nuevos en tablas existentes

- `items_carta.kitchen_station_id` uuid FK kitchen_stations NULL - Estacion de preparacion del producto
- `pedidos.tiempo_inicio_prep` timestamptz NULL - Hora que empezo preparacion
- `pedidos.tiempo_listo` timestamptz NULL - Ya existe, verificar

### RLS

Todas las tablas nuevas con RLS via `has_branch_access_v2` o `is_superadmin`.

### Realtime

`print_jobs` necesita realtime para que el servicio local escuche nuevos trabajos (futuro).

---

## Parte B: KDS Profesional (KitchenPage.tsx reescritura)

### B1. Modo Fullscreen (Modo KDS)

- Boton "Modo KDS" en header que activa estado `isKdsMode`
- Cuando activo: llama `document.documentElement.requestFullscreen()`
- Oculta sidebar y header via CSS/portal (renderiza fuera del WorkShell)
- Fondo oscuro `bg-[#1C1C1E]` con tipografia grande
- Boton "Salir" discreto en esquina superior derecha
- Ruta alternativa: se puede acceder via `/cocina/:branchId` como ruta independiente sin layout

### B2. Tema oscuro KDS

- Numero pedido: 28-32px, font-weight 900
- Nombre producto: 18-20px, font-weight 700
- Modificadores: 16px, font-weight 600
- Cards con fondo `#1C1C1E`, bordes coloreados por estado
- Pendiente: borde rojo `#EF4444`
- En preparacion: borde amarillo `#F59E0B`
- Listo: borde verde `#10B981`, opacidad reducida

### B3. Flujo solo-avance

- Tap en item: `pendiente -> en_preparacion -> listo` (nunca retrocede)
- Tap en item `listo`: no hace nada
- Long press (3 seg): deshace ultimo cambio (safety net)
- Al tocar primer item de pedido pendiente: pedido pasa automaticamente a `en_preparacion` + registra `tiempo_inicio_prep`

### B4. Boton de accion principal dinamico

- PENDIENTE: boton verde "EMPEZAR PREPARACION" (full width, 56px)
- EN PREP parcial: barra progreso "Preparando... 2/5 listos" (no clickeable)
- EN PREP completo: boton verde "PEDIDO LISTO - DESPACHAR"
- LISTO: boton "ENTREGADO" para confirmar entrega final

### B5. Jerarquia visual de modificadores mejorada

- SIN: `text-red-500 font-bold uppercase` -- "SIN CEBOLLA"
- EXTRA: `text-orange-500 font-semibold` -- "+ Extra cheddar"
- CAMBIO: `text-blue-400` -- "Pan integral"

### B6. Auto-limpieza de pedidos listos

- Despues de 3 min: opacidad reducida al 50%
- Despues de 5 min: desaparecen del KDS
- Configurable via estado local

### B7. Barra de metricas en vivo

- Header: `[Cocina | 5 activos | Prom: 6min | 2 atrasados | Fullscreen]`
- Calculo tiempo promedio rolling
- Contador de atrasados (> 10 min)

### B8. Selector de estacion

- Al abrir KDS, si el local tiene estaciones: modal selector
- Opciones: cada estacion + "Ver todo"
- Seleccion en `localStorage`
- Toggle en header para cambiar sin recargar
- Items de otras estaciones: texto gris, tamano menor, badge estacion, NO interactuables

### B9. Touch targets

- Item row: minimo 48px alto
- Boton accion: 56-64px alto, full-width
- Nada clickeable menor a 44x44px

---

## Parte C: Sistema de Impresion

### C1. Arquitectura

Dado que todas las impresoras son de red (TCP/IP), el navegador no puede conectar directamente por TCP raw. La arquitectura sera:

```text
Frontend (KDS/POS)
    |
    v (insert en tabla print_jobs)
Supabase DB (print_jobs)
    |
    v (Edge Function polling o futuro servicio local)
Edge Function "print-job"
    |
    v (TCP socket a IP:puerto)
Impresora termica ESC/POS
```

**Primera iteracion**: Edge Function `print-to-network` que:
1. Recibe printer IP, port, y payload ESC/POS (bytes en base64)
2. Abre conexion TCP con `Deno.connect()` 
3. Envia los bytes
4. Cierra conexion

**Nota**: `Deno.connect()` para TCP esta disponible en edge functions. Esto permite imprimir directamente desde la cloud sin servicio local.

### C2. Edge Function `print-to-network`

```text
supabase/functions/print-to-network/index.ts
```

- Recibe: `{ printer_ip, printer_port, data_base64 }`
- Valida autenticacion
- Abre TCP socket con `Deno.connect({ hostname: printer_ip, port: printer_port })`
- Envia bytes decodificados de base64
- Retorna success/error

**Importante**: Las impresoras deben ser accesibles desde internet o la Edge Function necesita estar en la misma red. Si las impresoras estan en LAN privada, necesitaremos un relay local. Para la primera iteracion, asumimos impresoras accesibles.

### C3. Generador ESC/POS

```text
src/lib/escpos.ts
```

Modulo TypeScript que genera arrays de bytes ESC/POS para:
- Comanda por estacion
- Comanda completa
- Ticket cliente
- Comanda delivery

Comandos basicos: ESC @, ESC a, ESC E, GS !, GS V, etc.

### C4. Hook `usePrinting`

```text
src/hooks/usePrinting.ts
```

- `printComanda(pedido, estacion?)` - genera ESC/POS y envia via edge function
- `printTicket(pedido, paymentInfo)` - ticket cliente
- `printDelivery(pedido)` - comanda delivery
- Inserta en `print_jobs` para tracking
- Manejo de errores con toast y opcion de reimpresion

### C5. Trigger automatico de impresion

En `useKitchen.ts`, al cambiar estado de pedido:
- Pedido nuevo (pendiente) + estacion con `print_on = 'on_receive'` -> imprimir comanda
- Pedido a `en_preparacion` + estacion con `print_on = 'on_prep'` -> imprimir comanda
- Pedido a `listo` + es delivery -> imprimir comanda delivery

### C6. Paginas de configuracion

**`src/pages/local/PrintersConfigPage.tsx`** - CRUD de impresoras
- Lista de impresoras con nombre, IP, puerto, ancho papel, estado
- Boton "+ Nueva impresora"
- Boton "Test" que envia pagina de prueba
- Editar/Eliminar

**`src/pages/local/KitchenStationsConfigPage.tsx`** - CRUD de estaciones
- Lista de estaciones con nombre, icono, impresora asignada
- Configuracion de salida (pantalla KDS, impresora, cuando imprimir, copias)
- Asignacion de productos

**`src/pages/local/PrintConfigPage.tsx`** - Config salidas especiales
- Ticket cliente: impresora, trigger, opciones
- Comanda delivery: impresora, trigger
- Comanda backup: impresora, activar/desactivar
- Reimpresion: requiere PIN

---

## Parte D: Archivos a crear/modificar

### Crear

| Archivo | Descripcion |
|---|---|
| `src/lib/escpos.ts` | Generador de bytes ESC/POS |
| `src/hooks/usePrinting.ts` | Hook de impresion |
| `src/hooks/useKitchenStations.ts` | CRUD estaciones |
| `src/hooks/useBranchPrinters.ts` | CRUD impresoras |
| `src/hooks/usePrintConfig.ts` | Config impresion |
| `src/pages/local/PrintersConfigPage.tsx` | Config impresoras |
| `src/pages/local/KitchenStationsConfigPage.tsx` | Config estaciones |
| `src/pages/local/PrintConfigPage.tsx` | Config salidas especiales |
| `supabase/functions/print-to-network/index.ts` | Edge function impresion TCP |

### Modificar

| Archivo | Cambio |
|---|---|
| `src/pages/pos/KitchenPage.tsx` | Reescritura completa: modo KDS, tema oscuro, flujo solo-avance, estaciones, metricas, auto-limpieza, impresion |
| `src/hooks/pos/useKitchen.ts` | Agregar filtro estacion, auto-transicion estado, trigger impresion |
| `src/components/layout/LocalSidebar.tsx` | Agregar entradas: Impresoras, Estaciones, Impresion en seccion Config |
| `src/App.tsx` | Agregar rutas nuevas + ruta `/cocina/:branchId` sin layout |
| `supabase/config.toml` | Agregar `[functions.print-to-network]` con `verify_jwt = false` |

### Migracion SQL

Una sola migracion con:
- CREATE TABLE branch_printers, kitchen_stations, print_config, print_jobs
- ALTER TABLE items_carta ADD kitchen_station_id
- ALTER TABLE pedidos ADD tiempo_inicio_prep
- RLS policies para todas las tablas nuevas
- ALTER PUBLICATION supabase_realtime ADD TABLE print_jobs

---

## Orden de implementacion

1. Migracion SQL (todas las tablas nuevas)
2. `src/lib/escpos.ts` (generador ESC/POS standalone)
3. Edge function `print-to-network`
4. Hooks: `useBranchPrinters`, `useKitchenStations`, `usePrintConfig`, `usePrinting`
5. Paginas de config: Impresoras, Estaciones, Impresion
6. Sidebar + rutas
7. `useKitchen.ts` actualizado (estaciones, auto-transicion, trigger impresion)
8. `KitchenPage.tsx` reescritura completa (modo KDS profesional)

---

## Limitacion importante: Impresoras en LAN

Si las impresoras estan en una red local privada (192.168.x.x), la Edge Function en la nube **no podra alcanzarlas** directamente. En ese caso, hay dos opciones:

1. **Fallback browser-side**: Generar los bytes ESC/POS en el frontend y usar `fetch` a la IP local de la impresora desde el navegador (funciona si estan en la misma LAN que la tablet/PC del local). Esto es posible con HTTP POST al puerto 9100 en algunos modelos, o usando un mini servidor print relay.

2. **Print relay local**: Un servicio minimo corriendo en el local que escucha la tabla `print_jobs` via Supabase Realtime y ejecuta la impresion TCP localmente.

Para la primera iteracion, implementamos la opcion 1 (impresion directa desde el navegador via raw TCP al IP local) usando el enfoque de generar ESC/POS en el frontend y enviar via `fetch` o `WebSocket` al IP:9100 local. Si no funciona por restricciones del navegador, activamos la opcion 2.

