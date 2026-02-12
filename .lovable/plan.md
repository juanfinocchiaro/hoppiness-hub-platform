

## Extras integrados en Centro de Costos: dos conceptos separados, una sola pantalla

### El problema

La hamburguesa American tiene ingredientes sueltos en su composicion (carne, queso, lechuga, pan). Eso permite que el "Sin queso" sea un solo click. Pero el "Extra Carne con queso" es una **receta completa** que no necesita estar en la composicion original -- es un agregado independiente.

Ademas, necesitas poder ver y editar los precios de todos los extras desde el Centro de Costos, de forma centralizada, sin tener que ir item por item.

### Solucion: Composicion + Extras como dos secciones dentro de cada item

Cuando expandis un item en el Centro de Costos, la pestana "Composicion" tendra:

```text
COMPOSICION FIJA
  Componente          | Cant. | Subtotal | SIN
  Carne 90g           |  2    | $3.600   |  [v]
  Queso cheddar        |  2    | $500     |  [v]
  Pan brioche          |  1    | $350     |  [ ]
  Lechuga              |  1    | $80      |  [v]

EXTRAS DISPONIBLES
  Extra                | Costo  | P.Extra  | FC%     |
  Carne 90g c/cheddar  | $1.800 | [$2.500] | 87% (!) | [x]
  Provoleta grillada    | $600   | [$1.800] | 40% (!) | [x]
  Extra queso cheddar   | $250   | [$500]   | 61% (!) | [x]
  [+ Agregar Extra]

GRUPOS OPCIONALES (sin cambios)
  ...
```

### Reglas

- **SIN**: solo para componentes de la composicion fija. Cualquiera puede ser removible. Toggle simple.
- **Extras**: recetas o insumos que se agregan como extra al producto. Se eligen de una lista de todos los que tengan `puede_ser_extra = true`. No necesitan estar en la composicion.
- **Precio extra**: se edita desde aca pero se guarda en `preparaciones.precio_extra` o `insumos.precio_extra` (centralizado). Cambiar el precio de "Carne 90g c/cheddar" aca lo actualiza en TODOS los items que la tengan como extra.
- **FC% extra**: `costo / (precio_extra / 1.21) * 100` con semaforo visual.

### Donde se decide que "puede ser extra"

En **Recetas** e **Insumos**: un toggle "Puede ser extra" (boolean). Sin precio, sin FC. Solo decide elegibilidad. La lechuga no se marca, la provoleta si, la carne con queso si.

### Cambios en base de datos

**Migracion SQL:**

1. Agregar `puede_ser_extra` (boolean, default false) a `preparaciones` e `insumos`. Migrar los que ya tienen `precio_extra` como `true`.

2. Crear tabla `item_carta_extras`:

```text
item_carta_extras
  id (UUID, PK, default gen_random_uuid())
  item_carta_id (UUID, FK items_carta, ON DELETE CASCADE)
  preparacion_id (UUID, nullable, FK preparaciones)
  insumo_id (UUID, nullable, FK insumos)
  orden (integer, default 0)
  created_at (timestamptz, default now())
```

El precio NO se guarda aca -- viene del join con la receta/insumo.

3. Eliminar columna `es_extra` de `item_carta_composicion`. Mantener `es_removible`.

4. RLS: misma logica que `item_carta_composicion` (staff lee, financial escribe).

### Cambios en Recetas (`PreparacionesPage.tsx`)

- Reemplazar `InlinePrecioExtra` (input precio + FC%) por un Switch "Puede ser extra"
- Guarda `puede_ser_extra: true/false`
- Sin input de precio, sin calculo de FC

### Cambios en Centro de Costos

#### Seccion "Composicion Fija" (simplificada)
- Eliminar columnas "Extra" y "P. Extra" de la tabla de composicion
- Mantener solo la columna "SIN" (toggle `es_removible`)

#### Seccion "Extras Disponibles" (nueva, debajo de composicion)
- Tabla con los extras asignados a este item
- Columnas: Nombre, Tipo (Receta/Insumo), Costo, P. Extra (input editable), FC% (badge semaforo), boton eliminar
- Boton "Agregar Extra" con selector que muestra solo recetas/insumos con `puede_ser_extra = true`
- **Editar el precio extra actualiza la tabla central** (`preparaciones.precio_extra` o `insumos.precio_extra`), propagando el cambio a todos los items
- Al guardar composicion, tambien se guardan los extras (insert/delete en `item_carta_extras`)

#### Aplica tanto a `ItemExpandedPanel.tsx` (panel inline) como al `ComposicionModal` en `CentroCostosPage.tsx`

### Cambios en hooks

#### Nuevo: `useItemExtras.ts`
- Query: `item_carta_extras` con join a `preparaciones(id, nombre, costo_calculado, precio_extra)` e `insumos(id, nombre, costo_por_unidad_base, precio_extra)`
- Mutation `saveExtras`: sync de la lista de extras (delete all + insert)
- Mutation `updatePrecioExtra`: actualiza `preparaciones.precio_extra` o `insumos.precio_extra`

#### Modificar: `useItemsCarta.ts`
- `saveComposicion`: quitar `es_extra` del payload (solo manda `es_removible`)
- Query de composicion: quitar `precio_extra` del join (ya no se necesita en composicion)

### Archivos a crear
- `src/hooks/useItemExtras.ts`

### Archivos a modificar
- `supabase/migrations/` -- nueva migracion
- `src/components/centro-costos/ItemExpandedPanel.tsx` -- quitar columnas Extra/P.Extra, agregar seccion Extras
- `src/pages/admin/CentroCostosPage.tsx` -- mismos cambios en modal
- `src/pages/admin/PreparacionesPage.tsx` -- InlinePrecioExtra pasa a toggle
- `src/hooks/useItemsCarta.ts` -- simplificar saveComposicion
- `docs/EXTRAS_MODEL.md` -- actualizar

### Ejemplo de flujo completo

**Configurar American:**
1. Composicion: Carne 90g (x2), Queso cheddar (x2), Pan (x1), Lechuga (x1)
2. Marcar SIN: Queso cheddar, Lechuga, Carne
3. Extras: Agregar "Carne 90g c/cheddar" ($2.500), "Extra queso" ($500)
4. Los extras son independientes de la composicion

**Subir precio de "Extra Carne con queso":**
1. Desde cualquier item, editar el P. Extra de $2.500 a $3.000
2. Se actualiza en la receta central
3. Todas las hamburguesas que ofrezcan ese extra muestran $3.000

