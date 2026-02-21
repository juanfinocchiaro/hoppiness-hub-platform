

## Plan: Zonas de Delivery + Resumen de Integración WebApp

### Estado Actual de la WebApp de Pedidos

El flujo completo ya esta construido y funcional:

```text
CLIENTE                                  LOCAL (POS)
  |                                        |
  |  /pedir/:branchSlug                    |
  |  -> Landing (estado, servicios)        |
  |  -> Menu (categorias, buscador)        |
  |  -> Carrito (extras, notas)            |
  |  -> Checkout (datos, pago)             |
  |  -> Edge fn: create-webapp-order       |
  |  -> /pedido/:trackingCode (realtime)   |
  |                                        |
  |  ---- pedido en tabla 'pedidos' -----> |
  |                                        |  WebappOrdersPanel (dentro del POS)
  |                                        |  Polling cada 10s
  |                                        |  Boton Aceptar / Rechazar
  |                                        |  Pedido pasa a cocina
  |  <--- estado actualizado (realtime) -- |
```

- **Donde ingresan**: Se crean en la tabla `pedidos` con `origen = 'webapp'`
- **Donde se aceptan**: En el panel POS, componente `WebappOrdersPanel` que aparece automaticamente cuando hay pedidos pendientes
- **Donde se ven**: En el mismo POS, y el cliente los sigue en tiempo real en `/pedido/:trackingCode`
- **Integrador**: No hace falta. El edge function `create-webapp-order` ya actua como backend y el `WebappOrdersPanel` ya esta integrado en el POS

No se necesita construir nada adicional para la integracion basica.

---

### Zonas de Delivery: Lo que falta

Actualmente, el delivery tiene un **costo unico plano** configurado en `webapp_config.delivery_costo`. No hay zonas diferenciadas.

#### Cambios necesarios

**1. Crear tabla `delivery_zones`**

```sql
CREATE TABLE public.delivery_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,           -- ej: "Centro", "Zona Norte", "Zona Sur"
  costo_envio NUMERIC(10,2) NOT NULL DEFAULT 0,
  pedido_minimo NUMERIC(10,2) DEFAULT 0,
  tiempo_estimado_min INTEGER DEFAULT 40,
  barrios TEXT[] DEFAULT '{}',    -- lista de barrios cubiertos
  descripcion TEXT,               -- info adicional para el cliente
  orden INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: lectura publica (clientes), gestion por staff
```

Modelo simple basado en **nombre de zona/barrio** (no GPS/poligonos), que es lo practico para el negocio.

**2. UI de configuracion en WebappConfigPage**

Dentro de la seccion de Delivery en `/milocal/:branchId/config/webapp`, agregar:

- Lista de zonas con nombre, costo, pedido minimo y tiempo estimado
- Boton "Agregar zona"
- Edicion inline de cada zona
- Toggle activo/inactivo por zona
- Si no hay zonas, se usa el `delivery_costo` plano como fallback

**3. Selector de zona en el checkout del cliente**

En `CartSheet.tsx`, cuando el servicio es delivery:

- Si existen zonas activas para la sucursal, mostrar un selector (dropdown o lista de cards) para que el cliente elija su zona
- El costo de envio se actualiza segun la zona seleccionada
- Si hay pedido minimo por zona, validar antes de confirmar

**4. Actualizar edge function `create-webapp-order`**

- Recibir `delivery_zone_id` opcional en el body
- Si viene, buscar la zona y usar su `costo_envio` en lugar del plano
- Validar pedido minimo de la zona
- Guardar `delivery_zone_id` en el pedido (agregar columna a `pedidos`)

### Secuencia de implementacion

1. Migracion: crear tabla `delivery_zones` + columna en `pedidos`
2. UI de gestion de zonas en la config del local
3. Selector de zona en el checkout del cliente
4. Actualizar edge function para usar zona seleccionada

### Detalles tecnicos

- **Fallback**: Si un local no tiene zonas configuradas, el sistema sigue funcionando con el costo plano actual
- **Sin mapa**: Se usa seleccion por nombre de zona/barrio, no por coordenadas GPS (mucho mas simple y practico)
- **RLS**: Lectura publica para `anon` (el cliente necesita ver las zonas), escritura solo para staff con acceso al local

