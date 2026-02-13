
## Descubrimiento recursivo de ingredientes en sub-preparaciones

### Problema
La receta "Hamburguesa Baconator" tiene como ingrediente la sub-preparacion "Carne 90g con queso cheddar y bacon". El sistema detecta esa sub-preparacion pero **no entra dentro de ella** para descubrir sus insumos (como "Bacon ahumado"). Por eso el bacon no aparece en la lista de Extras Disponibles.

La estructura real es:

```text
Hamburguesa Baconator (item_carta)
  └── Hamburguesa Baconator (preparacion, via composicion)
        ├── Pan Golden Kalis (insumo) ← SI aparece
        ├── Salsa Hoppiness (insumo) ← SI aparece
        ├── Queso Cheddar (insumo) ← SI aparece
        └── Carne 90g con queso cheddar y bacon (sub-preparacion)
              ├── Carne 90g (insumo) ← NO aparece
              ├── Bacon ahumado (insumo) ← NO aparece
              └── Queso cheddar (insumo) ← NO aparece
```

### Solucion

**Archivo: `src/hooks/useItemIngredientesDeepList.ts`**

Agregar recursion: cuando se encuentra una sub-preparacion, buscar tambien SUS ingredientes. Implementar una funcion interna `fetchPrepIngredients(prepId, prepNombre)` que se llame recursivamente para cada sub-preparacion encontrada, con un limite de profundidad (3 niveles) para evitar loops infinitos.

Cambios concretos:

1. Extraer la logica de busqueda de ingredientes a una funcion recursiva `fetchRecursive(prepId, prepNombre, depth)`
2. Cuando se encuentra un `sub_preparacion_id`, ademas de agregarlo como sub-prep descubierta, llamar recursivamente para obtener sus insumos internos
3. Los insumos encontrados en niveles mas profundos se agregan como un grupo nuevo con el nombre de la sub-receta como `receta_nombre`
4. Limite de profundidad = 3 para evitar ciclos

Ejemplo del resultado esperado despues del fix:

```text
Extras Disponibles:
  Pan Golden Kalis          (origen: Hamburguesa Baconator)
  Salsa Hoppiness           (origen: Hamburguesa Baconator)
  Queso Cheddar             (origen: Hamburguesa Baconator)
  Carne 90g con queso...    (origen: Hamburguesa Baconator)  ← sub-prep como extra
  Carne 90g                 (origen: Carne 90g con queso...) ← NUEVO
  Bacon ahumado             (origen: Carne 90g con queso...) ← NUEVO
  Queso cheddar             (origen: Carne 90g con queso...) ← NUEVO (dedup si ya existe)
```

### Detalles tecnicos

La funcion recursiva reemplaza el bloque actual de lineas 54-100:

```typescript
async function fetchPrepIngredients(
  prepId: string, 
  prepNombre: string, 
  depth: number,
  groups: DeepIngredientGroup[]
) {
  if (depth > 3) return; // safety limit
  
  const { data: ingredientes } = await supabase
    .from('preparacion_ingredientes')
    .select(`*, insumos(...), sub_prep:preparaciones!...fkey(id, nombre)`)
    .eq('preparacion_id', prepId)
    .order('orden');

  const insumoItems = [];
  const subPrepItems = [];

  for (const ing of ingredientes || []) {
    if (ing.insumo_id) { /* push to insumoItems */ }
    if (ing.sub_preparacion_id) {
      /* push to subPrepItems */
      // RECURSE into sub-preparation
      await fetchPrepIngredients(
        ing.sub_preparacion_id, 
        sub_prep.nombre, 
        depth + 1, 
        groups
      );
    }
  }

  if (insumoItems.length > 0 || subPrepItems.length > 0) {
    groups.push({ receta_id: prepId, receta_nombre: prepNombre, ingredientes: insumoItems, sub_preparaciones: subPrepItems });
  }
}
```

### Impacto
- Todos los productos con sub-preparaciones mostraran los ingredientes profundos en "Extras Disponibles"
- La deduplicacion existente en `useExtraAutoDiscovery` (por `tipo:ref_id`) evita que aparezcan duplicados si un insumo esta en multiples niveles
- No se requieren cambios en la base de datos
