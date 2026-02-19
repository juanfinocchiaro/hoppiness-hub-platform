# Análisis UX: Mi Marca, Mi Local, Mi Cuenta

Análisis de la interfaz según cinco dimensiones y propuestas de solución concretas, con referencia al código actual.

---

## 1. Information Density (Densidad de información)

### Dónde falla

**Sidebar (LocalSidebar, BrandSidebar, CuentaSidebar)**  
- `WorkSidebarNav` usa `space-y-1`: un único espaciado entre todos los bloques (secciones, ítems, dashboard links). No hay separación visual entre grupos lógicos.  
- Varias secciones con `defaultOpen` (Ventas y Caja, Equipo y Tiempo en Mi Local) dejan mucho contenido expandido a la vez.  
- En Mi Local hay muchas secciones seguidas: Dashboard, Ventas y Caja (6 ítems), Operación del Día (4), Equipo y Tiempo (9), Finanzas (hasta 7), Mi Cuenta Socio, Comunicados, Supervisiones, Configuración. Todo con el mismo peso visual.

**Footer del sidebar (BranchLayout, BrandLayout, CuentaLayout)**  
- En un mismo bloque `space-y-3` conviven: selector de sucursal, “Ver como...”, PanelSwitcher (“CAMBIAR A” + Mi Cuenta / Mi Local / Mi Marca), `border-t` y luego Volver al Inicio + Salir.  
- `PanelSwitcher` tiene un `text-xs uppercase` “Cambiar a” y después botones `variant="ghost"` iguales a los ítems de navegación.  
- Selector, contexto (impersonación) y acciones globales compiten en un solo flujo vertical sin agrupación clara.

**POS (ProductGrid, OrderConfigPanel)**  
- `ProductGrid`: categorías con `space-y-4`, productos en `grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2` y botones `min-h-[72px] p-2`. Muchos productos por vista con poco aire.  
- `OrderConfigPanel`: canal, tipo de servicio, número de llamador (grid 6 columnas `gap-1.5`), nombre; todo en un solo `Card` con `space-y-4`. La grilla de llamadores (1–30) es muy densa.

**Dashboard (ManagerDashboard)**  
- Card “Ventas Hoy”: turnos en grid de 2, total, link historial y mensaje “Ningún turno cargado” en poco espacio.  
- Card “Pendientes”: tres filas (solicitudes, comunicados, firmas) con `space-y-2`; bien para la lista pero la card en conjunto con las demás suma densidad.

### Propuestas

| Área | Solución |
|------|----------|
| Sidebar | Reducir densidad: **colapsar por defecto** todas las secciones salvo la que contiene la ruta activa (`forceOpen`). Quitar `defaultOpen` de Ventas y Caja y Equipo y Tiempo en LocalSidebar; dejar solo `forceOpen` para abrir la sección activa. |
| Sidebar | Aumentar espacio entre **grupos lógicos**: por ejemplo `space-y-4` o `space-y-3` entre `NavSectionGroup` y entre sección “nav” y footer, y `space-y-1` solo dentro de cada grupo. |
| Footer | **Separar en bloques**: (1) Selector de sucursal con más margen inferior; (2) “Ver como” (si aplica); (3) “CAMBIAR A” con título más visible y más espacio arriba/abajo; (4) zona de acciones (Volver al Inicio, Salir) con `pt-4` y quizá un subtítulo “Salir del panel”. |
| POS | En ProductGrid: **aumentar** `gap` (p.ej. `gap-3` o `gap-4`) y padding interno de los botones; considerar menos columnas en móvil. En OrderConfigPanel: más `space-y-*` entre bloques y grilla de llamadores con menos columnas o más alto por celda. |
| Dashboard | Mantener `space-y-4` entre cards; dentro de “Ventas Hoy”, separar visualmente turnos (Mediodía/Noche) del total y del CTA (p.ej. con un divisor o más padding). |

---

## 2. Visual Hierarchy (Jerarquía visual)

### Dónde falla

**Sidebar**  
- `NavSectionGroup` y `NavDashboardLink` / `NavItemButton` usan el mismo `Button variant="ghost"`. Los títulos de sección (Ventas y Caja, Equipo y Tiempo) tienen el mismo tamaño y peso que los ítems hijos; solo la indentación (`pl-4` en CollapsibleContent) y el chevron los diferencian.  
- En WorkSidebar, el trigger de sección no tiene `font-semibold` ni `text-sm` diferenciado; los ítems son `size="sm"`. Todo parece “una lista plana”.

**Footer**  
- “CAMBIAR A” es `text-xs uppercase text-muted-foreground`; los links Mi Cuenta / Mi Local / Mi Marca son botones ghost como los del nav. No hay jerarquía clara entre “esto es un encabezado de grupo” y “estas son acciones de cambio de contexto”.

**POS**  
- Encabezados de categoría en ProductGrid: `text-sm font-semibold text-muted-foreground`. Muy parecidos al contenido; no hay uso de color de marca ni tamaño mayor para “ACOMPAÑAMIENTOS”, “BEBIDAS”, etc.  
- Product cards: mismo estilo para todos; no hay acento (color, borde) para categoría o destacados.

**Dashboard**  
- Títulos de cards: `CardTitle` con `text-base` e icono; todas las cards tienen el mismo tratamiento.  
- En “Pendientes”, los tres ítems (solicitudes, comunicados, firmas) tienen el mismo peso; solo el badge destructivo en solicitudes da prioridad. Firmas y comunicados usan `outline`/`secondary`, lo que está bien pero podría reforzarse con un subtítulo o icono diferenciado para “urgente”.

### Propuestas

| Área | Solución |
|------|----------|
| Sidebar | **Secciones padre más destacadas**: en `NavSectionGroup` (CollapsibleTrigger), usar `font-semibold` y `text-sm` o `text-base`, y color `text-foreground`. En ítems hijos mantener `text-sm` y opcionalmente `text-muted-foreground` cuando no están activos. |
| Sidebar | **Iconos diferenciados**: secciones con iconos de categoría (ShoppingCart, UserCheck, Wallet); ítems con iconos más pequeños o de “acción”. Opcional: color de marca solo en el ítem activo (ya hay `bg-primary/10 text-primary`). |
| Footer | **“CAMBIAR A” como encabezado claro**: `text-xs font-semibold uppercase tracking-wider text-muted-foreground` y más margen inferior (`mb-2`). Los botones del PanelSwitcher pueden seguir ghost pero con un contenedor con `rounded-md` y fondo sutil para agruparlos. |
| Footer | **Acciones de salida distintas**: Volver al Inicio y Salir en un bloque con borde superior y título “Salir” o sin título pero con estilo más secundario (p.ej. `text-muted-foreground` por defecto). |
| POS | **Headers de categoría con color de marca**: por ejemplo `text-primary font-semibold` o un borde/barra lateral `border-l-4 border-primary` en el contenedor de cada categoría. |
| POS | **Cards de producto**: opcionalmente borde o fondo sutil al hover; mantener nombre siempre visible (evitar truncar con `line-clamp-2` solo cuando no haya espacio). |
| Dashboard | **Cards**: usar en el header de la card un toque de color de marca (p.ej. `border-l-4 border-primary` en Card o en CardHeader) para la card principal (Ventas Hoy). En Pendientes, unificar criterio de badges (todos con Badge) y usar variante “destructive” o “warning” solo para ítems que requieren acción urgente, con leyenda breve si hace falta. |

---

## 3. Cognitive Load (Carga cognitiva)

### Dónde falla

- **Demasiadas opciones visibles a la vez**: en Mi Local, con POS habilitado y permisos amplios, el usuario ve Dashboard + 6 ítems de Ventas y Caja + 4 de Operación del Día + 9 de Equipo y Tiempo + varios de Finanzas + Socios + Comunicados + Supervisiones + Config. No hay “modo simple” ni agrupación por rol.  
- **Footer**: en pocos centímetros se mezcla “en qué sucursal estoy”, “con qué usuario estoy viendo” (Ver como), “a qué panel ir” (Cambiar a) y “salir / inicio”. Son cuatro tipos de decisión distintos.  
- **POS**: canal (Mostrador / Apps), tipo de servicio (Para llevar, Comer acá, Delivery), número de llamador (1–30), nombre opcional, y luego el menú con muchas categorías y productos. Todo visible en una sola pantalla.  
- **Dashboard**: varias cards con métricas, enlaces y estados; “Pendientes” con tres tipos de tareas sin priorización visual clara más allá del badge.

### Propuestas

| Área | Solución |
|------|----------|
| Sidebar | **Una sola sección abierta**: que solo la sección con la ruta activa esté expandida; el resto colapsado. Así se reduce lo que se procesa sin quitar opciones. Ya existe `forceOpen`; quitar `defaultOpen` donde no sea necesario. |
| Sidebar | **Separadores entre grupos**: un `<hr className="my-3 border-border" />` o un div con `py-2` entre bloques (p.ej. entre Finanzas y Mi Cuenta Socio, y antes de Comunicados). Ayuda a “cortar” mentalmente la lista. |
| Footer | **Agrupar con títulos y espacio**: “Contexto” (sucursal + Ver como), “Cambiar panel” (CAMBIAR A + links), “Acciones” (Volver al Inicio, Salir). Cada grupo con título opcional y más espacio vertical. |
| POS | **Flujo por pasos**: ya existe “Nueva Venta” que lleva a canal/cliente; reforzar que hasta no elegir canal y tipo de servicio el menú esté deshabilitado, y mostrar un mensaje breve (“Elegí canal y cliente para ver el menú”). En OrderConfigPanel, considerar pestañas o acordeón: “Canal y servicio” y “Cliente / Llamador” para no mostrar todo junto en pantallas chicas. |
| Dashboard | **Priorizar una card**: la primera (Ventas Hoy o la más relevante para el rol) con mayor tamaño o un diseño que la marque como “empezar acá”. En Pendientes, ordenar por urgencia (solicitudes primero si tienen pendientes) y usar un solo estilo de badge para “cantidad” y otro para “acción requerida”. |

---

## 4. Scanability (Escaneabilidad)

### Dónde falla

- **Sidebar**: al tener muchas líneas con el mismo estilo (mismo tamaño, mismo icono pequeño), el ojo no puede “saltar” a secciones; hay que leer en secuencia.  
- **POS**: la grilla de productos es muy uniforme (mismo card, mismo tipo de texto); las categorías son solo una línea de texto pequeña.  
- **Dashboard**: los títulos de las cards son similares; “Pendientes” tiene tres filas muy parecidas.  
- **Footer**: “Cambiar a” y los dos botones (Mi Cuenta, Mi Local) se leen como continuación del nav; cuesta encontrar “Salir” de un vistazo.

### Propuestas

| Área | Solución |
|------|----------|
| Sidebar | **Tamaño de texto mayor en secciones padre**: que los triggers de `NavSectionGroup` sean `text-base` o `font-semibold` y los ítems hijos `text-sm`. Así se escanea primero la lista de secciones y luego el detalle de la abierta. |
| Sidebar | **Sticky / scroll con encabezados**: si el sidebar es muy largo, hacer que el header “Mi Local” / “Mi Marca” sea sticky y que al hacer scroll las secciones colapsadas funcionen como “minimapas” (solo el título visible). Ya está en un `overflow-y-auto`; no hace falta cambiar estructura, solo asegurar que los títulos de sección destaquen. |
| POS | **Categorías sticky**: en ProductGrid, hacer los `<h3>` de categoría `sticky top-0` con fondo sólido y z-index para que al hacer scroll largo sigan visibles y se sepa en qué categoría se está.  
| POS | **Nombre del producto siempre visible**: evitar truncar con `line-clamp-2` salvo en vistas muy estrechas; priorizar nombre completo. Si hay espacio, considerar **imagen o icono de categoría** por producto o por categoría para reconocimiento rápido. |
| Dashboard | **Badges y tabs en lugar de texto plano**: en Pendientes ya se usan Badges; asegurar que todos los números (comunicados, firmas) usen el mismo componente. Para “Ventas Hoy” se puede mostrar Mediodía/Noche como **tabs** o chips clicables en lugar de solo dos cajas en grid. |
| Footer | **Salir siempre visible y agrupado**: agrupar “Volver al Inicio” y “Salir” en un bloque al final, con más espacio arriba (`pt-4`) y opcionalmente un ícono o color más neutro para que se interprete como “salida del panel”, no como otra sección del menú. |

---

## 5. Whitespace / Breathing Room

### Dónde falla

- **WorkSidebarNav**: un único `space-y-1` para todo el nav; no hay “respiro” entre secciones.  
- **WorkSidebar (CollapsibleContent)**: `pl-4 space-y-0.5 mt-1`; los ítems hijos están muy juntos.  
- **Footer (WorkShell)**: el footer usa `p-4 border-t space-y-3`; dentro, BranchLayout mete Select + Ver como + PanelSwitcher + `div.space-y-1` (Volver/Salir). El `space-y-3` es poco para separar selector, “Ver como”, “Cambiar a” y acciones.  
- **ProductGrid**: `gap-2` entre productos y `space-y-4` entre categorías; dentro de una categoría el espacio es escaso.  
- **OrderConfigPanel**: `space-y-4` entre bloques pero la grilla de llamadores es `gap-1.5` y `max-h-36`; se siente apretado.  
- **ManagerDashboard**: `space-y-4` entre cards está bien; dentro de Ventas Hoy el grid de turnos y el total están cerca; en Pendientes `space-y-2` entre filas es justo.

### Propuestas

| Área | Solución |
|------|----------|
| Sidebar | **Más aire entre secciones**: contenedor del nav con `space-y-2` o `space-y-3` entre hijos directos (cada `NavSectionGroup` o `NavDashboardLink`). Dentro de CollapsibleContent mantener `space-y-0.5` o subir a `space-y-1` y aumentar `mt-1` a `mt-2`. |
| Footer | **Más espacio entre grupos**: por ejemplo `space-y-4` en el footer y, dentro, un `space-y-2` entre “Selector” y “Ver como”, luego `pt-3` antes de “CAMBIAR A” y `pt-4 border-t” antes de Volver/Salir. |
| POS | **ProductGrid**: `gap-3` o `gap-4` en la grilla de productos; `space-y-6` entre categorías; padding interno de botones `p-3`.  
| POS | **OrderConfigPanel**: `space-y-5` o `space-y-6` entre bloques; grilla de llamadores con `gap-2` y celdas un poco más altas (`h-10` o más) y/o menos columnas en móvil. |
| Dashboard | **Dentro de cards**: en Ventas Hoy, `gap-3` entre los dos turnos y `pt-3` antes del total; en Pendientes, `space-y-2` está bien, se puede subir a `space-y-2.5` o `space-y-3` si se quiere más aire. |

---

## Resumen de cambios recomendados por archivo

### `src/components/layout/WorkSidebar.tsx`
- **WorkSidebarNav**: cambiar `space-y-1` a `space-y-2` o `space-y-3` para respirar entre secciones.  
- **NavSectionGroup**: trigger con `font-semibold` y/o `text-base`; CollapsibleContent `mt-2` y `space-y-1`.  
- Opcional: añadir un wrapper que inyecte separadores entre grupos (o clases en LocalSidebar/BrandSidebar para márgenes superiores en secciones).

### `src/components/layout/LocalSidebar.tsx`
- Quitar `defaultOpen` de Ventas y Caja y de Equipo y Tiempo; dejar solo `forceOpen` para abrir la sección activa.  
- Valorar separadores visuales (hr o espacio) entre bloques grandes (p.ej. después de Finanzas, antes de Comunicados).

### `src/pages/local/BranchLayout.tsx` (y análogo en BrandLayout / CuentaLayout)
- Reorganizar el footer en bloques con títulos:  
  - Bloque “Sucursal”: Select.  
  - Bloque “Ver como” (si aplica).  
  - Bloque “Cambiar a”: título más visible, luego PanelSwitcher.  
  - Bloque “Acciones”: `pt-4 border-t`, luego Volver al Inicio y Salir.  
- Aumentar `space-y-3` del footer a `space-y-4` o más entre estos bloques.

### `src/components/layout/PanelSwitcher.tsx`
- Título “Cambiar a”: `text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2`.  
- Opcional: envolver los links en un div con `rounded-md bg-muted/30 p-2` para agruparlos visualmente.

### `src/components/pos/ProductGrid.tsx`
- Aumentar `gap-2` a `gap-3` o `gap-4`; `space-y-4` a `space-y-6` entre categorías.  
- Headers de categoría: `text-base font-semibold` y/o `text-primary` o barra lateral con color de marca.  
- Hacer headers de categoría `sticky top-0 bg-background z-10 py-2`.  
- Asegurar que el nombre del producto no se trunque innecesariamente (revisar `line-clamp-2`).

### `src/components/pos/OrderConfigPanel.tsx`
- Más espacio entre bloques (`space-y-5` o `space-y-6`).  
- Grilla de llamadores: `gap-2`, celdas más altas, o menos columnas en pantallas chicas.  
- Si algún tipo de servicio (p.ej. Delivery) está deshabilitado: usar `disabled` en el botón y **Tooltip** con motivo (“Delivery disponible próximamente” o “Configurá delivery en Caja”).

### `src/components/local/ManagerDashboard.tsx`
- Ventas Hoy: más espacio entre turnos y total (padding o gap).  
- Pendientes: mismo estilo de Badge para los tres ítems; usar variante destructiva/warning solo para “requiere acción” y mantener consistencia.  
- Opcional: empty state en “Pedido actual” del POS con ícono y texto tipo “Agregá productos para empezar” (si ese bloque se muestra vacío en algún estado).

### `src/components/layout/WorkShell.tsx`
- En el aside, el footer ya tiene `p-4 border-t space-y-3`; el contenido del footer lo inyectan los layouts. Los cambios de espaciado y agrupación se hacen en BranchLayout/BrandLayout/CuentaLayout.

---

## Empty states y accesibilidad

- **POS – pedido vacío**: cuando el carrito está vacío, mostrar un empty state con ícono (ShoppingBag o similar) y texto motivacional: “Agregá productos para empezar”.  
- **Opciones deshabilitadas**: en OrderConfigPanel (y en general), si un botón o opción está `disabled`, añadir **Tooltip** (componente en `src/components/ui/tooltip.tsx`) con la razón: “Delivery no configurado para este local”, “Abrí la caja para cobrar”, etc.  
- **Color de marca**: usar el color primario de forma consistente como acento: ítem activo en sidebar, headers de categoría en POS, borde o detalle en la card principal del dashboard.

---

## Orden sugerido de implementación

1. **Sidebar**: colapsar por defecto (solo sección activa abierta) y más espacio entre secciones (`WorkSidebar.tsx` + `LocalSidebar.tsx`).  
2. **Footer**: agrupar y etiquetar bloques (Selector, Ver como, Cambiar a, Salir) con más espacio (`BranchLayout`, `BrandLayout`, `CuentaLayout` + `PanelSwitcher`).  
3. **Jerarquía en sidebar**: títulos de sección en `font-semibold` / `text-base` en `WorkSidebar.tsx`.  
4. **POS**: más gap y padding en ProductGrid; categorías sticky y con acento de color; OrderConfigPanel con más espacio y tooltips en deshabilitados.  
5. **Dashboard**: pequeños ajustes de espaciado y consistencia de badges en Pendientes; opcional acento de color en la card principal.

Este documento sirve como guía para aplicar los cambios de forma incremental sin romper la experiencia actual.
