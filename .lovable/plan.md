

## Problema

1. **En "Compras y Servicios" los items de canon muestran el UUID** (`00000000...`) en lugar del nombre del insumo ("Canon de Marca 4.5%", "Marketing 0.5%").
2. **El desglose del canon no muestra claramente los conceptos facturables** (4.5% Uso de Marca y 0.5% Marketing y Publicidad) ni cómo debe pagarse cada parte.
3. **La factura generada automáticamente necesita que el local entienda de un vistazo**: cuánto pagar en efectivo y cuánto en transferencia.

## Solución

### 1. Mostrar nombre del insumo en la tabla de Compras

En `ComprasPage.tsx`, la query actual trae `items_factura(*)` sin joinear el nombre del insumo. Se cambiará a:

```
items_factura(*, insumos(nombre))
```

Y en la celda que hoy muestra `item.insumo_id?.slice(0,8)...` se mostrará `item.insumos?.nombre ?? item.insumo_id`.

**Archivos**: `src/hooks/useCompras.ts` y `src/pages/local/ComprasPage.tsx`

### 2. Mejorar el detalle expandido de facturas de canon

Cuando se expande una factura de tipo Canon, en lugar de mostrar solo los 2 items genéricos, se mostrará un bloque claro con:

- Canon 4.5% por Uso de Marca: $X
- Canon 0.5% por Marketing y Publicidad: $Y
- Separador con instrucciones de pago:
  - **Pagar en efectivo**: 5% del efectivo del mes = $Z
  - **Pagar en transferencia**: 5% del online del mes = $W

Esta info ya existe en el campo `observaciones` de la factura (que contiene VT, Ef, Online). Se parseará para mostrar el desglose.

### 3. Renombrar conceptos en el modal de Ventas Mensuales

En `VentaMensualFormModal.tsx`, cambiar las etiquetas:
- "Canon 5% Efectivo" a "Canon 4.5% Uso de Marca + 0.5% Mkt (sobre efectivo)"
- "Canon 5% Online" a "Canon 4.5% Uso de Marca + 0.5% Mkt (sobre online)"

O mejor, desglosar en 4 lineas:
- Uso de Marca 4.5% sobre Efectivo
- Mkt 0.5% sobre Efectivo
- Uso de Marca 4.5% sobre Online (transferencia)
- Mkt 0.5% sobre Online (transferencia)
- **Pagar en efectivo**: suma de las dos primeras
- **Pagar en transferencia**: suma de las dos segundas

## Detalle Tecnico

### Archivo 1: `src/hooks/useCompras.ts`
- Cambiar la query select de `items_factura(*)` a `items_factura(*, insumos(nombre))`.

### Archivo 2: `src/pages/local/ComprasPage.tsx`
- Linea 125: reemplazar `item.insumo_id?.slice(0, 8)...` por `item.insumos?.nombre || item.insumo_id`.

### Archivo 3: `src/components/finanzas/VentaMensualFormModal.tsx`
- Reestructurar el bloque de resumen (lineas 147-160) para mostrar el desglose claro con 4.5%/0.5% y las instrucciones de pago en efectivo vs transferencia.

### Archivo 4: `src/pages/admin/VentasMensualesMarcaPage.tsx`
- Asegurar que el detalle expandido también use la nomenclatura "4.5% Uso de Marca" y "0.5% Marketing y Publicidad" de forma consistente (ya lo tiene parcialmente).

