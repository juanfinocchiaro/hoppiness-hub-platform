

## Checklist de Monitoreo Ultra Smash

### Objetivo

Agregar un nuevo tipo de visita/checklist llamado **"Ultra Smash"** al sistema de supervisiones, con los 11 puntos de control que definió Ismael para monitorear y entrenar a los cocineros en la técnica correcta de preparación de la hamburguesa Ultrasmash.

### Los 11 items del checklist

1. Pan enmantecado, condimentación y cheddar en corona antes de tirar la carne
2. Temperatura correcta de plancha
3. Bolitas colocadas sin mover
4. Smash inmediato, firme y centrado
5. Smash logra expansión pareja
6. Salado controlado (cantidad correcta)
7. Bordes crocantes visibles
8. Cheddar agregado en tiempo correcto
9. Retiro con espátula afilada
10. Apilado correcto de medallones
11. Producto final respeta estándar Ultra Smash

### Cambios necesarios

**1. Base de datos (migración SQL)**

- Ampliar el tipo `inspection_type` para aceptar `'ultrasmash'` (actualmente solo `boh` y `foh`)
- Insertar los 11 templates en `inspection_templates` con `inspection_type = 'ultrasmash'` y categoría `'ultrasmash'` (todos bajo una sola categoría ya que es un checklist técnico enfocado)

**2. Tipos TypeScript** (`src/types/inspection.ts`)

- Agregar `'ultrasmash'` al type `InspectionType`
- Agregar la etiqueta de categoría `ultrasmash: 'Monitoreo Ultra Smash'` a `CATEGORY_LABELS`
- Agregar las etiquetas de tipo: `ultrasmash: 'Monitoreo Ultra Smash'` y `ultrasmash: 'Ultra'` a `TYPE_LABELS` y `TYPE_SHORT_LABELS`

**3. Página de Nueva Inspección** (`src/pages/admin/NewInspectionPage.tsx`)

- Agregar una tercera opción de tipo de visita: **"Ultra Smash - Monitoreo de Técnica"** con la descripción "Checklist de preparación Ultrasmash para cocineros (11 items)"

**4. Sin cambios en los demás componentes**

Los componentes `InspectionChecklist`, `InspectionItemRow`, `InspectionSummary`, etc. ya funcionan genéricamente con cualquier tipo de inspección. Al agregar los templates en la base de datos, el checklist se genera automáticamente al iniciar una visita de tipo `ultrasmash`.

### Nota sobre permisos

Ismael menciona que estas planillas deberían ser accesibles solo para Dueño de Marca / Coordinador / Encargado Líder. El sistema de supervisiones actual ya está restringido a roles de marca (superadmin, coordinador). No se requieren cambios de permisos adicionales para esta funcionalidad.

### Detalle Tecnico

```text
inspection_templates (nuevos registros):
+------+------------+------------+-----------+--------------------------------------------------+
| sort | type       | category   | item_key  | item_label                                       |
+------+------------+------------+-----------+--------------------------------------------------+
|    1 | ultrasmash | ultrasmash | us_pan    | Pan enmantecado, condimentación y cheddar...     |
|    2 | ultrasmash | ultrasmash | us_temp   | Temperatura correcta de plancha                  |
|    3 | ultrasmash | ultrasmash | us_bolit  | Bolitas colocadas sin mover                      |
|  ... | ...        | ...        | ...       | ...                                              |
|   11 | ultrasmash | ultrasmash | us_final  | Producto final respeta estándar Ultra Smash      |
+------+------------+------------+-----------+--------------------------------------------------+
```
