# API & Edge Functions

## Edge Functions

### emitir-factura
Emite factura electrónica a AFIP.

- **Ruta:** `POST /functions/v1/emitir-factura`
- **Auth:** Requiere service_role
- **Body:**
```json
{
  "pedido_id": "uuid",
  "tipo_factura": "A | B",
  "cliente_cuit": "20123456789"
}
```
- **Response:**
```json
{
  "success": true,
  "cae": "12345678901234",
  "numero": 1,
  "pdf_url": "https://..."
}
```

### emitir-nota-credito
Emite nota de crédito para anular una factura.

- **Ruta:** `POST /functions/v1/emitir-nota-credito`
- **Auth:** Requiere service_role

### probar-conexion-afip
Prueba la conexión con AFIP.

- **Ruta:** `POST /functions/v1/probar-conexion-afip`
- **Auth:** Requiere service_role
- **Response:**
```json
{
  "success": true,
  "server_time": "2026-02-21T10:00:00Z"
}
```

### create-webapp-order
Crea un pedido desde la webapp pública.

- **Ruta:** `POST /functions/v1/create-webapp-order`
- **Auth:** Anon key (público)

### mp-checkout
Crea un link de pago de MercadoPago.

- **Ruta:** `POST /functions/v1/mp-checkout`
- **Auth:** Requiere service_role

### mp-webhook
Recibe notificaciones de MercadoPago.

- **Ruta:** `POST /functions/v1/mp-webhook`
- **Auth:** Público (verificación por firma)

### mp-point-setup / mp-point-payment / mp-point-devices
Integración con MercadoPago Point (terminal física).

### send-order-push
Envía notificación push cuando hay un nuevo pedido.

### send-staff-invitation
Envía email de invitación a un empleado.

### send-schedule-notification
Notifica cambios de horarios.

### send-warning-notification
Notifica apercibimientos.

### send-meeting-notification / send-meeting-minutes-notification
Notificaciones de reuniones.

### register-clock-entry
Registra fichaje de empleado (entrada/salida).

### calculate-delivery
Calcula costo y tiempo de delivery.

### delivery-tracking
Tracking en tiempo real de delivery.

### webapp-order-tracking
Tracking de pedido para clientes.

### webapp-pedido-chat
Chat entre cliente y local sobre un pedido.

### link-guest-orders
Vincula pedidos de invitado a una cuenta registrada.

### contact-notification
Notifica mensajes del formulario de contacto.

### google-maps-key
Provee API key de Google Maps al frontend.

### print-to-network
Envía comandos de impresión a impresoras de red.
