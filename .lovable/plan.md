

## IVA por Item: Flujo Neto-First en Facturas

### Concepto

Actualmente el IVA se carga como un monto global en la cabecera de la factura. El nuevo flujo mueve el IVA a cada item individual: el usuario carga el **precio neto** y selecciona la **alicuota IVA**, y el sistema calcula el IVA y el bruto automaticamente. Los totales de la factura se calculan sumando todos los items.

### Cambios en Base de Datos

Agregar columnas a `items_factura`:

| Columna | Tipo | Descripcion |
|---------|------|-------------|
| `alicuota_iva` | NUMERIC(5,2) | 21, 10.5, 27, 0 o NULL (sin factura) |
| `iva_monto` | NUMERIC(12,2) | Calculado: neto x (alicuota/100) |
| `precio_unitario_bruto` | NUMERIC(12,2) | Calculado: neto + iva por unidad |

`precio_unitario` existente pasa a representar el **neto** (ya lo es conceptualmente). Se agregan las columnas calculadas.

No se eliminan las columnas `iva` y `otros_impuestos` de `facturas_proveedores` para no romper datos existentes, pero el formulario dejara de usarlas y los totales se calcularan desde los items.

### Cambios en UI

**1. Cada item de insumo (`CompraFormModal.tsx`)**

Reemplazar el layout actual de 5 columnas por:

```text
Insumo *          | Cant. *  | P.Neto * | IVA      | Subtotal
[Select insumo]   | [20]     | [$97989] | [21% v]  | $118,567
                    cajas                   calculado
```

- "P.Neto" = precio unitario neto (lo que ingresa el usuario)
- "IVA" = selector de alicuota (21%, 10.5%, 27%, Exento, Sin factura)
- "Subtotal" = (neto + iva_por_unidad) x cantidad

Debajo del item, mostrar desglose:
```text
Neto: $97,989 | IVA 21%: $20,578 | Bruto: $118,567
```

**2. Items de servicio**

Mismo patron: Monto = neto, selector IVA, subtotal calculado.

**3. Seccion Totales (reemplaza la actual)**

```text
Subtotal Neto:    $1,959,789
IVA 21%:            $411,556
IVA 10.5%:               $0
Total Factura:    $2,371,345
```

Se eliminan los inputs manuales de IVA y Otros Impuestos. Todo se calcula automaticamente desde los items.

**4. Tabla de items expandidos (`ComprasPage.tsx`)**

Agregar columna "IVA" en la tabla de detalle para mostrar la alicuota de cada item.

### Logica de Calculo

```typescript
const IVA_OPTIONS = [
  { value: 21, label: '21%' },
  { value: 10.5, label: '10.5%' },
  { value: 27, label: '27%' },
  { value: 0, label: 'Exento (0%)' },
  { value: null, label: 'Sin factura' },
];

// Por item:
iva_monto = precio_unitario * (alicuota_iva / 100)
subtotal = (precio_unitario + iva_monto) * cantidad
// o bien: subtotal_neto = precio_unitario * cantidad, subtotal_bruto = subtotal_neto + iva_total

// Totales factura:
subtotal_neto = sum(item.precio_unitario * item.cantidad)
iva_por_alicuota = agrupado por alicuota
total = subtotal_neto + sum(iva)
```

### Archivos a modificar

1. **Migracion SQL** -- Agregar `alicuota_iva`, `iva_monto`, `precio_unitario_bruto` a `items_factura`
2. **`src/components/finanzas/CompraFormModal.tsx`** -- Selector IVA por item, calculos automaticos, nueva seccion totales
3. **`src/types/compra.ts`** -- Agregar campos IVA a `ItemFacturaFormData`, constante `IVA_OPTIONS`
4. **`src/hooks/useCompras.ts`** -- Enviar campos IVA por item, dejar de enviar IVA global
5. **`src/pages/local/ComprasPage.tsx`** -- Columna IVA en tabla expandida de items
