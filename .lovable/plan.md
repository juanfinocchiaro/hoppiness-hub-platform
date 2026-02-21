

## Plan: Notificaciones persistentes de pedidos WebApp

### Problema

Hoy los pedidos de la WebApp solo se ven dentro del POS (`POSPage.tsx`) en el componente `WebappOrdersPanel`. Si el cajero navega a otra seccion (Caja, Stock, Equipo, etc.), no hay ninguna indicacion de que llego un pedido nuevo. Si el pedido se autoaceptara en el futuro, tampoco habria registro visual de ese evento.

### Solucion propuesta

Crear un **indicador global persistente** que viva en el layout de Mi Local (no solo en el POS) y que sea imposible de ignorar:

```
+------------------------------------------+
| [Mi Local Layout]                        |
|                                          |
| +-- Banner flotante (si hay pendientes) -+
| | 🔔 3 pedidos WebApp pendientes  [VER] ||
| +----------------------------------------+
|                                          |
| [Sidebar]    [Contenido de la pagina]    |
+------------------------------------------+
```

### Cambios especificos

**1. Componente `WebappIncomingBanner`** (nuevo)
- Banner sticky/flotante que aparece en CUALQUIER pagina dentro de Mi Local
- Se monta en `BranchLayout.tsx` (el layout padre de todas las paginas del local)
- Consulta pedidos con `origen = 'webapp'` y `estado = 'pendiente'` cada 10 segundos
- Si hay pedidos pendientes:
  - Muestra banner con contador y sonido de notificacion (opcional, con toggle)
  - Boton "Ver pedidos" que navega al POS o abre un modal inline
- Si no hay pedidos pendientes: el banner no se renderiza (0 impacto visual)
- Auto-aceptados: si en el futuro se implementa autoaceptacion, al cambiar a `en_preparacion` automaticamente, el pedido deja de ser `pendiente` y desaparece del banner -- pero ya esta en la barra de cocina del POS como "Preparando"

**2. Indicador en Sidebar**
- En `LocalSidebar.tsx`, agregar un badge con el conteo de pedidos webapp pendientes al lado de "Punto de Venta" o como item separado
- Asi, sin importar donde este el cajero, ve el numerito en la sidebar

**3. Sonido de notificacion**
- Reproducir un sonido corto (beep/campana) cuando llega un pedido nuevo
- Usar un ref para trackear el ultimo conteo conocido y solo sonar cuando sube
- El audio se carga como un asset estatico pequenio (< 10KB)

**4. Realtime (mejora de polling)**
- Actualmente el `WebappOrdersPanel` usa polling cada 10s
- Para el banner global, usar Supabase Realtime en la tabla `pedidos` filtrado por `branch_id` y `origen = 'webapp'` para deteccion instantanea
- Esto elimina el delay de hasta 10 segundos

### Flujo resultante

```
Cajero en CUALQUIER pagina de Mi Local
         |
         v
  Banner global: "2 pedidos WebApp pendientes [Ver]"
  Sidebar: POS (2) <-- badge con conteo
         |
         v
  Click "Ver" --> Navega al POS
         |
         v
  WebappOrdersPanel: Acepta/Rechaza
         |
         v
  Banner desaparece (0 pendientes)
```

### Archivos a crear
- `src/components/local/WebappIncomingBanner.tsx` -- Banner flotante global
- `src/hooks/useWebappPendingCount.ts` -- Hook compartido (realtime) para contar pedidos webapp pendientes

### Archivos a modificar
- `src/pages/local/BranchLayout.tsx` -- Montar el banner global
- `src/components/layout/LocalSidebar.tsx` -- Agregar badge de conteo al item "Punto de Venta"
- `src/components/pos/WebappOrdersPanel.tsx` -- Reutilizar el hook compartido en lugar de su propia query

### Detalles tecnicos

**Hook `useWebappPendingCount`**:
- Usa `supabase.channel()` para escuchar INSERT/UPDATE en `pedidos` donde `origen = 'webapp'`
- Mantiene un conteo local que se sincroniza con una query inicial
- Expone `{ count, orders, isLoading }` para que tanto el banner como la sidebar lo consuman
- Detecta incrementos para disparar el sonido

**Migracion necesaria**: Habilitar realtime en la tabla `pedidos`:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.pedidos;
```

**Sonido**: Se usara `new Audio('/notification.mp3').play()` con un archivo corto. Si no se quiere agregar un asset, se puede generar un beep con Web Audio API (sin dependencias).

