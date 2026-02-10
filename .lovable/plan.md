

## Flujo Proveedores, Insumos e Ingredientes -- Fases 1 y 2

### Resumen

Implementar la separacion clara de responsabilidades entre Marca y Local segun el documento FLUJO_PROVEEDORES_INSUMOS.md. Se abordan las fases 1 y 2:

- **Fase 1**: Proveedores de Marca sin selector de "Ambito"
- **Fase 2**: Insumos e Ingredientes en tabs separadas

Las fases 3 (proveedores local con tabs Marca/Propios) y 4 (compras con items obligatorios vs opcionales) quedan para despues.

---

### Fase 1: Proveedores de Marca sin selector de Ambito

**Archivo: `ProveedorFormModal.tsx`**
- Agregar prop `context?: 'brand' | 'local'` (default: indefinido para retrocompatibilidad)
- Cuando `context = 'brand'`: ocultar el selector de "Ambito" y forzar `ambito = 'marca'`. Tambien ocultar el selector de sucursal. El titulo cambia a "Nuevo Proveedor de Marca"
- El formulario actual ya maneja el caso local via `defaultBranchId`, asi que no hace falta cambiar nada para el local

**Archivo: `ProveedoresPage.tsx` (Mi Marca)**
- Pasar `context="brand"` al modal
- Eliminar la columna "Ambito" de la tabla (todos son de marca)
- Actualizar subtitulo a "Proveedores asignados a items obligatorios de la marca"

---

### Fase 2: Insumos e Ingredientes en tabs separadas

**Archivo: `InsumosPage.tsx` (Mi Marca)**
- Renombrar titulo: "Insumos e Ingredientes"
- Subtitulo: "Catalogo obligatorio de la marca"
- Cambiar las tabs actuales (Insumos | Categorias) a 3 tabs: **Ingredientes** | **Insumos** | **Categorias**
- Tab Ingredientes: filtra `tipo_item = 'ingrediente'`, boton "+ Nuevo Ingrediente"
- Tab Insumos: filtra `tipo_item = 'insumo'`, boton "+ Nuevo Insumo"
- Tab Categorias: queda igual
- La tabla en cada tab no necesita columna "Tipo" (esta implicito por la tab)

**Archivo: `InsumoFormModal.tsx`**
- Agregar prop `fixedType?: 'ingrediente' | 'insumo'`
- Cuando viene `fixedType`: ocultar el dropdown de Tipo, usar el valor fijo
- Titulo dinamico: "Nuevo Ingrediente Obligatorio" / "Nuevo Insumo Obligatorio" (en brand), "Nuevo Ingrediente Local" / "Nuevo Insumo Local" (en local)
- Al guardar, usar `fixedType` como `tipo_item` en lugar del selector

**Archivo: `BrandSidebar.tsx`**
- Cambiar el label del item de menu de "Insumos" a "Insumos e Ingredientes"

---

### Detalle tecnico

- Sin cambios de base de datos (el campo `tipo_item` ya existe en la tabla `insumos`)
- Archivos a modificar:
  1. `src/components/finanzas/ProveedorFormModal.tsx` -- prop context, ocultar ambito en brand
  2. `src/pages/admin/ProveedoresPage.tsx` -- pasar context="brand", eliminar columna ambito
  3. `src/components/finanzas/InsumoFormModal.tsx` -- prop fixedType, titulo dinamico
  4. `src/pages/admin/InsumosPage.tsx` -- 3 tabs, filtro por tipo_item, boton contextual
  5. `src/components/layout/BrandSidebar.tsx` -- renombrar menu item

