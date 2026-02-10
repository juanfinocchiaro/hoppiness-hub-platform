

## Nivel de control en el formulario de Marca

### Concepto

La marca crea solo items **Obligatorio** o **Semi-libre**. Los items **Libre** los crea directamente cada local desde su propio panel.

### Cambios

**1. Formulario de Marca (`InsumoFormModal.tsx`)**

- Agregar un selector simple de 2 opciones antes del bloque de proveedor:
  - **Obligatorio** -- Proveedor fijo definido por la marca (campo requerido)
  - **Semi-libre** -- Proveedor sugerido, el local puede elegir otro (campo opcional)
- Segun la opcion:
  - Obligatorio: campo "Proveedor Obligatorio" (requerido) + Precio Ref.
  - Semi-libre: campo "Proveedor Sugerido" (opcional) + Precio Ref.
- Titulo del modal: "Nuevo Ingrediente" / "Nuevo Insumo" (sin "Obligatorio" fijo).
- Payload: usar el `nivel_control` seleccionado en vez de forzar `'obligatorio'`.

**2. Tabla de Marca (`InsumosPage.tsx`)**

- En la columna "Proveedor", agregar un badge para distinguir:
  - Obligatorio: nombre del proveedor (sin badge extra, como ahora)
  - Semi-libre: nombre del proveedor + badge amarillo "Sugerido", o "Sin sugerido" si no hay proveedor

### Archivos a modificar

1. `src/components/finanzas/InsumoFormModal.tsx` -- Selector de nivel + campos condicionales + titulo + payload
2. `src/pages/admin/InsumosPage.tsx` -- Badge de nivel en columna Proveedor

No se requieren cambios de base de datos.
