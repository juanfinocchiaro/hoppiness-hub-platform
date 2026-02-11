

## Permitir sub-preparaciones en fichas técnicas

### Problema actual
La ficha técnica de una preparación solo permite agregar **insumos** (Capa 1). No se pueden agregar **otras preparaciones** (Capa 2) como componentes. Ejemplo: la "Hamburguesa Wesley" necesita incluir "Cebolla Crispi" (que es una preparación hecha de harina, cebolla y sal), pero hoy no hay forma de hacerlo.

### Solucion
Agregar una columna opcional `sub_preparacion_id` a la tabla `preparacion_ingredientes`, de modo que cada linea de la ficha pueda ser un insumo O una sub-preparacion.

### Cambios

**1. Migración de base de datos**
- Agregar columna `sub_preparacion_id UUID` (nullable, FK a `preparaciones`) en `preparacion_ingredientes`
- Hacer `insumo_id` nullable (ya que ahora una linea puede ser insumo O preparacion, no ambos)
- Actualizar la funcion `recalcular_costo_preparacion` para sumar tambien el `costo_calculado` de sub-preparaciones

**2. Hook `usePreparaciones.ts`**
- Actualizar la query de `usePreparacionIngredientes` para hacer join tambien con `preparaciones` cuando hay `sub_preparacion_id`
- Actualizar `saveIngredientes` para guardar `sub_preparacion_id` cuando corresponda

**3. UI en `PreparacionesPage.tsx` - FichaTecnicaTab**
- Agregar un selector de tipo por linea: "Insumo" o "Preparacion"
- Si elige "Preparacion": mostrar dropdown con las preparaciones disponibles (excluyendo la actual para evitar referencia circular)
- Si elige "Insumo": comportamiento actual
- Mostrar el costo calculado de la sub-preparacion como costo unitario
- La unidad para sub-preparaciones sera "un" (unidad/porcion)

### Flujo del usuario (ejemplo)

1. Crear preparacion "Cebolla Crispi" (tipo elaborado)
2. Cargar su ficha: harina 50g, cebolla 100g, sal 5g
3. Crear preparacion "Hamburguesa Wesley" (tipo elaborado)
4. En su ficha, agregar:
   - Ingrediente: Pan brioche 1 un
   - Ingrediente: Carne smash 150g
   - **Preparacion: Cebolla Crispi 1 un** (toma el costo calculado automaticamente)
   - Ingrediente: Queso cheddar 30g

### Seccion tecnica

```text
preparacion_ingredientes
  - insumo_id (nullable) -----> insumos
  - sub_preparacion_id (nullable, NEW) -----> preparaciones
  - CHECK: exactamente uno de los dos debe ser NOT NULL
```

Funcion `recalcular_costo_preparacion` actualizada:
```sql
-- Lineas con insumo: cantidad * costo_por_unidad_base * factor_unidad
-- Lineas con sub_preparacion: cantidad * preparaciones.costo_calculado
```
