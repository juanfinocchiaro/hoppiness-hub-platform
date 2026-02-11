
## Simplificacion de Catalogos + Detalle Fiscal en Compras

Este plan tiene dos partes bien diferenciadas, tal como describe el documento subido.

---

### PARTE 1: Simplificar formularios de catalogo

**Problema**: Los formularios de Ingredientes/Insumos y Productos piden "Precio neto" e "IVA habitual", pero en la practica el usuario carga el costo total del pack (con todo incluido). El IVA detallado corresponde a la carga de compras/facturas, no al catalogo.

**Cambios:**

**1. ProductoFormModal.tsx**
- Eliminar campo "IVA habitual" y su selector
- Renombrar "Precio neto ($)" a **"Costo del pack ($)"** con hint "(con todo incluido)"
- Eliminar la fila vacia con el selector de IVA
- El costo por unidad se calcula igual: precio_pack / contenido
- Destacar el costo unitario con un card visual mas prominente
- Mantener CMV y margen como estan
- En el payload, enviar `default_alicuota_iva: null` (ya no se define en catalogo)

**2. InsumoFormModal.tsx (contexto brand)**
- Eliminar campo "IVA habitual" y su selector (lineas 222-233)
- Renombrar "Precio neto ($)" a **"Costo ($)"** con hint "(con todo incluido)"
- Eliminar el bloque de desglose neto/IVA/final (lineas 236-255) y reemplazar con un simple "Costo por [unidad_base]: $X.XX"
- En el payload, enviar `default_alicuota_iva: null`

**3. Estado del form**: Eliminar `default_alicuota_iva` del estado local en ambos modales (ya no se muestra ni edita).

---

### PARTE 2: Detalle fiscal completo en Compras

**Problema**: Facturas de proveedores como Quilmes tienen multiples impuestos (internos, percepciones provinciales/municipales, IVA) y el formulario actual solo soporta un campo generico de IVA.

**Cambios en base de datos:**

**4. Migracion SQL** - Agregar columnas a `facturas_proveedores`:
- `subtotal_bruto` (DECIMAL 12,2)
- `total_descuentos` (DECIMAL 12,2, default 0)
- `subtotal_neto` (DECIMAL 12,2)
- `imp_internos` (DECIMAL 12,2, default 0) - campo unico para todos los impuestos internos
- `iva_21` (DECIMAL 12,2, default 0)
- `iva_105` (DECIMAL 12,2, default 0)
- `perc_iva` (DECIMAL 12,2, default 0)
- `perc_provincial` (DECIMAL 12,2, default 0)
- `perc_municipal` (DECIMAL 12,2, default 0)
- `total_factura` (DECIMAL 12,2)
- `costo_real` (DECIMAL 12,2) - calculado sin IVA recuperable

**5. Trigger** - `calcular_costo_real_factura()`: calcula automaticamente `costo_real = subtotal_neto + imp_internos + perc_provincial + perc_municipal` (excluye IVA y perc_iva porque son credito fiscal recuperable).

**6. Agregar columnas a `items_factura`:**
- `precio_bruto` (DECIMAL 12,2)
- `descuento_porcentaje` (DECIMAL 5,2, default 0)
- `descuento_monto` (DECIMAL 12,2, default 0)
- `precio_neto` (DECIMAL 12,2) - bruto menos descuento

**Cambios en codigo:**

**7. src/types/compra.ts** - Agregar:
- Interface `ImpuestosFactura` con todos los campos fiscales
- Interface `FacturaItemForm` con precio bruto y descuento
- Helpers: `calcularCostoReal()` y `calcularCreditoFiscal()`
- Actualizar `FacturaFormData` e `ItemFacturaFormData` con los campos nuevos

**8. src/components/finanzas/CompraFormModal.tsx** - Redisenar:
- Mantener cabecera existente (proveedor, tipo, numero, fecha)
- Items: agregar columnas "P. Bruto" y "Desc %" por item, calcular P. Neto automaticamente
- Nueva seccion "Impuestos (segun factura)": mostrar subtotales calculados (bruto, descuentos, neto) y campos editables para cada tipo de impuesto
- Marcar con "(CF)" los impuestos que son credito fiscal (IVA 21%, IVA 10.5%, Perc. IVA)
- Totales finales: "TOTAL FACTURA (a pagar)" y "COSTO REAL (para centro de costos)"

**9. src/hooks/useCompras.ts** - Actualizar la mutacion `create` para enviar los campos nuevos de impuestos al guardar.

---

### Seccion tecnica: Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/finanzas/ProductoFormModal.tsx` | Eliminar IVA, renombrar campo, mejorar visual costo |
| `src/components/finanzas/InsumoFormModal.tsx` | Eliminar IVA, renombrar campo, simplificar desglose |
| `src/components/finanzas/CompraFormModal.tsx` | Agregar seccion completa de impuestos |
| `src/types/compra.ts` | Agregar tipos e interfaces fiscales |
| `src/hooks/useCompras.ts` | Actualizar mutacion con campos nuevos |
| Nueva migracion SQL | Columnas de impuestos + trigger costo_real |
