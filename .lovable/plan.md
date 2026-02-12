

## Problema real

La Carta tiene 7 categorias. Con el filtro actual se ocultan TODAS las que tienen 0 items visibles, lo cual esconde categorias legitimas como PROMOCIONES EN EFECTIVO y VEGGIES (que simplemente aun no tienen items cargados). El objetivo original era solo ocultar EXTRAS/MODIFICADORES porque es una categoria interna.

**Estado actual de categorias:**
| Categoria | Items tipo=item | Items tipo=extra | Visible ahora |
|---|---|---|---|
| PROMOCIONES EN EFECTIVO | 0 | 0 | NO (error) |
| CLASICAS | 1 | 0 | SI |
| ULTRASMASH | 2 | 0 | SI |
| VEGGIES | 0 | 0 | NO (error) |
| BEBIDAS | 1 | 0 | SI |
| ACOMPAÑAMIENTOS | 1 | 0 | SI |
| EXTRAS/MODIFICADORES | 0 | 3 | NO (correcto) |

## 3 Soluciones posibles

### Opcion A: Campo `visible_en_carta` en la tabla `menu_categorias` (RECOMENDADA)

Agregar una columna booleana `visible_en_carta` (default `true`) a `menu_categorias`. La Carta filtra por ese campo. El admin puede togglear la visibilidad con un boton de ojo en cada categoria.

**Ventajas:**
- Control explicito por categoria, no depende de heuristicas
- Futuro-proof: si mañana crean otra categoria interna, solo la marcan como no visible
- La categoria EXTRAS/MODIFICADORES se marca `visible_en_carta = false` una sola vez y listo
- Las categorias vacias (PROMOCIONES, VEGGIES) siguen visibles para cargarles items

**Desventaja:**
- Requiere migración de base de datos (1 columna)

**Cambios:**
1. Migracion: agregar `visible_en_carta BOOLEAN DEFAULT true` a `menu_categorias`, y hacer `UPDATE menu_categorias SET visible_en_carta = false WHERE nombre = 'EXTRAS/MODIFICADORES'`
2. `MenuCartaPage.tsx`: filtrar categorias por `visible_en_carta === true` en vez de por cantidad de items. Revertir el filtro actual. Mostrar todas las categorias visibles, tengan o no items.
3. `SortableCategoryCard`: agregar un boton de ojo (EyeOff) junto a Editar/Eliminar para togglear visibilidad

---

### Opcion B: Filtrar solo por contenido exclusivo de extras (sin cambio de DB)

En vez de ocultar categorias vacias, ocultar solo las categorias donde TODOS sus items son de `tipo = 'extra'` (y tiene al menos 1 item). Las categorias sin ningun item se siguen mostrando.

**Logica:**
```text
categorias.filter(cat => {
  const allItems = todosLosItems.filter(i => i.categoria_carta_id === cat.id);
  const soloExtras = allItems.length > 0 && allItems.every(i => i.tipo === 'extra');
  return !soloExtras;
})
```

**Ventajas:**
- Sin cambio de base de datos
- Automatico: si una categoria solo tiene extras, se oculta sola

**Desventaja:**
- Heuristico: si algun dia mezclan un item normal en EXTRAS/MODIFICADORES, la categoria aparece
- Menos control explicito

**Cambios:**
1. `MenuCartaPage.tsx`: cambiar el filtro de categorias por la logica de arriba
2. Necesita acceso a los items sin filtrar (antes del filtro de `tipo !== 'extra'`) para determinar la composicion real de cada categoria

---

### Opcion C: Tipo de categoria (`tipo` en `menu_categorias`)

Agregar una columna `tipo` a `menu_categorias` con valores `'publica'` | `'interna'`. La Carta solo muestra las publicas.

**Ventajas:**
- Semanticamente claro
- Extensible si en el futuro hay mas tipos (ej: `'combo'`, `'temporal'`)

**Desventaja:**
- Mas rigido que un booleano
- Requiere migración
- Quizas over-engineering para el problema actual

**Cambios:**
1. Migracion: agregar `tipo TEXT DEFAULT 'publica'` a `menu_categorias`, y `UPDATE ... SET tipo = 'interna' WHERE nombre = 'EXTRAS/MODIFICADORES'`
2. `MenuCartaPage.tsx`: filtrar por `tipo === 'publica'`

---

## Recomendacion

**Opcion A** es la mas limpia. Un booleano `visible_en_carta` con un toggle visual es intuitivo, no depende de heuristicas, y da control total. Si mañana crean una categoria "INGREDIENTES INTERNOS" la marcan como oculta y listo.

