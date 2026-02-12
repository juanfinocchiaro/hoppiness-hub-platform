

## Permitir remover recetas completas en Modificadores

### Problema actual
El selector de "Removibles" solo muestra ingredientes individuales (insumos) extraidos de las recetas. No permite seleccionar una receta completa de la composicion del item (ej: "Sin Lechuga en Hebras" donde esa lechuga es una receta/preparacion).

### Lo bueno
La tabla `item_modificadores` ya tiene la columna `receta_id` para soportar esto. Solo falta el cambio en el frontend.

### Cambios en `ModificadoresTab.tsx`

**Modificar `NewRemovibleForm`:**

1. Agregar las recetas de la composicion del item como opciones seleccionables en el selector, en un grupo separado arriba de los ingredientes (ej: "-- Recetas del item --").
2. Trackear si el usuario selecciono un insumo o una receta (`selectedType: 'insumo' | 'receta'`).
3. Al guardar:
   - Si es receta: enviar `receta_id` en vez de `ingrediente_id`, usando `costo_calculado` de la receta como `costo_ahorro`.
   - Si es insumo: mantener el comportamiento actual con `ingrediente_id`.

### Detalle tecnico

Se necesita acceder a la composicion del item para obtener las recetas. El componente ya recibe `deepGroups` que contiene `receta_id` y `receta_nombre`. Tambien se pasa `composicion` desde el padre para obtener el `costo_calculado` de cada receta.

Cambios puntuales:
- En el `Select`, agregar un `SelectGroup` con header "-- Recetas --" que liste las preparaciones de la composicion.
- Al seleccionar una receta, auto-completar nombre como "Sin [nombre receta]" y calcular el ahorro usando `costo_calculado`.
- Al guardar, pasar `receta_id` en lugar de `ingrediente_id` cuando corresponda.

No se requieren cambios en la base de datos ni migraciones.

