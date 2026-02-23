
# Fix: Opcionales de bebida, categorias ocultas y horarios del local

## 3 problemas identificados

### Problema 1: Ultracheese no muestra opciones de bebida
El combo Ultracheese tiene un grupo opcional "Bebida a eleccion" en la tabla `item_carta_grupo_opcional` con 9 opciones de bebida (agua, gaseosas, etc.) en `item_carta_grupo_opcional_items`. Pero el codigo actual de la webapp solo consulta `item_extra_asignaciones` (extras) e `item_removibles` (removibles). **Nunca consulta los grupos opcionales**, por eso no aparecen las bebidas.

### Problema 2: EXTRAS/MODIFICADORES visible en la webapp
La categoria "EXTRAS/MODIFICADORES" tiene `visible_en_carta = false` en `menu_categorias`. Pero `useWebappMenuItems` no filtra por ese campo, asi que los 10 items extra aparecen como una categoria visible en la tienda online.

### Problema 3: Horario del dia no se muestra al llegar al local
La card de info del local (BranchLanding) muestra "Abierto - Cierra XX:XX" pero no muestra el horario completo del dia de hoy. El horario semanal solo aparece cuando el local esta cerrado. El usuario quiere ver el horario de hoy siempre, con un "Ver mas" para expandir la semana.

---

## Cambios

### Archivo 1: `src/hooks/useWebappMenu.ts`

**A) Nuevo hook `useWebappItemOptionalGroups`**

Consulta `item_carta_grupo_opcional` para un item, y luego `item_carta_grupo_opcional_items` con joins a `insumos` y `preparaciones` para obtener nombres. Retorna la estructura:

```typescript
{
  id: string;
  nombre: string;           // "Bebida a eleccion"
  es_obligatorio: boolean;
  max_selecciones: number | null;
  opciones: {
    id: string;
    nombre: string;          // "Gaseosa Pepsi Original Lata 354ml"
    precio_extra: number;    // 0 para opciones incluidas
  }[];
}[]
```

- Usa `precio_extra` del insumo/preparacion (actualmente NULL para todas las bebidas = $0 = incluido)
- Si `precio_extra` es NULL, se muestra como $0 (sin recargo)

**B) Filtrar categorias ocultas en `useWebappMenuItems`**

Agregar filtro en la query de items: excluir items cuya categoria tenga `visible_en_carta = false`. Esto se logra consultando primero las categorias ocultas:

```typescript
// Obtener IDs de categorias ocultas
const { data: hiddenCats } = await supabase
  .from('menu_categorias')
  .select('id')
  .eq('visible_en_carta', false);

const hiddenCatIds = (hiddenCats || []).map(c => c.id);

// En la query principal, excluir items de esas categorias
if (hiddenCatIds.length > 0) {
  query = query.not('categoria_carta_id', 'in', `(${hiddenCatIds.join(',')})`);
}
```

### Archivo 2: `src/components/webapp/ProductCustomizeSheet.tsx`

**A) Importar y usar `useWebappItemOptionalGroups`**

Agregar la consulta de grupos opcionales y renderizar una seccion por grupo:

- Titulo: nombre del grupo (ej: "Bebida a eleccion")
- Subtitulo: "Obligatorio" o "Opcional" + "Elegi 1" / "Elegi hasta N"
- Si `max_selecciones === 1`: renderizar **radio buttons** (circulos)
- Si `max_selecciones > 1` o null: renderizar **checkboxes** (cuadrados)
- Mostrar precio solo si `precio_extra > 0`
- Bloquear "Agregar al carrito" si hay grupos obligatorios sin seleccion

**B) Estado para selecciones de grupos opcionales**

Nuevo state:
```typescript
const [groupSelections, setGroupSelections] = useState<Record<string, CartItemModifier[]>>({});
```

Logica de toggle que respeta `max_selecciones`:
- Si max=1: reemplaza la seleccion anterior
- Si max=N: agrega hasta N, luego ignora

Las selecciones de grupos se agregan como extras adicionales en `handleAdd`.

**C) Validacion de grupos obligatorios**

```typescript
const missingRequired = (optionalGroups || [])
  .filter(g => g.es_obligatorio && !(groupSelections[g.id]?.length > 0));
```

Si hay grupos obligatorios sin seleccion, el boton se deshabilita y muestra "Selecciona [nombre grupo]".

### Archivo 3: `src/components/webapp/BranchLanding.tsx`

**Reemplazar la seccion de status badge** para incluir horario de hoy:

- Extraer el dia actual de `public_hours` (array donde index 0=Lunes, 6=Domingo)
- Mostrar siempre: "Hoy: [apertura] - [cierre]" debajo del badge de estado
- Agregar boton "Ver horarios" que expande/colapsa la tabla semanal (usando `useState`)
- La tabla semanal (`WeeklySchedule`) se muestra siempre que este expandida, no solo cuando el local esta cerrado

Estructura visual:
```
[Badge: Abierto]
Hoy: 11:30 - 00:00
[Ver horarios ▼]  ← click expande la semana
```

### Archivo 4: `src/types/webapp.ts`

Agregar tipo para modificadores de grupo opcional en CartItem:

```typescript
export interface CartItemGroupSelection {
  grupoId: string;
  grupoNombre: string;
  opcionId: string;
  opcionNombre: string;
  precio: number;
}
```

---

## Resumen

| Archivo | Cambio |
|---|---|
| `src/hooks/useWebappMenu.ts` | Nuevo hook `useWebappItemOptionalGroups`; filtrar categorias con `visible_en_carta=false` |
| `src/components/webapp/ProductCustomizeSheet.tsx` | Renderizar grupos opcionales con radio/checkbox; validar obligatorios; integrar selecciones al carrito |
| `src/components/webapp/BranchLanding.tsx` | Mostrar horario de hoy siempre; "Ver horarios" expandible para la semana |
| `src/types/webapp.ts` | Tipo `CartItemGroupSelection` |
