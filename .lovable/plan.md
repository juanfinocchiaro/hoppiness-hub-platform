

## Solución: Cambio de forma de pago en Más Delivery

### El problema

Un pedido entra por MásDelivery marcado como "efectivo", pero el cliente retira y paga con tarjeta. Ese cobro pasa por el Posnet del local, pero en Núcleo queda registrado como "Efectivo" de MásDelivery. Resultado: el Posnet muestra mas que lo registrado en tarjetas de Nucleo, generando una diferencia falsa.

### La solución

Agregar un campo **"Cobrado por Posnet"** dentro de la sección de Más Delivery. Este monto:
1. Se suma al "Total Tarjetas Núcleo" en la comparación con Posnet (para que cuadre)
2. Se resta del efectivo de MásDelivery para la lógica de facturación (porque ya no es efectivo, es tarjeta)

### Cambios

**1. Tipos** (`src/types/shiftClosure.ts`)
- Agregar campo `cobrado_posnet: number` a `mas_delivery` dentro de `VentasAppsData`
- Actualizar `calcularTotalTarjetasNucleo()` para sumar `ventasApps.mas_delivery.cobrado_posnet`
- Actualizar `calcularFacturacionEsperada()` para restar el cobrado_posnet del efectivo MásDelivery (ya no va como efectivo)
- Actualizar defaults y migration helpers

**2. UI de Apps** (`src/components/local/closure/AppSalesSection.tsx`)
- Agregar input "Cobrado por Posnet" en la card de Más Delivery, con una nota explicativa tipo "Pedidos que entraron como efectivo pero se cobraron con tarjeta en el local"

**3. Comparación Posnet** (`src/components/local/closure/PosnetComparisonSection.tsx`)
- Recibir `ventasApps` como prop adicional para poder sumar el `cobrado_posnet`
- Actualizar la función de calculo para incluir ese monto

**4. Modal principal** (`src/components/local/closure/ShiftClosureModal.tsx`)
- Pasar `ventasApps` al componente de Posnet

### Flujo del encargado

Antes:
- MásDelivery: Efectivo = $29.600 (pero el cliente pagó con tarjeta)
- Posnet: $199.800
- Nucleo tarjetas: $170.200
- Diferencia: -$29.600 (error falso)

Despues:
- MásDelivery: Efectivo = $0, Cobrado por Posnet = $29.600
- Posnet: $199.800
- Nucleo tarjetas: $170.200 + $29.600 = $199.800
- Diferencia: $0

No requiere cambios en la base de datos (el campo se guarda dentro del JSONB de `ventas_apps`).
