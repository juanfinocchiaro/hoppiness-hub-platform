

# Simplificar el flujo de Registrar Pago

## Problema

Al abrir el modal de "Registrar pago", el monto a cobrar aparece en $0 en vez del saldo pendiente (hay un bug: `handleOpenChange` no se ejecuta porque el dialog se abre desde fuera con `open={true}` directo). Ademas, para medios digitales (debito, credito, QR, transferencia) no tiene sentido pedir "monto a cobrar" separado -- siempre se cobra el total pendiente. Solo en efectivo tiene sentido editar el monto (pago parcial) y el monto recibido.

## Solucion

Simplificar el flujo segun el medio de pago:

**Medios digitales (debito, credito, QR, transferencia):**
- Se pre-carga el saldo pendiente como monto
- Se muestra el monto pero permite editarlo (por si es pago parcial)
- Un solo tap en "Registrar" y listo -- sin campo "Monto recibido"

**Efectivo:**
- Se pre-carga el saldo pendiente como monto a cobrar
- Se pre-carga el mismo valor en "Monto recibido" (asumiendo pago exacto)
- Botones rapidos de billetes para cuando pagan con mas
- Calculo de vuelto automatico

## Cambios tecnicos

**Archivo:** `src/components/pos/RegisterPaymentPanel.tsx`

1. **Fix del pre-llenado:** Usar `useEffect` sincronizado con `open` y `saldoPendiente` en vez de depender de `handleOpenChange` (que no se ejecuta cuando `open` viene como prop)
2. **Auto-llenar "Monto recibido"** con el saldo pendiente cuando el metodo es efectivo
3. **Al cambiar metodo a efectivo**, auto-llenar recibido con el monto actual
4. **Al cambiar metodo a digital**, limpiar recibido (no aplica)

Esto hace que el flujo mas comun (cobrar todo con un solo medio) sea: abrir modal, elegir medio, tap "Registrar". Tres toques.
