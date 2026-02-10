

## Simplificar Insumos: Marca solo carga Obligatorios, precio se actualiza desde compras

### Problema

1. El formulario desde Mi Marca muestra opciones innecesarias (Semi-libre, Libre, Precio maximo, RDO, Stock, etc.)
2. La marca solo necesita cargar insumos **obligatorios** con proveedor fijo
3. No tiene sentido que la marca cargue precios manualmente -- el precio real se actualiza cuando los locales registran compras
4. El modal es largo y requiere scroll

### Cambios

**1. Formulario de Mi Marca: compacto y enfocado** (`InsumoFormModal.tsx`)

- Agregar prop `context: 'brand' | 'local'` (default `'brand'`)
- Cuando `context = 'brand'`:
  - Titulo: "Nuevo Insumo Obligatorio"
  - Nivel de control se fija automaticamente en `'obligatorio'` (sin RadioGroup)
  - Se ocultan: seccion RDO, Trackea Stock, Precio maximo, seccion de Precios completa
  - Se muestra un campo opcional "Precio de referencia inicial" con hint: "Se actualizara automaticamente con las compras de los locales"
  - Proveedor Obligatorio se muestra directamente (no dentro de panel colapsable)
  - Layout compacto: campos en 2 columnas, sin secciones innecesarias, todo visible sin scroll
  - Campos: Nombre, Tipo, Unidad, Categoria interna, Proveedor Obligatorio, Precio ref. inicial (opcional), Motivo del control, Descripcion

- Cuando `context = 'local'`:
  - Titulo: "Nuevo Insumo Local"
  - Nivel fijo en `'libre'`
  - Campos minimos: Nombre, Tipo, Unidad, Descripcion
  - Sin seccion de control ni precios (el precio se carga cuando hacen la compra)

**2. Pagina Mi Marca** (`InsumosPage.tsx`)

- Pasar `context="brand"` al modal
- En la tabla, reemplazar columna "Precio Ref." por "Ultimo Precio" que muestre el precio de referencia actual (este campo se actualizaria en el futuro desde las compras, por ahora muestra `precio_referencia`)
- Eliminar columna "Nivel" (todos son obligatorios desde la marca)

**3. Pagina Mi Local** (`InsumosLocalPage.tsx`)

- Agregar boton "+ Nuevo Insumo" que abre el modal con `context="local"`
- Mostrar badge "Obligatorio" en los items que vienen de la marca (nivel_control = obligatorio)
- Los insumos locales (libre) se muestran con badge "Local"

### Resultado visual - Formulario Marca

```text
+----------------------------------------------+
| Nuevo Insumo Obligatorio                     |
|----------------------------------------------|
| Nombre *                                     |
| [________________________________]           |
|                                              |
| Tipo *              Unidad base *            |
| [Ingrediente v]     [Unidad (un) v]          |
|                                              |
| Categoría interna   Proveedor Obligatorio *  |
| [Sin categoría v]   [SITONAI MAYORISTA v]    |
|                                              |
| Precio ref. inicial ($)                      |
| [________]  (se actualiza con las compras)   |
|                                              |
| Motivo del control                           |
| [Insumo exclusivo de la marca]               |
|                                              |
| Descripción (opcional)                       |
| [________________________________]           |
|                                              |
|              [Cancelar]  [Crear Insumo]      |
+----------------------------------------------+
```

### Detalle tecnico

- Sin cambios de base de datos
- Archivos a modificar:
  - `src/components/finanzas/InsumoFormModal.tsx` -- agregar prop context, renderizado condicional
  - `src/pages/admin/InsumosPage.tsx` -- pasar context="brand", simplificar tabla
  - `src/pages/local/InsumosLocalPage.tsx` -- agregar boton nuevo insumo con context="local", badges

