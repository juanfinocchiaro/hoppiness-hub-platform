

# POS: Modal obligatorio de configuración antes de ver productos

## Problema

El flujo actual muestra la configuración en el panel lateral derecho, pero los cajeros pueden ignorarla o cometer errores al cargar productos en el canal incorrecto. El toast "Iniciá la venta primero" no es solución suficiente.

## Solución

Reemplazar el paso de configuración inline por un **Dialog modal centrado** que aparece automáticamente al entrar al POS (y cada vez que se inicia una nueva venta). Hasta que el cajero no confirme canal + servicio, **no se renderiza ni la grilla de productos ni el carrito**.

### Flujo nuevo

1. Cajero entra al POS (o presiona "Nueva venta")
2. Se muestra un Dialog modal con el formulario de configuración (canal, servicio, llamador, datos cliente)
3. Cajero presiona "Comenzar venta"
4. Modal se cierra, se muestran productos + carrito con el resumen compacto arriba
5. Al cobrar y completar el pedido, se resetea todo y vuelve a aparecer el modal

### Cambios técnicos

**`src/pages/pos/POSPage.tsx`**:
- Eliminar el renderizado condicional de `OrderConfigPanel` en modo "full form" dentro del panel derecho
- Agregar un `Dialog` (de Radix) controlado por `!configConfirmed`
  - `open={!configConfirmed}` -- se abre solo, no se puede cerrar sin confirmar
  - Sin botón X (se omite `DialogClose`)
  - Contenido: el mismo `ConfigForm` que ya existe en `OrderConfigPanel`
  - Botón "Comenzar venta" cierra el modal y setea `configConfirmed = true`
- Cuando `configConfirmed = true`: se muestra la grilla + carrito con el resumen compacto editable (como ahora)
- Al completar pedido o cancelar: `setConfigConfirmed(false)` para que el modal reaparezca

**`src/components/pos/OrderConfigPanel.tsx`**:
- Exportar `ConfigForm` como componente independiente para reutilizarlo en el modal
- El componente `OrderConfigPanel` sigue existiendo para el modo compacto (resumen editable)

### Detalle del modal

```
+------------------------------------------+
|                                          |
|          Nueva venta                     |
|                                          |
|   Canal de venta                         |
|   [Mostrador]  [Apps Delivery]           |
|                                          |
|   Tipo de servicio                       |
|   [Para llevar] [Comer acá] [Delivery]   |
|                                          |
|   Número de llamador                     |
|   [1] [2] [3] ... [30]                   |
|                                          |
|   Nombre (opcional)                      |
|   [_________________________]            |
|                                          |
|   [ ====== Comenzar venta ====== ]       |
|                                          |
+------------------------------------------+
```

- El modal no tiene botón X ni se cierra clickeando fuera
- Es imposible interactuar con el POS sin configurar primero

### Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/components/pos/OrderConfigPanel.tsx` | Exportar `ConfigForm` como export nombrado |
| `src/pages/pos/POSPage.tsx` | Reemplazar panel inline por Dialog modal controlado |

