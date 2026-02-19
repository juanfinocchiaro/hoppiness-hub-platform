

# Sistema de Cuenta y Cobro del POS - Implementacion Completa

## Resumen

Transformar el POS de un flujo "cobrar y enviar en un paso" a un modelo de **cuenta con saldo** donde los pagos se registran progresivamente antes de enviar a cocina. Incluye tambien correccion post-venta de medios de pago.

---

## Fase 1: Modelo de Cuenta en el POS (Cambio principal)

### Concepto
El pedido se convierte en una "cuenta" con dos lados: items (lo que pidio) y pagos (lo que pago). El saldo = total items - total pagos. Solo cuando saldo = $0 se habilita "Enviar a cocina". Una vez enviado, es irrevocable: no se puede agregar nada mas.

### Cambios en la UI del OrderPanel

El panel derecho (carrito) se transforma en una **cuenta** con estas secciones:

1. **Items del pedido** (como ahora, con +/- y eliminar)
2. **Seccion de pagos registrados** (lista de pagos con boton eliminar cada uno)
3. **Resumen**: Total pedido | Total pagado | Saldo
4. **Boton "+ Registrar pago"** (reemplaza el boton "Cobrar")
5. **Boton "Enviar a cocina"** (condicionado a saldo = $0)

### Estados del boton "Enviar a cocina"

| Estado | Visual |
|---|---|
| Sin items | Gris, deshabilitado. "Agrega productos" |
| Con items, sin pagos | Gris. "Cobra $X para enviar" |
| Pago parcial | Gris. "Faltan $X por cobrar" |
| Saldo = $0 | Verde, grande. "Enviar a cocina - $X" |

### Flujo de "Registrar pago"

En vez de abrir el PaymentModal actual (que cobra todo de golpe), se muestra un panel/modal simplificado:
- Medio de pago (5 botones visuales como ahora)
- Monto (pre-llenado con saldo pendiente, editable para pago parcial)
- Si es efectivo: campo "Recibido" + calculo de vuelto
- Boton "Registrar"

Al registrar, el pago se agrega a la lista local y el saldo se recalcula. El cajero puede registrar multiples pagos (split natural).

### Eliminar un pago (antes de enviar)

Cada pago tiene un boton de eliminar con confirmacion. Al eliminar, el saldo se recalcula. Si el saldo vuelve a ser > $0, "Enviar a cocina" se deshabilita.

### Agregar items despues de pagar (antes de enviar)

Si ya hay pagos registrados pero no se envio a cocina, el cajero puede seguir agregando items desde la grilla. El total se recalcula, el saldo sube, y hay que cobrar la diferencia.

### Enviar a cocina (confirmacion)

Al tocar "Enviar a cocina":
1. AlertDialog de confirmacion: "Enviar pedido a cocina? X items - $Y"
2. Al confirmar: se crea el pedido en la DB (pedidos + pedido_items + pedido_pagos) como hoy
3. Se cambia estado a 'pendiente' (para cocina)
4. Se resetea todo y aparece el modal de nueva venta

### Persistencia

Los items y pagos se mantienen en estado local (React state) hasta que se confirma "Enviar a cocina". Recien ahi se graban en la base de datos. Esto simplifica enormemente la implementacion: no hay pedidos "borrador" en la DB.

---

## Fase 2: Correccion Post-Venta de Medios de Pago

### Donde

En el historial de ventas (OrderHistoryTable), cada pedido del turno abierto tendra un boton "Editar forma de pago".

### Quien puede

Cualquier cajero con acceso al POS. No requiere PIN.

### Restriccion temporal

Solo pedidos del turno abierto actual. Si la caja se cerro, el boton se deshabilita.

### Pantalla de edicion

Modal con:
- Lista de pagos actuales (editables: cambiar medio, cambiar monto)
- Agregar pago / Eliminar pago
- Validacion: el total pagado DEBE seguir siendo igual al total del pedido
- Campo "Motivo del cambio" (obligatorio)
- Al guardar: se actualizan los registros en pedido_pagos y se crea un registro de auditoria

### Tabla de auditoria (nueva)

```sql
CREATE TABLE pedido_payment_edits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES pedidos(id),
  pagos_antes JSONB NOT NULL,
  pagos_despues JSONB NOT NULL,
  motivo TEXT NOT NULL,
  editado_por UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

Con RLS: solo usuarios con acceso a la sucursal del pedido.

### Impacto en caja

Cuando se edita un pago, si cambia el monto de efectivo, se debe crear un movimiento de ajuste en `cash_register_movements` para que el cierre de caja refleje la correccion.

### Notificaciones

Por ahora, el registro de auditoria queda en la tabla. Las notificaciones push/email al encargado y franquiciado se pueden agregar en una iteracion posterior (requiere edge function + canal de notificacion).

---

## Detalle Tecnico de Archivos

### Archivos a crear

| Archivo | Descripcion |
|---|---|
| `src/components/pos/AccountPanel.tsx` | Reemplaza OrderPanel. Muestra items + pagos + saldo + botones |
| `src/components/pos/RegisterPaymentPanel.tsx` | Panel/modal para registrar un pago individual |
| `src/components/pos/PaymentEditModal.tsx` | Modal de correccion post-venta de medios de pago |

### Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/pages/pos/POSPage.tsx` | Reemplazar OrderPanel por AccountPanel. Manejar estado de pagos local. Cambiar flujo de confirmacion: "Enviar a cocina" en vez de "Cobrar". Eliminar PaymentModal. |
| `src/components/pos/OrderHistoryTable.tsx` | Agregar boton "Editar forma de pago" por pedido (solo turno abierto) |
| `src/hooks/pos/useOrders.ts` | Ajustar useCreatePedido para recibir pagos pre-registrados (ya funciona con `payments[]`) |
| `src/types/pos.ts` | Agregar tipo `LocalPayment` para pagos en estado local |

### Archivos que se dejan de usar

| Archivo | Motivo |
|---|---|
| `src/components/pos/PaymentModal.tsx` | Reemplazado por RegisterPaymentPanel (pagos uno a uno) |
| `src/components/pos/SplitPayment.tsx` | El split es ahora el comportamiento natural (multiples pagos) |
| `src/components/pos/TipInput.tsx` | Sin propinas |

### Migracion de base de datos

```sql
-- Tabla de auditoria de ediciones de pago
CREATE TABLE pedido_payment_edits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES pedidos(id),
  pagos_antes JSONB NOT NULL,
  pagos_despues JSONB NOT NULL,
  motivo TEXT NOT NULL,
  editado_por UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE pedido_payment_edits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payment edits for their branches"
  ON pedido_payment_edits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pedidos p
      WHERE p.id = pedido_payment_edits.pedido_id
      AND has_branch_access_v2(auth.uid(), p.branch_id)
    )
  );

CREATE POLICY "Users can create payment edits for their branches"
  ON pedido_payment_edits FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pedidos p
      WHERE p.id = pedido_payment_edits.pedido_id
      AND has_branch_access_v2(auth.uid(), p.branch_id)
    )
  );
```

---

## Flujo completo resumido

```text
1. Cajero abre POS
2. Modal de configuracion (canal, servicio, llamador)
3. Cajero carga items en la grilla
4. Panel derecho muestra: items + saldo pendiente
5. Cajero toca "+ Registrar pago"
6. Elige medio, monto, confirma
7. Pago aparece en la lista, saldo se reduce
8. Puede agregar mas items o mas pagos
9. Cuando saldo = $0, se habilita "Enviar a cocina"
10. Confirma envio -> se graba todo en DB -> reset -> modal nueva venta
```

---

## Consideraciones

- **Sin propinas** (confirmado)
- **Sin agregar items post-envio** (confirmado: envio es irrevocable)
- Los pagos son locales (React state) hasta el envio. No hay pedidos "borrador" en la DB.
- El mobile sticky footer mostrara "Registrar pago" en vez de "Cobrar", y "Enviar a cocina" cuando saldo = $0
- La correccion post-venta solo permite cambiar la distribucion de medios, nunca el monto total

