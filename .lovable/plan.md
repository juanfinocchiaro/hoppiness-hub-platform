

## Modificadores Removibles con Drill-Down en Recetas + Componentes Opcionales

### Problema actual
Cuando abrís los modificadores de un item como "Combo Ultracheese con papas y bebida", el selector de removibles solo muestra insumos directos del item. No hace drill-down en las recetas que lo componen (Hamburguesa Ultracheese, Papas fritas), así que no podés ofrecer "Sin Cheddar" o "Sin Pepino" que vienen de la receta interna.

Además, la bebida no está cargada como componente porque es variable (puede ser cualquier gaseosa), y no hay forma de representar eso actualmente.

### Solución propuesta

**1. Drill-down automático de ingredientes desde las recetas**

Al abrir removibles, el sistema va a buscar recursivamente los ingredientes de cada receta que compone el item:

```text
Combo Ultracheese con papas y bebida
  └─ Hamburguesa Ultracheese (receta)
  │    ├─ Pan brioche (insumo) ← aparece como removible
  │    ├─ Cheddar (insumo) ← aparece como removible  
  │    ├─ Pepino (insumo) ← aparece como removible
  │    └─ ...
  └─ Papas fritas (receta)
  │    ├─ Papa (insumo) ← no tiene sentido remover
  │    └─ ...
  └─ Bebida promedio (componente opcional)
```

Los ingredientes se van a mostrar agrupados por receta de origen para que sea claro de dónde viene cada uno.

**2. Nuevo concepto: Componente Opcional en la composición**

Para la bebida, se agrega un campo `es_opcional` y `costo_promedio_override` a la tabla `item_carta_composicion`. Esto permite:
- Marcar un componente como opcional (no se suma al costo base, o se suma como promedio)
- Definir un costo promedio manual (ej: promedio de todas las gaseosas = $350)
- El FC% del item se calcula incluyendo el promedio del componente opcional

**3. Costeo con promedio**

Para el caso de la bebida, tenés dos opciones:
- Crear una receta/insumo genérico "Bebida promedio" con el costo promedio de las opciones disponibles
- O usar el campo `costo_promedio_override` directamente en la composición

El FC% del combo se calcularía: Costo Ultracheese + Costo Papas + Costo Promedio Bebida vs Precio de venta.

### Cambios técnicos

**Base de datos:**
- Agregar columnas `es_opcional BOOLEAN DEFAULT false` y `costo_promedio_override NUMERIC` a `item_carta_composicion`
- Actualizar la función `recalcular_costo_item_carta` para usar `costo_promedio_override` cuando `es_opcional = true`

**Hook `useItemCartaComposicion`:**
- Ya trae las preparaciones con su data. Se va a crear un nuevo hook `useItemIngredientesDeepList` que hace el drill-down: para cada preparación en la composición, trae sus `preparacion_ingredientes` con los insumos, y devuelve una lista plana agrupada por receta origen.

**`ModificadoresTab.tsx` - Sección Removibles:**
- Reemplazar el `ingredientesDelItem` actual por el resultado del drill-down
- Mostrar los ingredientes agrupados por receta de origen en el selector (ej: "— Hamburguesa Ultracheese —" como grupo, debajo sus ingredientes)
- Al seleccionar uno, el nombre se auto-genera como "Sin [ingrediente]" y se calcula el ahorro de costo

**`CentroCostosPage.tsx` - Composición:**
- Agregar un toggle "Opcional" y campo de costo promedio en el editor de composición
- Los componentes opcionales se muestran con un badge "Opcional" y su costo promedio

**Archivos a modificar:**
- `supabase/migrations/` — nueva migración para columnas en `item_carta_composicion`
- `src/components/menu/ModificadoresTab.tsx` — drill-down de ingredientes agrupados
- `src/hooks/useModificadores.ts` o nuevo hook — lógica de drill-down recursivo
- `src/pages/admin/CentroCostosPage.tsx` — UI de componente opcional en composición

