

## Grupos de Opcionales para Items de Carta

### Problema
Actualmente, para representar una bebida variable en un combo, hay que marcar un componente como "opcional" y poner un costo promedio manual. Esto es confuso porque:
- No queda claro qué opciones existen
- El costo promedio hay que calcularlo a mano
- No se ve en el modal de Modificadores
- No escala si tenés muchos combos

### Solucion: Grupos de Opcionales

Un "Grupo de Opcionales" es un componente del item que tiene varias alternativas posibles. Por ejemplo:

```text
Combo Ultracheese con papas y bebida
  ├── Hamburguesa Ultracheese (receta fija)
  ├── Papas fritas (receta fija)
  └── [Grupo: Bebida] ← NUEVO
       ├── Coca-Cola 500ml ($350)
       ├── Sprite 500ml ($340)
       ├── Fanta 500ml ($330)
       └── Costo promedio: $340 (calculado automaticamente)
```

El FC% del combo usa el costo promedio del grupo para el calculo.

### Cambios en Base de Datos

**Nueva tabla `item_carta_grupo_opcional`:**
- id, item_carta_id, nombre (ej: "Bebida"), orden
- costo_promedio (calculado automaticamente)

**Nueva tabla `item_carta_grupo_opcional_items`:**
- id, grupo_id, insumo_id o preparacion_id, cantidad
- costo_unitario (se toma del insumo/receta)

**Actualizar funcion `recalcular_costo_item_carta`:**
- Sumar: costo composicion fija + sum de costo_promedio de cada grupo opcional

Se eliminan las columnas `es_opcional` y `costo_promedio_override` de `item_carta_composicion` porque el concepto de opcional ahora vive en su propia tabla.

### Cambios en UI

**ComposicionModal (CentroCostosPage.tsx):**
- Eliminar el toggle "Opcional" y campo "Costo prom" de cada fila
- Agregar seccion nueva debajo de la composicion fija: "Grupos Opcionales"
- Boton "Agregar Grupo Opcional" que crea un grupo con nombre
- Dentro de cada grupo: agregar items (insumos/recetas) con cantidad
- Mostrar el costo promedio calculado automaticamente
- El costo total = composicion fija + sum de promedios

**ModificadoresTab.tsx:**
- Nueva seccion "Opcionales" (entre Extras y Sustituciones) que muestra los grupos configurados como referencia (solo lectura, informativo)
- Cada grupo muestra sus items y el costo promedio

### Cambios tecnicos detallados

**Archivos a crear:**
- `src/hooks/useGruposOpcionales.ts` - CRUD para grupos y sus items, calculo de promedio

**Archivos a modificar:**
- `supabase/migrations/` - Nueva migracion con tablas + actualizacion de la funcion de recalculo
- `src/pages/admin/CentroCostosPage.tsx` - Reemplazar toggle opcional por seccion de grupos en ComposicionModal
- `src/components/menu/ModificadoresTab.tsx` - Agregar seccion informativa de grupos opcionales

**Migracion de datos:** Si ya hay filas con `es_opcional = true`, se ignoran (el usuario las reconfigura con el nuevo sistema de grupos).

