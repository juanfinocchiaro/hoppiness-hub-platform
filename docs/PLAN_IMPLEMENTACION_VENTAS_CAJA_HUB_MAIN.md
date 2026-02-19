# Plan de implementación: Ventas, Cobros y Caja (referencia Hub main)

**Fuente:** `hoppiness-hub-platform-main` (zip analizado)  
**Destino:** código actual de `hoppiness-hub-platform`  
**Fecha:** Febrero 2025

---

## 1. Resumen ejecutivo

La versión **main** del Hub tiene un sistema completo de **ventas (POS), caja (cash register) y cierre de turno** integrado: múltiples cajas por sucursal, turnos de caja con apertura/cierre y arqueo, movimientos (ingresos/egresos/retiros/depósitos), vinculación de pedidos con caja, pago dividido, selector de canal de venta y números de llamadores, reporte de cierre por turno operativo con PDF, y métricas de discrepancias de cajero.

El proyecto **actual** tiene: cierre de turno **manual** (shift_closures con hamburguesas, ventas por canal, Posnet, apps, arqueo), una tabla `turnos_caja` simple (un turno abierto por branch) y un POS en desarrollo sin canal/llamadores ni flujo de caja completo.

Este documento resume **todo lo valioso** de main en ventas/cobros/caja y propone un **plan de implementación por fases** para traerlo al código actual sin duplicar esfuerzo y manteniendo compatibilidad con shift_closures.

---

## 2. Análisis comparativo (Main vs Actual)

| Área | Main (hub-main) | Actual | Gap principal |
|------|-----------------|--------|----------------|
| **POS – Canal de venta** | Selector Mostrador / Apps; tipo servicio Takeaway, Comer acá, Delivery; apps Rappi, PeYa, MP Delivery | Sin selector de canal en POS | Falta UI y estado order_area, service_type, apps_channel |
| **POS – Llamadores** | Número de llamador (1–30), validación dine_in/takeaway, `caller_number` en orders | Sin selector | Falta UI, validación y campo en pedidos |
| **POS – Checkout** | CheckoutDialog con pagos, split payment, tip, draft order, bloqueo si caja cerrada | PaymentModal básico | Falta split, tip, draft, integración caja |
| **Caja – Modelo** | `cash_registers` + `cash_register_shifts` + `cash_register_movements`; múltiples cajas por branch | `turnos_caja` (1 abierto por branch) | Modelo más simple; sin movimientos ni múltiples cajas |
| **Caja – Apertura/Cierre** | useCashRegister (useOpenShift, useCloseShift), arqueo expected/closing/difference, notas | RegisterPage solo muestra estado; sin cierre con arqueo | Falta flujo completo abrir/cerrar y arqueo |
| **Caja – Movimientos** | income, expense, withdrawal, deposit; vinculados a order_id, payment_method; useAddMovement, useVoidMovement | No existe | Sin movimientos ni anulaciones |
| **Caja – Medios de pago** | Tabla `payment_methods` por branch (name, code, is_cash, display_order) | Pos: medios fijos en código | Medios configurables por sucursal |
| **Caja – Integración POS** | Al cobrar: insert en cash_register_movements si hay shift abierto; solo efectivo/app según orden | No registra en caja | Pedidos no generan movimiento de caja |
| **Caja – Alivio** | “Alivio” como egreso; impresión comprobante; ShiftClosureSummary (adelantos, gastos, alivios) | No existe | Sin alivio ni resumen de egresos del turno |
| **Caja – Ingreso manual** | ManualIncomeModal (cuenta corriente, devolución vuelto, otro) | No existe | Sin ingresos manuales a caja |
| **Caja – Egreso rápido** | QuickExpenseModal con PIN encargado para montos altos | No existe | Sin egresos controlados ni verificación |
| **Turno operativo** | useShiftStatus: branch_shifts + cash shift abierto; hasCashOpen; bloqueo POS si !hasCashOpen | useRegister (turnos_caja) solo para mostrar estado | Falta unificar “turno del día” con “caja abierta” y bloqueo |
| **Cierre de turno (reporte)** | LocalCierreTurno: órdenes por fecha/turno, por canal y medio de pago, cierres de caja, staff (attendance_logs), notas, export PDF | ShiftClosureModal: carga manual ventas/Posnet/apps/arqueo; no lee órdenes POS | Dos conceptos: reporte automático vs cierre manual; se pueden complementar |
| **Discrepancias cajero** | useCashierDiscrepancies, cashier_discrepancy_history, reporte por usuario/sucursal | No existe | Sin historial de diferencias de arqueo |
| **Verificación operador** | OperatorVerificationDialog + useOperatorVerification (cambio de operador / PIN para acciones sensibles) | No existe | Sin verificación para anular o egresos altos |
| **Facturación desde POS** | InvoiceButton + edge function generate-invoice | No revisado en actual | Posible gap en generación de comprobantes |
| **Descuentos POS** | DiscountApplier: descuentos de tabla + manual con razón; por cliente | Descuentos en POS a revisar | Descuentos configurables y trazables |

---

## 3. Detalle por dominio (qué tiene Main y conviene traer)

### 3.1 POS – Ventas y configuración del pedido

- **Selector de canal de venta**
  - **Order area:** Mostrador | Apps de Delivery.
  - **Tipo de servicio (mostrador):** Para llevar (takeaway), Comer acá (dine_in), Delivery.
  - **Apps:** Rappi, Pedidos Ya, MercadoPago Delivery (con método de pago por app).
  - Persistido en `orders`: `order_area`, `order_type`, `sales_channel`, `service_type`.
- **Número de llamador**
  - Obligatorio en “Comer acá”; en “Para llevar” nombre o número.
  - UI: grilla de números (ej. 1–30); `customer_name` puede ser "Llamador #N".
  - Campo `caller_number` (integer) en `orders`.
- **Validaciones al cobrar**
  - dine_in → exigir número de llamador.
  - takeaway → nombre o número de llamador.
  - delivery (mostrador o apps) → nombre, teléfono, dirección.
- **Flujo “Nuevo pedido”**
  - Diálogos por paso: tipo de servicio / datos delivery / apps channel.
  - Un solo lugar donde se elige canal + datos cliente/llamador antes de sumar ítems.

**Archivos de referencia (main):**  
`src/components/pos/POSView.tsx` (ORDER_AREAS, SERVICE_TYPES, APPS_CHANNELS, callerNumber, orderArea, serviceType, validaciones, diálogos).

---

### 3.2 POS – Checkout y pagos

- **CheckoutDialog**
  - Resumen del pedido, datos cliente/canal, método de pago.
  - Creación de orden en estado pending; luego pagos contra esa orden.
  - Soporte para “draft”: guardar orden y seguir agregando pagos (evitar doble cobro).
  - Si no hay caja abierta: mensaje y opción de abrir caja (OpenCashModal).
- **Split payment (pago dividido)**
  - Varias líneas de pago (método + monto).
  - Métodos: efectivo, débito, crédito, MP QR, MP Link, transferencia, cuenta corriente.
  - Quick split (ej. 2 o 3 partes iguales).
  - Validación: total pagado = total orden.
- **Tip (propina)**
  - TipInput; se guarda en orden como `tip_amount`.
- **Registro en caja**
  - Tras confirmar cobro: si hay shift abierto y el pago afecta caja (efectivo o PedidosYa efectivo), insert en `cash_register_movements` (income, monto, concept con nº de pedido).

**Archivos de referencia:**  
`CheckoutDialog.tsx`, `SplitPayment.tsx`, `TipInput.tsx`; en POSView el `handleCheckout` y la lógica de `shouldRegisterCashMovement`.

---

### 3.3 Caja – Modelo de datos y hooks

- **Tablas**
  - `cash_registers`: id, branch_id, name, display_order, is_active.
  - `cash_register_shifts`: id, cash_register_id, branch_id, opened_by, closed_by, opened_at, closed_at, opening_amount, closing_amount, expected_amount, difference, notes, status (open | closed).
  - `cash_register_movements`: id, shift_id, branch_id, type (income | expense | withdrawal | deposit), payment_method, amount, concept, order_id, recorded_by, transaction_id (opcional), salary_advance_id (opcional).
  - `payment_methods`: id, branch_id, name, code, is_cash, is_active, display_order.
- **Hooks (useCashRegister)**
  - useCashRegisters(branchId)
  - useCashShifts(branchId, registerIds)
  - useCashMovements(shiftId) / useAllCashMovements(branchId, shifts)
  - usePaymentMethods(branchId)
  - useOpenShift(branchId), useCloseShift(branchId)
  - useAddMovement(branchId), useVoidMovement(branchId)
  - calculateExpectedCash(shift, movements), calculateTotals(movements)

**Archivo de referencia:**  
`src/hooks/useCashRegister.ts`.

---

### 3.4 Caja – Página LocalCaja y flujos

- **Pestañas por caja** (una por cash_register activa).
- **Apertura:** selector de caja + monto inicial → useOpenShift.
- **Cierre:** monto esperado (calculado), monto contado, diferencia, notas → useCloseShift.
- **Movimientos:** listado por shift; anulación (useVoidMovement) con permiso admin/gerente.
- **Ingreso manual:** ManualIncomeModal (cuenta corriente, devolución de vuelto, otro).
- **Egreso rápido:** QuickExpenseModal (concepto, monto, método efectivo/transferencia); si supera umbral, OperatorVerificationDialog (PIN encargado).
- **Adelantos:** SalaryAdvanceModal vinculado a caja (movimiento + registro de adelanto).
- **Alivio de caja:** flujo “Alivio” (retiro de efectivo); comprobante imprimible (ventana print).
- **Configuración de medios de pago:** por branch; alta/edición en diálogo.
- **Resumen de cierre:** ShiftClosureSummary (adelantos, gastos, alivios del turno).

**Archivos de referencia:**  
`LocalCaja.tsx`, `OpenCashModal.tsx`, `ManualIncomeModal.tsx`, `QuickExpenseModal.tsx`, `SalaryAdvanceModal.tsx`, `OperatorVerificationDialog.tsx`, `ShiftClosureSummary.tsx`, `CashierDiscrepancyStats.tsx`.

---

### 3.5 Turno operativo y bloqueo POS

- **useShiftStatus(branchId)**
  - Turno del día según `branch_shifts` (horarios).
  - Shift de caja abierto: consulta `cash_register_shifts` (status = open).
  - Retorna: currentShift, hasCashOpen, activeCashShift, loading, hasChecked, refetch.
- **Bloqueo en POS**
  - Si !hasCashOpen: no permitir cobrar; mostrar CashClosedBlock o abrir OpenCashModal.
  - CashStatusIndicator en header para mostrar “Caja abierta/cerrada”.

**Archivos de referencia:**  
`useShiftStatus.ts`, `CashClosedBlock.tsx`, `CashStatusIndicator.tsx`; en POSView el uso de shiftStatus y showOpenCashModal.

---

### 3.6 Cierre de turno (reporte día/turno)

- **LocalCierreTurno (main)**
  - Filtro por fecha y turno (branch_shifts + “Extendido”).
  - Datos: órdenes del rango (no canceladas), canceladas, cash_register_shifts del rango, staff (attendance_logs), notas (shift_notes).
  - Métricas: total ventas, cantidad pedidos, ticket medio, desglose por medio de pago, por canal (sales_channel), por producto.
  - Cierres de caja: apertura, cierre, esperado, contado, diferencia.
  - Horas de personal (entrada/salida).
  - Export PDF (html2canvas + jsPDF) del reporte.
- **Relación con shift_closures (actual)**
  - shift_closures = cierre **manual** (hamburguesas, ventas por canal manual, Posnet, apps, arqueo Núcleo).
  - LocalCierreTurno = **reporte** sobre datos reales (orders + caja + asistencia).
  - Convivencia: mantener ambos; opcionalmente pre-cargar totales desde órdenes POS en el modal de cierre manual donde aplique.

---

### 3.7 Discrepancias de cajero

- **Vista/vista materializada o tabla:** `cashier_discrepancy_history` (por cierre de caja: user, expected, actual, discrepancy).
- **RPC:** get_cashier_discrepancy_stats(_user_id, _branch_id) → total_shifts, perfect_shifts, precision_pct, discrepancy_this_month/total, last_discrepancy_*.
- **Hooks:** useCashierStats, useCashierHistory, useBranchDiscrepancyReport.
- **UI:** CashierDiscrepancyStats (tarjetas por cajero); reporte por sucursal y rango de fechas.

**Archivos de referencia:**  
`useCashierDiscrepancies.ts`, `CashierDiscrepancyStats.tsx`.

---

### 3.8 Verificación de operador

- **useOperatorVerification(branchId)**
  - Operador actual (quien está usando el POS); cambio de operador (email + password).
  - Log de “confirmación de identidad” para acciones sensibles.
- **OperatorVerificationDialog**
  - Confirmar identidad del operador actual o cambiar a otro (re-ingreso).
  - Uso: anulación de movimientos, egresos por encima de umbral.

**Archivos de referencia:**  
`useOperatorVerification.ts`, `OperatorVerificationDialog.tsx`.

---

## 4. Modelo de datos a considerar (Main)

- **orders:** order_type, order_area, sales_channel, service_type, caller_number, payment_method, delivery_fee, tip_amount, invoice_type, customer_cuit, customer_business_name, external_order_id, etc.
- **cash_registers**, **cash_register_shifts**, **cash_register_movements** (como en sección 3.3).
- **payment_methods** por branch.
- **shift_notes** (opcional): branch_id, shift_date, shift_name, note.
- **cashier_discrepancy_history** (o RPC que rellene desde cash_register_shifts).
- **attendance_logs** (si no existe): para staff en cierre de turno; en actual podrían ser clock_entries con otro formato.

En el proyecto actual ya existen `turnos_caja` y migraciones POS; hay que decidir si se **extienden** o se **reemplazan** por cash_registers + cash_register_shifts + cash_register_movements para no tener dos modelos de “caja” en paralelo.

---

## 5. Plan de implementación por fases

### Fase 1 – Base POS: canal de venta y llamadores (corto plazo)

- **Objetivo:** Que cada pedido POS tenga canal, tipo de servicio y número de llamador cuando corresponda.
- **Tareas:**
  1. En DB: asegurar en `orders` (o tabla equivalente de pedidos POS) los campos: `order_type`, `order_area`, `sales_channel`, `service_type`, `caller_number`. Si la tabla se llama distinto, mapear.
  2. En POS (página/componente principal de venta):
     - Añadir estado: orderArea, serviceType, appsChannel, callerNumber.
     - Añadir UI selector de canal (Mostrador / Apps) y, para Mostrador, tipo de servicio (Takeaway, Comer acá, Delivery).
     - Para Mostrador + Takeaway o Comer acá: añadir selector de número de llamador (grilla 1–N) y/o nombre; validar al ir a cobrar.
     - Para Apps: selector de plataforma (Rappi, Pedidos Ya, MP Delivery) y opcionalmente ID de pedido externo.
  3. Al crear la orden (checkout), enviar estos campos en el insert.
- **Criterio de éxito:** Cada orden guardada con canal y, cuando aplique, caller_number; reportes por canal posibles.
- **Referencia:** POSView.tsx (líneas 156–166, 247–250, 1814–1865, 2178–2265, 839–858, 906–918).

---

### Fase 2 – Caja: modelo y apertura/cierre (medio plazo)

- **Objetivo:** Múltiples cajas por sucursal, turnos con apertura/cierre y arqueo, sin aún vincular movimientos a pedidos.
- **Tareas:**
  1. Migraciones:
     - Crear `cash_registers`, `cash_register_shifts`, `cash_register_movements` (y opcionalmente `payment_methods`) si no existen.
     - Definir RLS y políticas por branch.
  2. Hooks:
     - Implementar useCashRegister (registers, shifts, movements, open, close, addMovement, voidMovement, expectedCash, totals) según main.
  3. UI:
     - Página “Caja” (o equivalente a LocalCaja): lista de cajas, por cada una estado del turno (abierto/cerrado), botón Abrir/Cerrar.
     - Abrir: selector de caja + monto inicial (como OpenCashModal).
     - Cerrar: mostrar monto esperado (calculado), input monto contado, diferencia, notas; guardar con useCloseShift.
  4. Integrar en POS: useShiftStatus (o lógica equivalente) que consulte turno de caja abierto; si no hay caja abierta, mostrar bloqueo o modal de apertura (sin aún registrar cobros como movimientos).
- **Criterio de éxito:** Se pueden abrir/cerrar turnos de caja por caja, con arqueo y diferencia; POS puede bloquear cobro si no hay caja abierta.
- **Referencia:** useCashRegister.ts, OpenCashModal.tsx, CashClosedBlock.tsx, useShiftStatus.ts, LocalCaja.tsx (apertura/cierre).

---

### Fase 3 – Movimientos de caja e integración con cobros (medio plazo)

- **Objetivo:** Cada cobro en POS que corresponda (efectivo, etc.) genere un movimiento de caja; listar movimientos y permitir anulación controlada.
- **Tareas:**
  1. Al confirmar pago en POS: si hay shift abierto y el método afecta caja (efectivo o regla de app), insert en cash_register_movements (type income, amount, concept con nº orden, order_id).
  2. Página Caja: listado de movimientos del turno actual; botón anular con permiso (admin/gerente) usando useVoidMovement.
  3. Opcional: payment_methods por branch y selector en movimientos/cierre.
- **Criterio de éxito:** Cobros en POS quedan registrados en caja; en Caja se ven y se pueden anular con permisos.
- **Referencia:** POSView handleCheckout (shouldRegisterCashMovement, insert cash_register_movements), LocalCaja listado y useVoidMovement.

---

### Fase 4 – Pago dividido, propina y draft (medio plazo)

- **Objetivo:** Soporte para split payment, propina y borrador de orden para no perder el carrito al cerrar el diálogo.
- **Tareas:**
  1. Componente SplitPayment: múltiples líneas (método + monto), total pagado vs total orden, quick split 2/3.
  2. TipInput en checkout; persistir tip_amount en la orden.
  3. Checkout: crear orden en “pending” o “draft”, luego aplicar uno o más pagos; si se cierra el diálogo sin terminar, conservar orderId + pagos y permitir reabrir para completar (onDraftUpdated).
  4. Si hay pagos parciales en efectivo, registrar cada uno como movimiento de caja (o un movimiento por orden según regla de negocio).
- **Criterio de éxito:** Pago dividido y propina operativos; borrador de cobro recuperable.
- **Referencia:** CheckoutDialog.tsx, SplitPayment.tsx, TipInput.tsx.

---

### Fase 5 – Ingresos/egresos manuales y alivio (medio plazo)

- **Objetivo:** Ingresos manuales (cuenta corriente, vuelto, otros), egresos con control por monto y alivio de caja.
- **Tareas:**
  1. ManualIncomeModal: tipo (cuenta corriente, devolución vuelto, otro), concepto, monto; insert income en cash_register_movements.
  2. QuickExpenseModal: concepto, monto, método (efectivo/transferencia); si monto > umbral, exigir OperatorVerificationDialog (PIN/encargado).
  3. Flujo “Alivio”: egreso tipo withdrawal (o expense) con concepto “Alivio”; opcional: comprobante imprimible (como en main).
  4. Implementar useOperatorVerification y OperatorVerificationDialog (confirmar operador o cambiar con email/password).
- **Criterio de éxito:** Ingresos y egresos manuales registrados; egresos altos con verificación; alivio con comprobante opcional.
- **Referencia:** ManualIncomeModal.tsx, QuickExpenseModal.tsx, OperatorVerificationDialog.tsx, useOperatorVerification.ts, LocalCaja (alivio + print).

---

### Fase 6 – Reporte de cierre de turno (LocalCierreTurno) (largo plazo)

- **Objetivo:** Pantalla de cierre que muestre ventas reales (orders), cierres de caja y staff por turno/fecha, con export PDF.
- **Tareas:**
  1. Página “Cierre de turno” (o sección) con filtro fecha + turno (branch_shifts + “Extendido”).
  2. Consultar órdenes en el rango, cash_register_shifts, y asistencia (clock_entries o attendance_logs); calcular totales por canal, medio de pago, productos.
  3. Mostrar resumen de cierres de caja (esperado, contado, diferencia).
  4. Notas de turno (shift_notes si existe).
  5. Export a PDF del reporte (misma idea que main con html2canvas + jsPDF).
- **Criterio de éxito:** Un solo reporte por día/turno con datos reales y exportable; puede convivir con el cierre manual (shift_closures) para lo que siga siendo manual (Núcleo, hamburguesas, etc.).
- **Referencia:** LocalCierreTurno.tsx (getTimeRange, query shiftData, totalSales, paymentBreakdown, channelBreakdown, productBreakdown, staffHours, handleExport).

---

### Fase 7 – Discrepancias de cajero y métricas (largo plazo)

- **Objetivo:** Historial de diferencias de arqueo por cajero y reporte por sucursal.
- **Tareas:**
  1. Al cerrar turno de caja: guardar expected_amount, closing_amount, difference; si hay vista/tabla cashier_discrepancy_history, alimentarla (o RPC que consulte shifts cerrados).
  2. RPC get_cashier_discrepancy_stats(user_id, branch_id).
  3. Hooks useCashierStats, useCashierHistory, useBranchDiscrepancyReport.
  4. UI: CashierDiscrepancyStats en Caja o en perfil; reporte por branch y rango de fechas.
- **Criterio de éxito:** Diferencia de cierre guardada y consultable por usuario y por sucursal.
- **Referencia:** useCashierDiscrepancies.ts, CashierDiscrepancyStats.tsx.

---

### Fase 8 – Ajustes y complementos (según prioridad)

- **Medios de pago configurables:** Tabla payment_methods por branch; CRUD en configuración del local; uso en movimientos y en POS.
- **Descuentos POS:** Descuentos por código y manual con razón (DiscountApplier); persistir en orden si hay campo discount_total o ítem de descuento.
- **Facturación desde POS:** Botón “Generar comprobante” (InvoiceButton) llamando a edge function o servicio que genere PDF; enlace a orden (invoice_type, customer_cuit, customer_business_name ya en main).
- **ShiftClosureSummary:** En pantalla de cierre de caja o en cierre de turno, card con adelantos, gastos y alivios del turno (consultando movements del shift).
- **Unificación turnos_caja vs cash_register_shifts:** Si se adopta el modelo main, migrar datos de turnos_caja a cash_register_shifts (una “caja virtual” por branch si hace falta) y deprecar turnos_caja.

---

## 6. Orden sugerido y dependencias

```
Fase 1 (canal + llamadores)     → independiente
Fase 2 (caja modelo + abrir/cerrar) → base para 3, 4, 5, 6, 7
Fase 3 (movimientos + integración cobros) → depende de 2
Fase 4 (split + tip + draft)    → depende de 2 y flujo de checkout actual
Fase 5 (ingresos/egresos/alivio) → depende de 2
Fase 6 (reporte cierre turno)   → depende de 2 y de orders
Fase 7 (discrepancias)          → depende de 2 (cierre con difference)
Fase 8 (opcionales)             → según necesidad
```

Recomendación: hacer **Fase 1** y **Fase 2** primero; luego **Fase 3** para que los cobros POS queden en caja; después **Fase 4** y **Fase 5**; por último **Fase 6** y **Fase 7**.

---

## 7. Archivos de referencia (Main) por tema

| Tema | Archivos |
|------|----------|
| POS canal y llamadores | `src/components/pos/POSView.tsx` |
| Checkout y caja | `src/components/pos/CheckoutDialog.tsx`, `OpenCashModal.tsx`, `CashClosedBlock.tsx` |
| Split y propina | `src/components/pos/SplitPayment.tsx`, `TipInput.tsx` |
| Caja hooks y lógica | `src/hooks/useCashRegister.ts`, `src/hooks/useShiftStatus.ts` |
| Página Caja | `src/pages/local/LocalCaja.tsx` |
| Modales caja | `ManualIncomeModal.tsx`, `QuickExpenseModal.tsx`, `SalaryAdvanceModal.tsx`, `OperatorVerificationDialog.tsx` |
| Cierre turno reporte | `src/pages/local/LocalCierreTurno.tsx` |
| Discrepancias | `src/hooks/useCashierDiscrepancies.ts`, `CashierDiscrepancyStats.tsx` |
| Descuentos / Factura | `DiscountApplier.tsx`, `InvoiceButton.tsx` |
| Resumen egresos turno | `ShiftClosureSummary.tsx` |

---

## 8. Notas finales

- **Compatibilidad con shift_closures:** El cierre **manual** (hamburguesas, ventas por canal, Posnet, apps, arqueo) puede seguir igual; el reporte automático (Fase 6) es complementario y puede pre-llenar totales desde orders donde aplique.
- **Nomenclatura DB:** En main, movimientos usan type `income`/`expense`/`withdrawal`/`deposit`; en algunos modales (ManualIncomeModal) se vio `ingreso`/`egreso` en español. Unificar a un solo conjunto de valores en DB y mapear en UI.
- **Permisos:** Anulación de movimientos, egresos altos y verificación de operador deben respetar roles (admin, gerente, encargado) como en main.
- **Testing:** Priorizar tests E2E o integración para: apertura/cierre de caja, cobro POS con movimiento de caja, pago dividido y anulación de movimiento.

Este plan permite implementar de forma ordenada todo lo valioso de la versión main en ventas, cobros y caja, sin reescribir todo de golpe y manteniendo la coexistencia con el cierre de turno manual actual.
