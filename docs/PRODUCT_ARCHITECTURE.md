# Product Architecture

## Overview

The product system uses a 3-layer architecture that flows from raw ingredients up to finished menu items.

```
Layer 1: Insumos (base ingredients/supplies)
    ↓
Layer 2: Preparaciones (recipes/preparations)
    ↓
Layer 3: Items de Carta (menu items for sale)
```

## Layer 1: Insumos

**Table:** `insumos`

Base-level supply units. Everything the business buys or uses.

| Field | Description |
|-------|-------------|
| `tipo_item` | `ingrediente` (used in recipes), `insumo` (general supply), `producto` (finished product) |
| `costo_por_unidad_base` | Cost per base unit (e.g., cost per kg) |
| `unidad_base` | Base measurement unit (kg, lt, unidad) |
| `precio_extra` | Selling price when added as an extra to a menu item |
| `nivel_control` | Stock tracking level |

**Managed in:** Mi Marca > Producto y Menu > Insumos

---

## Layer 2: Preparaciones

**Table:** `preparaciones`

Recipes that transform insumos into components. Two types:

### Type: `elaborado` (Technical Sheet)
Has a recipe with ingredients. Uses `preparacion_ingredientes` to define composition.

Example: Smash patty = 120g carne + 5g sal + 2g pimienta

### Type: `componente_terminado` (Finished Component)
A component with interchangeable options. Uses `preparacion_opciones`.

Example: "Proteina" component with options: Patty simple, Patty doble, Pollo crispy

### Related Tables

| Table | Purpose |
|-------|---------|
| `preparacion_ingredientes` | Links elaborados to their insumos/sub-preparaciones with quantities |
| `preparacion_opciones` | Defines interchangeable options for componente_terminado |

**Cost:** `costo_calculado` is auto-computed by `recalcular_costo_preparacion()` cascading from insumo costs.

**Managed in:** Mi Marca > Producto y Menu > Recetas

---

## Layer 3: Items de Carta

**Table:** `items_carta`

Finished products shown on the menu and sold to customers.

| Field | Description |
|-------|-------------|
| `precio_base` | Selling price |
| `categoria_carta_id` | Menu category (`menu_categorias`) |
| `disponible_webapp` | Available in the online store |
| `disponible_delivery` | Available for delivery orders |
| `costo_total` | Auto-calculated from composition |
| `fc_actual` | Actual food cost percentage |
| `fc_objetivo` | Target food cost percentage |
| `tipo` | `normal` (regular item), `extra` (add-on item) |

### Composition

**Table:** `item_carta_composicion`

Links items to their preparaciones/insumos. Defines what's in the product.

Used for:
- Cost calculation (cascading from insumos)
- Display in admin product preview
- Not directly used for modifiers (extras/removibles have their own tables)

### Categories

**Table:** `menu_categorias`

| Field | Description |
|-------|-------------|
| `nombre` | Category name (e.g., "Hamburguesas", "Bebidas") |
| `orden` | Display order |
| `visible_en_carta` | Shown in the menu |
| `tipo_impresion` | `comanda` (kitchen ticket), `vale` (bar voucher), `no_imprimir` |

**Managed in:** Mi Marca > Producto y Menu > Carta, Categorias

---

## Modifier System

### Extras (Add-ons)

**Active system:** `item_extra_asignaciones`

Links a menu item to extra items (`items_carta` where `tipo = 'extra'`).

| Table | Status | Description |
|-------|--------|-------------|
| `item_extra_asignaciones` | ACTIVE | New system. Links `item_carta_id` to `extra_id` |
| `item_carta_extras` | DEPRECATED | Legacy table. Do not write. Reads removed. |

**Hook:** `useItemExtras` (reads from `item_extra_asignaciones` only)

### Removibles (Removals)

**Active system:** `item_removibles`

Defines which insumos/preparaciones can be removed from an item.

| Field | Description |
|-------|-------------|
| `insumo_id` or `preparacion_id` | What can be removed (mutually exclusive) |
| `nombre_display` | Custom display name (e.g., "Sin lechuga") |
| `activo` | Whether this removal option is active |

**Hook:** `useItemRemovibles`

### Optional Groups

**Active system:** `item_carta_grupo_opcional` + `item_carta_grupo_opcional_items`

Defines groups of optional choices (e.g., "Elegí tu salsa", "Tipo de pan").

| Table | Description |
|-------|-------------|
| `item_carta_grupo_opcional` | Group definition (name, order, min/max selections) |
| `item_carta_grupo_opcional_items` | Items within the group (insumo or preparacion) |

**Hook:** `useGruposOpcionales`

### Order-Level Modifiers

**Table:** `pedido_item_modificadores`

Stores modifiers applied to specific order items. Written when an order is created with modifications.

| Field | Description |
|-------|-------------|
| `tipo` | `extra`, `sin`, `cambio` |
| `nombre` | Display name of the modifier |
| `precio_extra` | Additional price (for extras) |

---

## Deprecated Tables

| Table | Replacement | Notes |
|-------|------------|-------|
| `item_carta_extras` | `item_extra_asignaciones` | Legacy fallback removed. Data preserved. |
| `item_modificadores` | `item_removibles` + `item_extra_asignaciones` | Only used in legacy `ModificadoresTab`. |

---

## Cost Cascade

```
insumo.costo_por_unidad_base
    ↓ (via preparacion_ingredientes.cantidad)
preparacion.costo_calculado = SUM(ingrediente.costo * cantidad)
    ↓ (via item_carta_composicion)
item_carta.costo_total = SUM(componente.costo)
    ↓
item_carta.fc_actual = (costo_total / precio_base) * 100
```

Triggered by: `recalcular_costo_preparacion()` and `recalcular_costo_item_carta()` SQL functions.

---

## Data Flow: Brand to Branch

Products are defined at the **brand level** (shared across all branches).

Branch-level control is via:
- `disponible_webapp` (per item, controls online store visibility)
- `webapp_config` (per branch, controls store state and services)
- Stock thresholds can be overridden per branch (`stock_minimo_local`, `stock_critico_local`)
- Prices are brand-wide (no branch-level pricing)

---

## POS Flow

1. `ProductGrid` loads items from `items_carta` + `menu_categorias`
2. User clicks item → `ModifiersModal` opens
3. `ModifiersModal` loads extras (`useItemExtras`) and removibles (`useItemRemovibles`)
4. User selects modifiers → item added to cart with `extras[]`, `removibles[]`, `notas`
5. On "Send to Kitchen":
   - `pedido_items` created
   - `pedido_item_modificadores` created for each modifier
   - Kitchen display shows modifiers with color coding (SIN=red, EXTRA=orange, CAMBIO=blue)

## WebApp Flow

1. `PedirPage` loads items with `useWebappMenuItems` (filtered by `disponible_webapp`)
2. User clicks product → `ProductCustomizeSheet` opens
3. Sheet loads optional groups (`useWebappItemExtras` → `item_carta_grupo_opcional`)
4. User customizes → added to cart in memory
5. Checkout via MercadoPago (when configured)
