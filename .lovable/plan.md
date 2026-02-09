

## Imputacion de Saldo a Favor en la Cuenta Corriente

### Situacion Actual

El sistema ya funciona correctamente como cuenta corriente a nivel de **libro mayor**: el saldo acumulado (columna "Saldo") muestra correctamente saldos negativos cuando se paga de mas. El excedente se arrastra automaticamente en el calculo del saldo corrido.

Sin embargo, hay una desconexion: cada factura maneja su propio `saldo_pendiente` de forma independiente. Si sobrepagaste la factura de Diciembre, ese excedente aparece en el saldo corrido pero **no se descuenta automaticamente** de la factura de Enero.

### Enfoque Propuesto

No se necesita un refactor grande. La solucion es agregar la posibilidad de registrar pagos **a nivel cuenta corriente** (no solo vinculados a una factura especifica):

1. **Nuevo boton "Registrar Pago" global** en la pagina de Cuenta Corriente, ademas de los botones "Pagar" por factura. Esto permite registrar pagos que no estan atados a una factura especifica (ej: un pago anticipado).

2. **Mostrar saldo global real** en la card de resumen. Si el total pagado supera el total facturado, mostrar "Saldo a Favor" en verde en vez de "Saldo Pendiente".

3. **En el modal de pago por factura**, mostrar el saldo a favor de la cuenta si existe, con un boton para aplicarlo (pre-cargar el monto del saldo a favor como primer linea de pago).

### Cambios Tecnicos

**Frontend:**

- `CuentaCorrienteProveedorPage.tsx`:
  - Agregar boton "Registrar Pago" que abra el modal sin factura especifica (pago a cuenta)
  - Card "Saldo Pendiente" cambia dinamicamente: si el saldo global es negativo, muestra "Saldo a Favor" en verde

- `PagoProveedorModal.tsx`:
  - Soportar modo sin factura (pago a cuenta general del proveedor)
  - Cuando se abre para una factura especifica y hay saldo a favor global, mostrar un banner: "Tenes $X a favor en la cuenta" con boton para aplicarlo

- `useCuentaCorrienteProveedor.ts`:
  - La vista `cuenta_corriente_proveedores` ya calcula `total_pagado` y `total_pendiente`. Solo hay que usar `total_pagado - total_facturado` para detectar saldo a favor en el frontend.

**Base de datos:**
- No se necesitan cambios de esquema. Los pagos ya se registran en `pagos_proveedores` con `factura_id` que puede ser nullable (pago a cuenta). Si actualmente no es nullable, agregar migracion para permitirlo.

### Resultado

- El franquiciado puede pagar de mas en una factura o registrar un pago a cuenta
- El saldo a favor se muestra claramente en la cuenta corriente
- Al pagar la siguiente factura, puede aplicar el saldo a favor con un click
- El libro mayor sigue mostrando el saldo corrido real

