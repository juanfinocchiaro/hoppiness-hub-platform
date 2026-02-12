# Modelo de Extras: Precio centralizado en Receta/Insumo

## Problema

Hoy los extras de un item (ej: "Extra Carne 90g con cheddar") se definen **por cada item de carta** individualmente en la tabla `item_modificadores`. Si la receta "Carne 90g con queso cheddar" está como extra en 5 combos distintos, hay que ponerle precio 5 veces y mantenerlo 5 veces.

## Regla de negocio clave

Un item de carta solo puede tener como **removible** o como **extra** algo que ya está en su **composición** (`item_carta_composicion`). No se puede agregar repollo a un combo que no tiene repollo. La composición define el universo de modificadores posibles.

---

## Solución: campo `precio_extra` en `preparaciones` e `insumos`

### Concepto

Cada receta e insumo puede opcionalmente tener un precio de venta como extra. Cuando se configura un item de carta, el sistema lee su composición y muestra cada componente con toggles para "removible" y "extra disponible". El precio del extra viene de la receta/insumo, no se define por item.

Cambiar el `precio_extra` en la receta → se actualiza automáticamente en todos los items que lo usan.

---

## Cambios en base de datos

### 1. Agregar campo a `preparaciones`

```sql
ALTER TABLE preparaciones
  ADD COLUMN precio_extra numeric DEFAULT NULL;

COMMENT ON COLUMN preparaciones.precio_extra IS
  'Precio que se cobra al cliente por agregar esta receta como extra. NULL = no disponible como extra.';
```

### 2. Agregar campo a `insumos`

```sql
ALTER TABLE insumos
  ADD COLUMN precio_extra numeric DEFAULT NULL;

COMMENT ON COLUMN insumos.precio_extra IS
  'Precio que se cobra al cliente por agregar este insumo como extra. NULL = no disponible como extra.';
```

### 3. Agregar campos a `item_carta_composicion`

```sql
ALTER TABLE item_carta_composicion
  ADD COLUMN es_removible boolean DEFAULT false,
  ADD COLUMN es_extra boolean DEFAULT false;

COMMENT ON COLUMN item_carta_composicion.es_removible IS
  'Si true, el cliente puede pedir este componente SIN (sin descuento).';
COMMENT ON COLUMN item_carta_composicion.es_extra IS
  'Si true, el cliente puede pedir una porción adicional de este componente (con cargo).';
```

### 4. Tabla `item_modificadores` → QUEDA OBSOLETA

La tabla `item_modificadores` actual ya no se usa para extras ni removibles. Toda la info se lee de `item_carta_composicion` (toggles) + `preparaciones.precio_extra` / `insumos.precio_extra` (precio). No hay que borrarla de inmediato, simplemente deja de consultarse.

---

## Modelo de datos resultante

### Tablas que ya existen (sin cambios en estructura base)

```
preparaciones
├── id, nombre, tipo, costo_calculado, costo_manual...
└── precio_extra (NUEVO) ← precio al cliente por agregar como extra

insumos
├── id, nombre, tipo_item, costo_por_unidad_base, unidad_base...
└── precio_extra (NUEVO) ← precio al cliente por agregar como extra

item_carta_composicion
├── id, item_carta_id, preparacion_id, insumo_id, cantidad, orden
├── es_removible (NUEVO) ← toggle: ¿se puede pedir SIN?
└── es_extra (NUEVO) ← toggle: ¿se puede pedir extra?
```

### Flujo de datos

```
preparaciones.precio_extra = $2.500     ← se define UNA vez
        │
        ▼
item_carta_composicion                  ← por cada item que usa esa receta
├── item_carta_id: "combo-ultracheese"
├── preparacion_id: "carne-90g-cheddar"
├── cantidad: 1
├── es_removible: true                  ← "Sin Carne" disponible
├── es_extra: true                      ← "Extra Carne" disponible a $2.500
│
├── item_carta_id: "combo-ultrabacon"
├── preparacion_id: "carne-90g-cheddar"
├── cantidad: 1
├── es_removible: true
├── es_extra: true                      ← Mismo precio $2.500, viene de la receta
```

---

## Cambios en UI

### A. Formulario de Receta (`/recetas` → editar una receta)

Agregar un campo al form de edición de receta:

```
┌─────────────────────────────────────────────┐
│  Receta: Carne 90g con queso cheddar        │
│                                             │
│  Costo calculado:  $ 1.800                  │
│  Precio como extra ($): [  2.500  ]         │  ← CAMPO NUEVO
│                                             │
│  FC% extra: 87.1%  🔴                      │  ← calculado automático
│  (costo / (precio_extra / 1.21) × 100)     │
└─────────────────────────────────────────────┘
```

Si el campo está vacío/null, esta receta **no se puede ofrecer como extra** en ningún item. Si tiene valor, cualquier item que use esta receta puede habilitar el toggle "extra".

Lo mismo para insumos en el Catálogo de Compras.

### B. Modal de Composición de un Item (ya existe en `CentroCostosPage`)

El modal de composición actual muestra los componentes fijos. Se le agregan dos columnas de toggles:

```
┌────────────────────────────────────────────────────────────────────────────┐
│  Composición: Combo Ultracheese                                           │
│                                                                           │
│  COMPOSICIÓN FIJA                                                         │
│  ──────────────────────────────────────────────────────────────────────── │
│  Componente              │ Cant. │ Costo   │ Removible │ Extra │ P.Extra  │
│  ─────────────────────────────────────────────────────────────────────── │
│  Carne 90g c/ cheddar    │   1   │ $ 1.800 │    ☑      │  ☑    │ $ 2.500  │
│  Pan brioche             │   1   │ $   350 │    ☐      │  ☐    │    —     │
│  Lechuga                 │   1   │ $    80 │    ☑      │  ☐    │    —     │
│  Tomate                  │   1   │ $   120 │    ☑      │  ☐    │    —     │
│  Salsa Hoppiness         │   1   │ $   249 │    ☑      │  ☐    │    —     │
│  Papas fritas            │   1   │ $ 1.200 │    ☐      │  ☑    │ $ 1.500  │
│  ─────────────────────────────────────────────────────────────────────── │
│  • P.Extra viene de la receta/insumo. No se edita acá.                   │
│  • Si un componente no tiene precio_extra definido, el toggle Extra       │
│    aparece deshabilitado con tooltip "Definí precio en la receta".        │
│                                                                           │
│  GRUPOS OPCIONALES (sin cambios, funciona igual que ahora)                │
│  ...                                                                      │
└────────────────────────────────────────────────────────────────────────────┘
```

**Reglas de los toggles:**

- **Removible**: siempre se puede activar para cualquier componente. No tiene implicancia de precio (se cobra lo mismo).
- **Extra**: solo se puede activar si la receta/insumo referenciada tiene `precio_extra != null`. Si no tiene, el toggle está gris con tooltip "Definí el precio extra en la receta/insumo".

### C. Sección de Sustituciones → SE ELIMINA

No se implementan sustituciones. La sección "Sustituciones" del modal de modificadores actual desaparece.

### D. Modal de Modificadores → SE ELIMINA

El modal separado de "Modificadores" (`ModificadoresTab.tsx`) que se abría como popup ya no es necesario. Los toggles de removible/extra están integrados directamente en el modal de composición (punto B). El botón "Modif." del menú de acciones `⋯` en la tabla de Análisis se reemplaza o se elimina, dado que la información ahora vive dentro de "Composición".

---

## Cambios en código

### Archivos a modificar

#### 1. `src/hooks/usePreparaciones.ts`
- El form de receta necesita poder guardar `precio_extra`.
- El mutation de update debe incluir `precio_extra` en el payload.

#### 2. `src/hooks/useItemsCarta.ts` → `saveComposicion`
- Al guardar la composición, incluir `es_removible` y `es_extra` por fila.

```ts
// Actual
items: rows.map(r => ({
  preparacion_id: ...,
  insumo_id: ...,
  cantidad: r.cantidad,
}))

// Nuevo
items: rows.map(r => ({
  preparacion_id: ...,
  insumo_id: ...,
  cantidad: r.cantidad,
  es_removible: r.es_removible || false,   // NUEVO
  es_extra: r.es_extra || false,            // NUEVO
}))
```

#### 3. `src/hooks/useItemCartaComposicion` (dentro de `useItemsCarta.ts`)
- El select ya trae `preparaciones(id, nombre, costo_calculado)` e `insumos(id, nombre, costo_por_unidad_base)`.
- Agregar `precio_extra` al join:

```ts
// Actual
preparaciones(id, nombre, costo_calculado, tipo)
insumos(id, nombre, costo_por_unidad_base, unidad_base)

// Nuevo
preparaciones(id, nombre, costo_calculado, tipo, precio_extra)
insumos(id, nombre, costo_por_unidad_base, unidad_base, precio_extra)
```

#### 4. `src/pages/admin/CentroCostosPage.tsx` → `ComposicionModal`
- Agregar columnas "Removible", "Extra", "P. Extra" a cada fila de composición.
- "Removible" = switch/checkbox, siempre habilitado.
- "Extra" = switch/checkbox, habilitado solo si la receta/insumo tiene `precio_extra`.
- "P. Extra" = texto readonly que muestra el `precio_extra` de la receta/insumo.
- Al guardar, incluir `es_removible` y `es_extra` en el payload.

#### 5. `src/components/menu/ModificadoresTab.tsx`
- Ya no se usa para extras/removibles. Se puede conservar temporalmente pero la referencia desde `CentroCostosPage` se elimina.
- Eliminar el botón "Modif." del menú de acciones `⋯` en la tabla de Análisis.

#### 6. Formularios de Receta e Insumo
- Agregar campo `precio_extra` ($) al form de edición.
- Mostrar FC% calculado en tiempo real: `costo_calculado / (precio_extra / 1.21) × 100`.

---

## Consulta para obtener extras de un item

Cuando una app de pedidos (o el POS) necesita saber qué extras tiene un combo:

```sql
SELECT
  c.item_carta_id,
  c.preparacion_id,
  c.insumo_id,
  c.cantidad,
  c.es_removible,
  c.es_extra,
  COALESCE(p.nombre, i.nombre) AS nombre_componente,
  COALESCE(p.precio_extra, i.precio_extra) AS precio_extra,
  COALESCE(p.costo_calculado, i.costo_por_unidad_base) AS costo
FROM item_carta_composicion c
LEFT JOIN preparaciones p ON p.id = c.preparacion_id
LEFT JOIN insumos i ON i.id = c.insumo_id
WHERE c.item_carta_id = :item_id
  AND (c.es_removible = true OR c.es_extra = true)
ORDER BY c.orden;
```

Resultado para "Combo Ultracheese":

```
nombre_componente         │ es_removible │ es_extra │ precio_extra │ costo
──────────────────────────┼──────────────┼──────────┼──────────────┼────────
Carne 90g c/ cheddar      │     true     │   true   │    2.500     │ 1.800
Lechuga                   │     true     │  false   │     NULL     │    80
Tomate                    │     true     │  false   │     NULL     │   120
Salsa Hoppiness           │     true     │  false   │     NULL     │   249
Papas fritas              │    false     │   true   │    1.500     │ 1.200
```

---

## Ejemplo de flujo completo

### Escenario: Subir el precio de "Extra Carne" de $2.500 a $3.000

**Hoy (sin el cambio):**
1. Ir al Combo Ultracheese → Modificadores → buscar "Extra Carne" → cambiar precio
2. Ir al Combo Ultrabacon → Modificadores → buscar "Extra Carne" → cambiar precio
3. Repetir para cada combo que tenga ese extra
4. Rezar no haber olvidado ninguno

**Con Modelo 1:**
1. Ir a Recetas → "Carne 90g con queso cheddar" → cambiar `precio_extra` de 2.500 a 3.000
2. Listo. Todos los combos que tengan esa receta como extra ahora cobran $3.000.

### Escenario: Habilitar "Extra Papas" en un combo nuevo

1. Verificar que la receta "Papas fritas" ya tenga `precio_extra` definido (ej: $1.500)
2. Ir a Control de Costos → Combo nuevo → Composición
3. Agregar "Papas fritas" como componente
4. Activar toggle "Extra" ☑ → automáticamente muestra "P. Extra: $1.500"
5. Guardar

### Escenario: Receta nueva sin precio extra definido

1. Crear receta "Salsa BBQ" con costo $180
2. Agregar a composición de un combo
3. En la fila de composición, toggle "Extra" aparece **deshabilitado** con tooltip: "Definí el precio extra en la receta"
4. Toggle "Removible" sí funciona: se puede habilitar "Sin Salsa BBQ"
5. Si se quiere ofrecer como extra: ir a Recetas → "Salsa BBQ" → poner `precio_extra: $500` → volver al combo → toggle Extra ahora se puede activar

---

## Resumen de cambios

| Qué                           | Acción                                                        |
|-------------------------------|---------------------------------------------------------------|
| `preparaciones`               | Agregar columna `precio_extra` (numeric, nullable)            |
| `insumos`                     | Agregar columna `precio_extra` (numeric, nullable)            |
| `item_carta_composicion`      | Agregar columnas `es_removible` (bool) y `es_extra` (bool)   |
| `item_modificadores`          | Deja de usarse (no borrar, solo dejar de consultar)           |
| Form de Receta                | Agregar campo "Precio como extra ($)" + FC% en vivo           |
| Form de Insumo                | Agregar campo "Precio como extra ($)" + FC% en vivo           |
| ComposicionModal              | Agregar columnas Removible/Extra/P.Extra con toggles          |
| ModificadoresTab              | Eliminar referencia, ya no se necesita                        |
| Menú acciones tabla Análisis  | Eliminar opción "Modificadores"                               |
