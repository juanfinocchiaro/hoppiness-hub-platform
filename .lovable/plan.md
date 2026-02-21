

## Plan: Acciones completas en detalle de pedido (Reimprimir, Anular, Notas de Credito)

Este plan mejora la fila expandida de cada pedido en el Historial de Ventas con 3 grandes mejoras:

### 1. Botones de reimpresion inteligentes

Actualmente los botones de reimprimir no consideran el contexto del pedido. Se van a mostrar **todos los tipos de ticket siempre**, pero deshabilitando los que no correspondan:

- **Ticket cliente**: Siempre habilitado (es un comprobante no fiscal generico)
- **Factura**: Habilitado SOLO si el pedido tiene una factura emitida (`facturas_emitidas.length > 0`). Deshabilitado con tooltip "Sin factura emitida" si no la tiene
- **Comanda**: Siempre habilitado
- **Vales**: Habilitado solo si el pedido tiene items con `tipo_impresion === 'vale'`. Deshabilitado con tooltip "Sin items de tipo vale" si no tiene
- **Delivery**: Habilitado solo si `tipo_servicio === 'delivery'`. Deshabilitado si no es delivery

Los botones deshabilitados se muestran visualmente "apagados" (opacity reducida, cursor not-allowed) para que el cajero entienda que existen pero no aplican.

### 2. Anulacion de pedidos

Se agrega un boton "Anular pedido" con confirmacion (AlertDialog). Al anular:

- Se cambia el `estado` del pedido a `'cancelado'` en la tabla `pedidos`
- Si el pedido **NO tiene factura**: solo se marca como cancelado
- Si el pedido **tiene factura**: se emite una **Nota de Credito** automaticamente antes de cancelar. La nota de credito es un comprobante ARCA tipo 3 (NC A), 8 (NC B) o 13 (NC C) que referencia la factura original

Para las Notas de Credito se necesita:
- Una nueva edge function `emitir-nota-credito` que recibe el `factura_id` original, emite el comprobante de anulacion ante ARCA y lo guarda en `facturas_emitidas` con tipo `NC_A`, `NC_B` o `NC_C`
- Campo `factura_asociada_id` en `facturas_emitidas` para vincular la NC con la factura original
- Campo `anulada` (boolean) en `facturas_emitidas` para marcar facturas que fueron anuladas por una NC

### 3. Cambio de datos de facturacion

Se agrega un boton "Cambiar facturacion" (visible solo si el pedido tiene factura). Al usarlo:

1. Se abre un modal donde se cargan los nuevos datos (tipo factura, CUIT, razon social, condicion IVA)
2. Al confirmar, el sistema:
   - Emite una Nota de Credito por la factura original (misma logica que anulacion)
   - Emite una nueva factura con los datos corregidos
   - Ambos movimientos quedan vinculados en la base de datos

---

### Detalle tecnico

**Migracion de base de datos:**
- Agregar columnas a `facturas_emitidas`:
  - `factura_asociada_id UUID REFERENCES facturas_emitidas(id)` (para vincular NC con factura original)
  - `anulada BOOLEAN DEFAULT false` (marca si fue anulada por una NC)

**Nueva edge function `emitir-nota-credito`:**
- Recibe `factura_id` (la factura a anular) y opcionalmente `branch_id`
- Lee la factura original de `facturas_emitidas`
- Determina el tipo de NC segun el tipo original (A->3, B->8, C->13)
- Usa el mismo flujo WSAA/WSFE que `emitir-factura` pero con CbteTipo de NC y referenciando el comprobante original via `CbtesAsoc`
- Guarda la NC en `facturas_emitidas` con `factura_asociada_id` apuntando a la original
- Marca la factura original como `anulada = true`

**Archivos a modificar:**
- `src/components/pos/OrderHistoryTable.tsx` - Redisenar seccion de acciones con botones inteligentes, boton anular, boton cambiar facturacion
- `src/pages/local/SalesHistoryPage.tsx` - Agregar handlers para anulacion y re-facturacion, pasar categorias como prop para determinar vales
- `src/hooks/useAfipConfig.ts` - Agregar mutation `emitirNotaCredito`
- `src/hooks/pos/usePosOrderHistory.ts` - Agregar `receptor_cuit`, `receptor_razon_social`, `receptor_condicion_iva` al select de `facturas_emitidas`

**Archivos a crear:**
- `supabase/functions/emitir-nota-credito/index.ts` - Edge function para notas de credito
- `src/components/pos/CancelOrderDialog.tsx` - Dialog de confirmacion de anulacion
- `src/components/pos/ChangeInvoiceModal.tsx` - Modal para cambiar datos de facturacion

**Flujo visual del detalle expandido:**

```text
+------------------------------------------+
| Items                | Pagos             |
| Pepsi x1    $2.500   | QR      $2.500    |
|                      |                   |
| Total       $2.500   | Factura C 00001-12|
|                      | CAE: 12345678     |
+------------------------------------------+
| Reimprimir                               |
| [Ticket] [Factura] [Comanda] [Vales]     |
|  (cada uno habilitado/deshabilitado       |
|   segun contexto)                        |
+------------------------------------------+
| Acciones                                 |
| [Cambiar facturacion]  [Anular pedido]   |
+------------------------------------------+
```

