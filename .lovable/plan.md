

## Renombrar y clarificar: Servicios, Facturas y Caja Chica

### Cambios

Son solo cambios de textos y labels, sin logica nueva ni cambios de base de datos.

**1. Mi Marca -- Sidebar y pagina de Conceptos de Servicio**

- `BrandSidebar.tsx`: Cambiar label "Conceptos de Servicio" a **"Servicios Recurrentes"**
- `ConceptosServicioPage.tsx`: 
  - Titulo: **"Servicios Recurrentes"**
  - Subtitulo: **"Catalogo de servicios que pagan los locales: alquiler, honorarios, servicios publicos, etc. Se usan al cargar facturas."**

**2. Mi Local -- Sidebar**

- `LocalSidebar.tsx`:
  - "Compras y Servicios" pasa a **"Facturas"**
  - "Gastos Menores" pasa a **"Caja Chica"**

**3. Mi Local -- Paginas**

- `ComprasPage.tsx`:
  - Titulo: **"Facturas"**
  - Subtitulo: **"Facturas de proveedores: insumos y servicios"**
- `GastosPage.tsx`:
  - Titulo: **"Caja Chica"**
  - Subtitulo: **"Desembolsos pequenos sin factura: propinas, viaticos, imprevistos"**
  - Empty state: "Sin gastos de caja chica" en vez de "Sin gastos menores"

### Archivos a modificar

1. `src/components/layout/BrandSidebar.tsx` -- 1 label
2. `src/pages/admin/ConceptosServicioPage.tsx` -- titulo y subtitulo
3. `src/components/layout/LocalSidebar.tsx` -- 2 labels
4. `src/pages/local/ComprasPage.tsx` -- titulo
5. `src/pages/local/GastosPage.tsx` -- titulo, subtitulo, empty state

