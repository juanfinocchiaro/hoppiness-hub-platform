# SPEC V3 DEFINITIVO — Extras, Removibles y Limpieza

**Objetivo:** Reemplazar el sistema actual de extras (roto, con inputs que no van a ningún lado) por un flujo limpio basado en auto-descubrimiento desde la composición, con análisis de costos integrado.

**Regla de negocio de Hoppiness Club:** Solo se pueden agregar o sacar cosas que son parte del producto. No se agregan ingredientes de otro producto.

---

## PARTE 1: BASE DE DATOS

### 1.1 Campos nuevos en `items_carta`

```sql
-- Vincular un extra con la receta o insumo que representa
ALTER TABLE items_carta
  ADD COLUMN IF NOT EXISTS composicion_ref_preparacion_id uuid REFERENCES preparaciones(id),
  ADD COLUMN IF NOT EXISTS composicion_ref_insumo_id uuid REFERENCES insumos(id);
```

El campo `tipo` ya existe (`'item'` | `'extra'`). Se sigue usando. Items tipo `'extra'` son los extras auto-creados.

### 1.2 Nueva tabla: `item_extra_asignaciones`

Vincula un item de carta con los extras que acepta. Reemplaza a `item_carta_extras` (vieja, apuntaba a preparaciones/insumos) y a `es_extra` en composición.

```sql
CREATE TABLE IF NOT EXISTS item_extra_asignaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_carta_id uuid NOT NULL REFERENCES items_carta(id) ON DELETE CASCADE,
  extra_id uuid NOT NULL REFERENCES items_carta(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(item_carta_id, extra_id)
);

COMMENT ON TABLE item_extra_asignaciones IS
  'Vincula un item (tipo=item) con los extras (tipo=extra) que acepta.
   item_carta_id = producto (ej: Combo Ultracheese).
   extra_id = extra (ej: Extra Carne con queso).';
```

### 1.3 Columnas a eliminar

```sql
-- Ya no se usa: extras vivían en composición con es_extra
ALTER TABLE item_carta_composicion DROP COLUMN IF EXISTS es_extra;
```

Los siguientes campos en `preparaciones` e `insumos` dejan de usarse para extras. Los precios ahora viven en `items_carta.precio_base` del extra:

```sql
-- Opcional: limpiar campos que ya no se usan
-- preparaciones.precio_extra → ya no se lee
-- preparaciones.puede_ser_extra → ya no se lee
-- insumos.precio_extra → ya no se lee
-- insumos.puede_ser_extra → ya no se lee
-- No hace falta dropearlos ahora, pero no se deben consultar más.
```

### 1.4 Tabla vieja a dejar de usar

- `item_carta_extras` → NO eliminar (por seguridad), pero no se consulta más.

---

## PARTE 2: CÓMO FUNCIONAN LOS EXTRAS

### 2.1 Auto-descubrimiento

Cuando se abre el panel de composición de un item, la sección "Extras Disponibles" usa `useItemIngredientesDeepList` (el mismo hook que usan los Removibles) para descubrir automáticamente TODOS los componentes internos del item:

- Deep ingredients (insumos dentro de las recetas de la composición)
- Sub-preparaciones (sub-recetas dentro de las recetas de la composición)

También incluye las **recetas directas** de la composición como extras posibles, PERO excluye las preparaciones madre de nivel 1. Es decir, si la composición es "Hamburguesa Bacon + Porción papas", se muestra "Porcion Bacon" (sub-receta dentro de Hamburguesa Bacon) como extra potencial, y también las recetas completas como "Hamburguesa Bacon" o "Porción papas" podrían ofrecerse si tiene sentido (ej: extra porción de papas). El admin decide con el toggle.

Cada componente descubierto se muestra con un **toggle "Activar como extra"**.

### 2.2 Toggle activa → Auto-crea item tipo='extra'

Al activar un toggle, el sistema:

1. **Busca** si ya existe un `items_carta` con `tipo='extra'` que tenga `composicion_ref_preparacion_id` o `composicion_ref_insumo_id` igual al componente descubierto.
2. **Si no existe**, lo crea:
   ```
   INSERT INTO items_carta (
     nombre: "Extra {nombre del componente}",
     tipo: 'extra',
     categoria_carta_id: {id de categoría EXTRAS/MODIFICADORES},
     precio_base: 0,
     costo_total: {costo del componente},
     fc_objetivo: 30,
     composicion_ref_preparacion_id: {id si es preparación, null si no},
     composicion_ref_insumo_id: {id si es insumo, null si no}
   )
   ```
3. **Crea la asignación** en `item_extra_asignaciones`:
   ```
   INSERT INTO item_extra_asignaciones (item_carta_id, extra_id)
   ```

Si el extra ya existía (creado desde otro item), simplemente crea la asignación. **Un extra, muchos productos.**

### 2.3 Toggle desactiva → Elimina asignación

Al desactivar un toggle:
1. Elimina la fila en `item_extra_asignaciones` para este item + extra.
2. **NO elimina el extra en sí** (puede estar asignado a otros items).

### 2.4 Configuración de precio → En EXTRAS/MODIFICADORES

Los extras sin precio (`precio_base = 0`) aparecen en la categoría EXTRAS/MODIFICADORES de Análisis marcados con ⚠ "Sin precio".

El admin hace click → panel expandido → tab "Editar" → pone el precio de venta. Mismo flujo que editar cualquier item de carta. El nombre también se puede editar acá (por defecto es "Extra {componente}" pero el admin puede cambiarlo).

### 2.5 Cómo se ve en el panel del item

```
┌──────────────────────────────────────────────────────────────────┐
│  ✨ Extras Disponibles                                          │
│  Componentes que se pueden ofrecer como extra con cargo.         │
│                                                                  │
│  Componente             │ Origen              │ Extra   │ Estado │
│  ───────────────────────┼─────────────────────┼─────────┼─────── │
│  Porcion Bacon          │ Hamburguesa Bacon   │   ☑     │ $800   │
│  Carne con queso        │ Hamburguesa Bacon   │   ☑     │ ⚠ $0  │
│  Salsa Hoppiness        │ Hamburguesa Bacon   │   ☐     │        │
│  Queso cheddar          │ Hamburguesa Bacon   │   ☐     │        │
│  Porción papas fritas   │ Composición         │   ☑     │ $1.200 │
│                                                                  │
│  Los extras se gestionan y les ponés precio en la categoría      │
│  EXTRAS/MODIFICADORES del Análisis.                              │
└──────────────────────────────────────────────────────────────────┘
```

Estado muestra: el precio actual si tiene, "⚠ $0" si no tiene, vacío si no está activado.

### 2.6 Panel expandido de un extra (en EXTRAS/MODIFICADORES)

Cuando el item expandido es `tipo='extra'`, la primera tab cambia de "Composición" a **"Asignados"**:

```
┌──────────────────────────────────────────────────────────────────┐
│  Extra Porcion Bacon                                             │
│  [Asignados] [Editar] [Historial]                               │
│                                                                  │
│  PRODUCTOS QUE OFRECEN ESTE EXTRA                                │
│                                                                  │
│  ☑  Bacon con papas fritas                                      │
│  ☑  American con papas                                          │
│  ☐  Combo Ultracheese                                           │
│  ☐  Combo Ultrabacon                                            │
│                                                                  │
│  Solo se muestran items que tienen este componente               │
│  en su composición (deep ingredients).                           │
│                                                                  │
│  Activar/desactivar desde acá crea/elimina la asignación.       │
└──────────────────────────────────────────────────────────────────┘
```

Gestión bidireccional: desde el item ("qué extras ofrece") y desde el extra ("en qué items está").

---

## PARTE 3: CÓMO FUNCIONAN LOS REMOVIBLES

### 3.1 Auto-descubrimiento (ya funciona, ajustar qué se muestra)

Los removibles se descubren de `useItemIngredientesDeepList`. **Cambio:** eliminar las preparaciones de nivel composición de la lista de removibles. Solo mostrar:

- **Deep ingredients** (insumos dentro de las recetas) ✅ se muestran
- **Sub-preparaciones** descubiertas dentro de recetas ✅ se muestran
- **Preparaciones directas de la composición** ❌ NO se muestran (nadie pide "Sin Hamburguesa Bacon")

Técnicamente: eliminar el bloque `allRemoviblePreps.map(prep => ...)` de la sección Removibles en `ItemExpandedPanel.tsx` (líneas 432-448). Mantener `uniqueIngredients` (líneas 449-465) y agregar `deepSubPreps` con sus toggles.

### 3.2 Nombre de carta editable

La tabla `item_removibles` ya tiene el campo `nombre_display`. Al activar un removible, se auto-genera `"Sin {nombre del insumo}"`. El admin puede editarlo inline.

**Ejemplo:**
```
Componente (interno)             │ Nombre carta          │ Disponible SIN
─────────────────────────────────┼───────────────────────┼──────────────
Queso Cheddar Fetas Americano    │ [ Sin queso       ]   │     ☑
Condimento Hamburguesas          │ [ Sin sal         ]   │     ☑
Salsa Hoppiness                  │ [ Sin salsa       ]   │     ☑
Porcion Bacon                    │ [ Sin bacon       ]   │     ☑
Bolita smash 90g                 │                       │     ☐
Pan brioche                      │                       │     ☐
```

El campo de nombre carta solo aparece cuando el toggle está activo.

### 3.3 Cómo se ve en el panel

```
┌──────────────────────────────────────────────────────────────────┐
│  🚫 Removibles                                                   │
│  Ingredientes que el cliente puede pedir SIN (sin descuento).    │
│                                                                  │
│  Componente             │ Origen              │ Nombre carta  │ SIN │
│  ───────────────────────┼─────────────────────┼───────────────┼──── │
│  Porcion Bacon          │ Hamburguesa Bacon   │ [Sin bacon  ] │  ☑  │
│  Bolita smash 90g       │ Hamburguesa Bacon   │               │  ☐  │
│  Salsa Hoppiness        │ Hamburguesa Bacon   │ [Sin salsa  ] │  ☑  │
│  Queso Cheddar Fetas    │ Hamburguesa Bacon   │ [Sin queso  ] │  ☑  │
│  Manteca Primer Premio  │ Hamburguesa Bacon   │               │  ☐  │
│  Condimento Hamburgue...│ Hamburguesa Bacon   │ [Sin sal    ] │  ☑  │
│  Papas Congeladas McC...│ Porción papas       │               │  ☐  │
│  Condimento Papas       │ Porción papas       │               │  ☐  │
│                                                                  │
│  NO aparecen: "Hamburguesa Bacon" ni "Porción papas fritas"     │
│  (son recetas madre de la composición, no tiene sentido)         │
└──────────────────────────────────────────────────────────────────┘
```

### 3.4 Guardado del nombre

Al editar el nombre carta y salir del campo (blur), se guarda en `item_removibles.nombre_display`. La mutation `toggleInsumo`/`togglePreparacion` en `useItemRemoviblesMutations` debe pasar `nombre_display` al crear el registro:

```typescript
// Al activar
upsert({
  item_carta_id,
  insumo_id,
  preparacion_id: null,
  activo: true,
  nombre_display: `Sin ${nombreDelInsumo}`,  // auto-generado
});
```

Agregar mutation para actualizar solo el nombre:
```typescript
const updateNombre = useMutation({
  mutationFn: async ({ id, nombre_display }) => {
    await supabase.from('item_removibles').update({ nombre_display }).eq('id', id);
  },
  onSuccess: (_, vars) => {
    qc.invalidateQueries({ queryKey: ['item-removibles'] });
  },
});
```

---

## PARTE 4: ANÁLISIS DE CMV

### 4.1 Los extras aparecen como categoría en Análisis

Los items tipo='extra' se agrupan bajo la categoría EXTRAS/MODIFICADORES (que tiene `visible_en_carta = false`). Aparecen en la tabla de Análisis como cualquier otra categoría:

```
CLASICAS              2    CMV 31.6%  Obj 35.0%  Margen $6.498
BEBIDAS               1    CMV 38.6%  Obj 35.0%  Margen $1.270
ULTRASMASH            2    CMV 39.1%  Obj 39.0%  Margen $8.232
ACOMPAÑAMIENTOS       1    CMV 124.7% Obj 100%   Margen -$143

EXTRAS/MODIFICADORES  4    [Oculta en Carta]    CMV 65.2%  Obj 30.0%  Margen $340
├── Extra Carne con queso    $1.800   $2.500   87.1%
├── Extra Porcion Bacon      $380     $800     57.5%
├── Extra Cebolla Crispy     $300     $0       ⚠ Sin precio
└── Extra Provoleta grillada $500     $1.200   50.4%

CMV GLOBAL: incluye extras en el cálculo
```

### 4.2 Los extras participan del Simulador

Aparecen en la tabla del Simulador como cualquier item. Se puede simular "subir todos los extras un 30%" o ajustar individualmente.

### 4.3 Los extras participan de Actualizar Precios

Los cambios de precio de extras se confirman en el mismo flujo y quedan en `item_carta_precios_historial`.

---

## PARTE 5: LIMPIEZA DE CÓDIGO

### 5.1 Archivos a ELIMINAR (ya no se usan)

| Archivo | Motivo |
|---------|--------|
| `src/hooks/useExtraAsignaciones.ts` | Ya es un stub vacío. Reescribir con la nueva lógica. |
| `src/hooks/useItemExtras.ts` | Consulta `item_carta_extras` (tabla vieja). Reemplazar. |
| `src/components/menu/ModificadoresTab.tsx` | Sistema viejo de modificadores. 644 líneas que no se usan. |
| `src/hooks/useModificadores.ts` | Hook del sistema viejo. |

### 5.2 Archivos a MODIFICAR

#### `src/components/centro-costos/ItemExpandedPanel.tsx`

**Sección Composición Fija (líneas ~290-330):**
- Eliminar columna "Extra" con toggle `es_extra` (línea 304, 319-321)
- Eliminar filtros `row.es_extra`, `row.cantidad <= 0 && !row.es_extra` (líneas 308-309)
- Eliminar estado `_precioExtra` de las rows (líneas 138, 144, 154, 163, 164)
- Composición Fija muestra solo componentes base. Sin toggles de extra. Sin filas con cantidad=0.

**Sección Extras Disponibles (líneas ~333-413):**
- REESCRIBIR COMPLETAMENTE
- Eliminar: `addExtraRow`, `showAddExtra`, `availablePreps`, `availableInsumos`, filtro por `precio_extra > 0`
- Nuevo contenido: usar `useItemIngredientesDeepList` para auto-descubrir componentes
- Mostrar deep ingredients + sub-preparaciones + recetas de composición con toggles
- Toggle llama a nueva mutation `toggleExtra` (auto-crea items_carta tipo='extra' + asignación)
- Cruzar con `item_extra_asignaciones` para saber cuáles están activos
- Mostrar precio actual del extra si tiene, "⚠ $0" si no

**Sección Removibles (líneas ~416-467):**
- Eliminar bloque `allRemoviblePreps.map(...)` (líneas 432-448): las preparaciones de composición NO deben mostrarse como removibles
- Eliminar variables: `compositionPreps`, `allRemoviblePreps` (líneas 205-226)
- Mantener: `uniqueIngredients` (deep ingredients) y `deepSubPreps` (sub-preparaciones)
- Agregar columna "Nombre carta" editable (input text) que se muestra solo cuando toggle activo
- Al activar toggle: auto-generar `nombre_display = "Sin {nombre}"`, guardar
- Al editar nombre carta: actualizar `nombre_display` on blur

**Para items tipo='extra' (nuevo):**
- Si `item.tipo === 'extra'`, la primera tab debe ser "Asignados" en vez de "Composición"
- Tab "Asignados" muestra checkboxes de todos los items tipo='item' donde este componente aparece en deep ingredients
- Toggle activa/desactiva asignación en `item_extra_asignaciones`

#### `src/hooks/useItemsCarta.ts`

**Query composición (líneas 35-37):**
- Eliminar `precio_extra` del select de preparaciones e insumos:
  ```
  ANTES: preparaciones(id, nombre, costo_calculado, tipo, precio_extra)
  DESPUÉS: preparaciones(id, nombre, costo_calculado, tipo)
  ```
  ```
  ANTES: insumos(id, nombre, costo_por_unidad_base, unidad_base, precio_extra)
  DESPUÉS: insumos(id, nombre, costo_por_unidad_base, unidad_base)
  ```

**Mutation saveComposicion (líneas 128-142):**
- Eliminar `es_extra` del payload:
  ```
  ANTES: items: { preparacion_id?; insumo_id?; cantidad; es_extra? }[]
  DESPUÉS: items: { preparacion_id?; insumo_id?; cantidad }[]
  ```
- Eliminar `es_extra: item.es_extra || false` del insert (línea 140)
- Eliminar aceptación de `cantidad: 0` (ya no se guardan filas con cantidad=0 en composición)

#### `src/hooks/useItemRemovibles.ts`

- Agregar mutation `updateNombreDisplay` para editar nombre de carta de un removible
- En `toggleInsumo`: pasar `nombre_display: "Sin {nombre}"` al crear
- En `togglePreparacion`: pasar `nombre_display: "Sin {nombre}"` al crear

#### `src/pages/admin/PreparacionesPage.tsx`

- Eliminar toggle "Puede ser extra" y toda la lógica asociada (líneas 156-167)
- Ese toggle ya no tiene sentido: los extras se descubren desde la composición del item

#### `src/pages/admin/CentroCostosPage.tsx`

**ComposicionModal (si existe duplicado ~línea 520-600):**
- Aplicar los mismos cambios que en ItemExpandedPanel: eliminar `es_extra` de rows, saveComposicion

**Análisis:**
- No necesita cambios especiales: los extras tipo='extra' ya aparecen agrupados bajo su categoría EXTRAS/MODIFICADORES automáticamente

### 5.3 Hook nuevo: `useExtraAutoDiscovery.ts`

```typescript
import { useMemo } from 'react';
import { useItemIngredientesDeepList } from './useItemIngredientesDeepList';
import { useItemCartaComposicion, useItemsCarta } from './useItemsCarta';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Para un item, descubre componentes que podrían ser extras
 * y cruza con extras existentes + asignaciones activas.
 */
export function useExtraAutoDiscovery(itemId: string | undefined) {
  const { data: deepGroups } = useItemIngredientesDeepList(itemId);
  const { data: composicion } = useItemCartaComposicion(itemId);
  const { data: allItems } = useItemsCarta();

  // Fetch asignaciones for this item
  const { data: asignaciones } = useQuery({
    queryKey: ['item-extra-asignaciones', itemId],
    queryFn: async () => {
      if (!itemId) return [];
      const { data, error } = await supabase
        .from('item_extra_asignaciones')
        .select('*, extra:extra_id(id, nombre, precio_base, costo_total, tipo)')
        .eq('item_carta_id', itemId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!itemId,
  });

  return useMemo(() => {
    const discovered: {
      tipo: 'preparacion' | 'insumo';
      ref_id: string;
      nombre: string;
      costo: number;
      origen: string;
    }[] = [];

    // Deep ingredients from recipes
    for (const group of (deepGroups || [])) {
      for (const ing of group.ingredientes) {
        discovered.push({
          tipo: 'insumo',
          ref_id: ing.insumo_id,
          nombre: ing.nombre,
          costo: ing.costo_por_unidad_base || 0,
          origen: group.receta_nombre,
        });
      }
      for (const sp of (group.sub_preparaciones || [])) {
        discovered.push({
          tipo: 'preparacion',
          ref_id: sp.preparacion_id,
          nombre: sp.nombre,
          costo: 0,
          origen: group.receta_nombre,
        });
      }
    }

    // Recipes directly in composition (as potential extras)
    for (const comp of (composicion || [])) {
      if (comp.preparacion_id && (comp as any).preparaciones) {
        discovered.push({
          tipo: 'preparacion',
          ref_id: comp.preparacion_id,
          nombre: (comp as any).preparaciones.nombre,
          costo: (comp as any).preparaciones.costo_calculado || 0,
          origen: 'Composición',
        });
      }
    }

    // Deduplicate by tipo:ref_id
    const unique = new Map<string, typeof discovered[0]>();
    for (const d of discovered) {
      const key = `${d.tipo}:${d.ref_id}`;
      if (!unique.has(key)) unique.set(key, d);
    }

    // Cross with existing extras
    const extras = (allItems || []).filter((e: any) => e.tipo === 'extra');
    const asigSet = new Set((asignaciones || []).map((a: any) => a.extra_id));

    return Array.from(unique.values()).map(d => {
      const existing = extras.find((e: any) =>
        (d.tipo === 'preparacion' && e.composicion_ref_preparacion_id === d.ref_id) ||
        (d.tipo === 'insumo' && e.composicion_ref_insumo_id === d.ref_id)
      );
      return {
        ...d,
        extra_id: existing?.id || null,
        extra_nombre: existing?.nombre || `Extra ${d.nombre}`,
        extra_precio: existing?.precio_base || 0,
        activo: existing ? asigSet.has(existing.id) : false,
      };
    });
  }, [deepGroups, composicion, allItems, asignaciones]);
}
```

### 5.4 Mutation nuevo: `useToggleExtra.ts`

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ID of EXTRAS/MODIFICADORES category - fetch dynamically or pass as param
async function getExtrasCategoryId(): Promise<string> {
  const { data } = await supabase
    .from('menu_categorias')
    .select('id')
    .ilike('nombre', '%extras%')
    .single();
  return data?.id || '';
}

async function findExistingExtra(
  tipo: 'preparacion' | 'insumo',
  refId: string
): Promise<string | null> {
  const field = tipo === 'preparacion'
    ? 'composicion_ref_preparacion_id'
    : 'composicion_ref_insumo_id';
  const { data } = await supabase
    .from('items_carta')
    .select('id')
    .eq('tipo', 'extra')
    .eq(field, refId)
    .maybeSingle();
  return data?.id || null;
}

export function useToggleExtra() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      item_carta_id,
      tipo,
      ref_id,
      nombre,
      costo,
      activo,
    }: {
      item_carta_id: string;
      tipo: 'preparacion' | 'insumo';
      ref_id: string;
      nombre: string;
      costo: number;
      activo: boolean;
    }) => {
      if (activo) {
        // 1. Find or create the extra
        let extraId = await findExistingExtra(tipo, ref_id);

        if (!extraId) {
          const catId = await getExtrasCategoryId();
          const { data, error } = await supabase
            .from('items_carta')
            .insert({
              nombre: `Extra ${nombre}`,
              tipo: 'extra',
              categoria_carta_id: catId || null,
              precio_base: 0,
              costo_total: costo,
              fc_objetivo: 30,
              composicion_ref_preparacion_id: tipo === 'preparacion' ? ref_id : null,
              composicion_ref_insumo_id: tipo === 'insumo' ? ref_id : null,
            } as any)
            .select()
            .single();
          if (error) throw error;
          extraId = data.id;
        }

        // 2. Create assignment
        const { error: asigError } = await supabase
          .from('item_extra_asignaciones')
          .upsert({
            item_carta_id,
            extra_id: extraId,
          } as any, { onConflict: 'item_carta_id,extra_id' });
        if (asigError) throw asigError;

      } else {
        // Deactivate: remove assignment only
        const extraId = await findExistingExtra(tipo, ref_id);
        if (extraId) {
          await supabase
            .from('item_extra_asignaciones')
            .delete()
            .eq('item_carta_id', item_carta_id)
            .eq('extra_id', extraId);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['item-extra-asignaciones'] });
      qc.invalidateQueries({ queryKey: ['items-carta'] });
      toast.success('Extra actualizado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });
}
```

---

## PARTE 6: RESUMEN COMPLETO DE CAMBIOS

### Base de datos
| Acción | Detalle |
|--------|---------|
| CREAR tabla | `item_extra_asignaciones` (item_carta_id, extra_id, unique) |
| AGREGAR campos | `items_carta.composicion_ref_preparacion_id` (uuid, FK preparaciones) |
| AGREGAR campos | `items_carta.composicion_ref_insumo_id` (uuid, FK insumos) |
| ELIMINAR campo | `item_carta_composicion.es_extra` |
| DEJAR DE USAR | `item_carta_extras` (tabla vieja, no eliminar) |
| DEJAR DE USAR | `preparaciones.precio_extra`, `preparaciones.puede_ser_extra` |
| DEJAR DE USAR | `insumos.precio_extra`, `insumos.puede_ser_extra` |

### Archivos nuevos
| Archivo | Contenido |
|---------|-----------|
| `src/hooks/useExtraAutoDiscovery.ts` | Auto-descubrimiento de extras potenciales desde composición |
| `src/hooks/useToggleExtra.ts` | Mutation para activar/desactivar extras (auto-crea + asigna) |

### Archivos a eliminar
| Archivo | Motivo |
|---------|--------|
| `src/components/menu/ModificadoresTab.tsx` | Sistema viejo, 644 líneas muertas |
| `src/hooks/useModificadores.ts` | Hook del sistema viejo |
| `src/hooks/useExtraAsignaciones.ts` | Stub vacío, reemplazado por useExtraAutoDiscovery |
| `src/hooks/useItemExtras.ts` | Consultaba item_carta_extras (tabla vieja) |

### Archivos a modificar
| Archivo | Cambios |
|---------|---------|
| `src/components/centro-costos/ItemExpandedPanel.tsx` | **Composición:** eliminar columna Extra, eliminar es_extra de rows, no aceptar cantidad=0. **Extras:** reescribir con auto-discovery + toggles que llaman useToggleExtra. **Removibles:** eliminar preparaciones de composición de la lista, agregar columna Nombre Carta editable, guardar nombre_display. **Para tipo='extra':** tab Asignados en vez de Composición. |
| `src/hooks/useItemsCarta.ts` | Eliminar `precio_extra` de selects. Eliminar `es_extra` de saveComposicion. No aceptar cantidad=0. |
| `src/hooks/useItemRemovibles.ts` | Agregar mutation `updateNombreDisplay`. Pasar `nombre_display` al crear removible. |
| `src/pages/admin/PreparacionesPage.tsx` | Eliminar toggle "Puede ser extra" (líneas 156-167). |
| `src/pages/admin/CentroCostosPage.tsx` | Eliminar `es_extra` de ComposicionModal interna (~línea 528-549). Eliminar referencias a precio_extra. |

### Lo que NO cambia
| Componente | Estado |
|------------|--------|
| Composición Fija | Funciona bien, solo quitar columna Extra |
| Grupos Opcionales | Sin cambios |
| Deep ingredient list hook | Sin cambios (ya funciona perfecto) |
| item_removibles tabla | Sin cambios (ya tiene nombre_display) |
| Categorías con visible_en_carta | Sin cambios |
| CMV Global, Simulador, Actualizar Precios | Sin cambios (extras aparecen automáticamente como items) |
| Historial de precios | Sin cambios (extras usan el mismo sistema de historial) |

---

## PARTE 7: FLUJOS DE EJEMPLO

### Flujo A: Crear un extra nuevo

1. **Control de Costos** → "Bacon con papas" → click → panel expandido
2. Sección **Extras Disponibles** muestra automáticamente todos los componentes
3. Activo toggle en "Porcion Bacon" ☑
4. Sistema auto-crea "Extra Porcion Bacon" en EXTRAS/MODIFICADORES (precio $0)
5. Toast: "✓ Extra creado — configurá el precio en EXTRAS/MODIFICADORES"
6. Voy a EXTRAS/MODIFICADORES → click "Extra Porcion Bacon" → Editar → precio $800
7. FC% se calcula automáticamente: $380 / ($800/1.21) = 57.5%

### Flujo B: Activar un extra existente en otro producto

1. **Control de Costos** → "American con papas" → click → panel expandido
2. Sección **Extras Disponibles** muestra los componentes de la American
3. Si "Queso cheddar" aparece y ya existe "Extra Queso cheddar" (creado desde la Bacon):
   - El toggle muestra que existe pero no está asignado a este item
   - Activo ☑ → solo crea asignación, NO crea nuevo extra
   - Precio ya configurado: $500

### Flujo C: Configurar removibles

1. **Control de Costos** → "Bacon con papas" → click → panel expandido
2. Sección **Removibles** muestra automáticamente los ingredientes (SIN preparaciones madre)
3. Activo "Queso Cheddar Fetas" ☑ → aparece campo nombre carta: `[Sin queso]`
4. Edito: `[Sin queso cheddar]` → blur → se guarda
5. Activo "Condimento Hamburguesas" ☑ → nombre auto: `[Sin Condimento Hamburguesas]`
6. Edito: `[Sin sal]` → blur → se guarda

### Flujo D: Ver en qué productos está un extra

1. **Control de Costos** → Análisis → EXTRAS/MODIFICADORES → "Extra Carne con queso"
2. Tab **Asignados** muestra:
   - ☑ Bacon con papas fritas
   - ☑ Combo Ultracheese
   - ☑ Combo Ultrabacon
   - ☑ American con papas
3. Puedo desactivarlo de un producto o activarlo en otro desde acá
