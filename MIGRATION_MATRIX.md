# 🗺️ Matriz de Migración de Endpoints

**Fecha:** 5 de marzo de 2026 (Post-refactoring)  
**Objetivo:** Mapear todos los endpoints actuales de Supabase a sus equivalentes en NestJS backend.

---

## 📋 Convenciones

| Símbolo | Significado |
|---------|-------------|
| ✅ | Migrado y funcional |
| 🚧 | En progreso |
| 📋 | Pendiente |
| 🔄 | Mantener como Edge Function |
| ❌ | Deprecado / No migrar |

---

## 🔐 AUTENTICACIÓN

| Funcionalidad | Supabase/Lovable | NestJS Endpoint | Estado | Notas |
|---------------|------------------|-----------------|--------|-------|
| Login email/password | `supabase.auth.signInWithPassword()` | `POST /api/v1/auth/login` | 📋 | JWT propio |
| Registro email/password | `supabase.auth.signUp()` | `POST /api/v1/auth/register` | 📋 | JWT propio |
| Google OAuth | `lovable.auth.signInWithOAuth('google')` | `POST /api/v1/auth/google` | 📋 | Eliminar Lovable |
| Refresh token | `supabase.auth.refreshSession()` | `POST /api/v1/auth/refresh` | 📋 | JWT refresh |
| Logout | `supabase.auth.signOut()` | `POST /api/v1/auth/logout` | 📋 | Invalidar token |
| Reset password | `supabase.auth.resetPasswordForEmail()` | `POST /api/v1/auth/reset-password` | 📋 | Email con link |
| Verificar email | `supabase.auth.resend()` | `POST /api/v1/auth/verify-email` | 📋 | Confirmación |
| Get session | `supabase.auth.getSession()` | `GET /api/v1/auth/me` | 📋 | User info |

---

## 👥 USUARIOS Y PERMISOS

### Usuarios

| Funcionalidad | Supabase | NestJS Endpoint | Estado | Notas |
|---------------|----------|-----------------|--------|-------|
| Listar usuarios | `from('profiles').select()` | `GET /api/v1/users` | 📋 | Con paginación |
| Ver usuario | `from('profiles').select().eq('id', id)` | `GET /api/v1/users/:id` | 📋 | Profile completo |
| Crear usuario | `supabase.auth.signUp()` + profile insert | `POST /api/v1/users` | 📋 | Admin only |
| Actualizar usuario | `from('profiles').update()` | `PATCH /api/v1/users/:id` | 📋 | Self o admin |
| Eliminar usuario | `from('profiles').update({ is_active: false })` | `DELETE /api/v1/users/:id` | 📋 | Soft delete |
| Cambiar contraseña | `supabase.auth.updateUser({ password })` | `PATCH /api/v1/users/:id/password` | 📋 | Self o admin |
| Upload avatar | `supabase.storage.from('avatars').upload()` | `POST /api/v1/users/:id/avatar` | 📋 | Multer/S3 |

### Roles y Permisos

| Funcionalidad | Supabase | NestJS Endpoint | Estado | Notas |
|---------------|----------|-----------------|--------|-------|
| Listar roles | `from('roles').select()` | `GET /api/v1/roles` | 📋 | Scope brand/branch |
| Ver rol | `from('roles').select().eq('id', id)` | `GET /api/v1/roles/:id` | 📋 | Con permisos |
| Crear rol | `from('roles').insert()` | `POST /api/v1/roles` | 📋 | Superadmin only |
| Actualizar rol | `from('roles').update()` | `PATCH /api/v1/roles/:id` | 📋 | Superadmin only |
| Eliminar rol | `from('roles').delete()` | `DELETE /api/v1/roles/:id` | 📋 | Soft delete |
| Listar permisos | `from('permissions').select()` | `GET /api/v1/permissions` | 📋 | Con categorías |
| Asignar rol a usuario | `from('user_role_assignments').insert()` | `POST /api/v1/users/:id/roles` | 📋 | HR o superadmin |
| Remover rol de usuario | `from('user_role_assignments').delete()` | `DELETE /api/v1/users/:id/roles/:roleId` | 📋 | HR o superadmin |
| Ver roles de usuario | `from('user_role_assignments').select()` | `GET /api/v1/users/:id/roles` | 📋 | Brand + branch |
| Mis permisos | RPC `get_user_permissions()` | `GET /api/v1/auth/permissions` | 📋 | Current user |
| Verificar permiso | RPC `has_permission()` | `GET /api/v1/auth/check/:key` | 📋 | Guard helper |

---

## 🏢 SUCURSALES (Branches)

| Funcionalidad | Supabase | NestJS Endpoint | Estado | Notas |
|---------------|----------|-----------------|--------|-------|
| Listar sucursales | `from('branches').select()` | `GET /api/v1/branches` | 📋 | Con filtros |
| Ver sucursal | `from('branches').select().eq('id', id)` | `GET /api/v1/branches/:id` | 📋 | Config completa |
| Crear sucursal | `from('branches').insert()` | `POST /api/v1/branches` | 📋 | Coordinador+ |
| Actualizar sucursal | `from('branches').update()` | `PATCH /api/v1/branches/:id` | 📋 | Franquiciado+ |
| Eliminar sucursal | `from('branches').delete()` | `DELETE /api/v1/branches/:id` | 📋 | Soft delete |
| Ver config webapp | `from('branch_webapp_config').select()` | `GET /api/v1/branches/:id/webapp-config` | 📋 | Público |
| Ver config delivery | `from('branch_delivery_config').select()` | `GET /api/v1/branches/:id/delivery-config` | 📋 | Público |
| Mis sucursales | RPC `get_user_branches()` | `GET /api/v1/auth/branches` | 📋 | User access |

---

## 🍕 PEDIDOS (Orders)

| Funcionalidad | Supabase | NestJS Endpoint | Estado | Notas |
|---------------|----------|-----------------|--------|-------|
| Crear pedido POS | `from('pedidos').insert()` | `POST /api/v1/branches/:branchId/orders` | 📋 | Con items |
| Crear pedido webapp | Edge Function `create-webapp-order` | `POST /api/v1/webapp/orders` | 🔄 | Mantener EF |
| Listar pedidos | `from('pedidos').select()` | `GET /api/v1/branches/:branchId/orders` | 📋 | Con filtros |
| Ver pedido | `from('pedidos').select().eq('id', id)` | `GET /api/v1/orders/:id` | 📋 | Con items |
| Actualizar estado | `from('pedidos').update({ estado })` | `PATCH /api/v1/orders/:id/status` | 📋 | + trigger notif |
| Cancelar pedido | `from('pedidos').update({ estado: 'cancelado' })` | `POST /api/v1/orders/:id/cancel` | 📋 | + rollback stock |
| Tracking público | Edge Function `webapp-order-tracking` | `GET /api/v1/webapp/orders/track/:code` | 🔄 | Mantener EF |
| Chat de pedido | Edge Function `webapp-pedido-chat` | `GET/POST /api/v1/webapp/orders/:code/chat` | 🔄 | Mantener EF |
| Historial pedidos | `from('pedidos').select()` | `GET /api/v1/orders/history` | 📋 | Por usuario |
| Pedidos KDS | `from('pedidos').select().in('estado', [...])` | `GET /api/v1/branches/:branchId/kds` | 📋 | Realtime |
| Reabrir pedido | Custom logic | `POST /api/v1/orders/:id/reopen` | 📋 | Encargado+ |

### Items y Modificadores

| Funcionalidad | Supabase | NestJS Endpoint | Estado | Notas |
|---------------|----------|-----------------|--------|-------|
| Ver items pedido | `from('pedido_items').select()` | `GET /api/v1/orders/:id/items` | 📋 | Con modifs |
| Actualizar item | `from('pedido_items').update()` | `PATCH /api/v1/orders/:orderId/items/:itemId` | 📋 | Pre-confirmado |
| Eliminar item | `from('pedido_items').delete()` | `DELETE /api/v1/orders/:orderId/items/:itemId` | 📋 | Pre-confirmado |

---

## 💰 PAGOS (Payments)

| Funcionalidad | Supabase | NestJS Endpoint | Estado | Notas |
|---------------|----------|-----------------|--------|-------|
| Procesar pago | `from('pedido_pagos').insert()` | `POST /api/v1/payments` | 📋 | Multi-método |
| Ver pago | `from('pedido_pagos').select().eq('id', id)` | `GET /api/v1/payments/:id` | 📋 | Estado |
| Listar pagos | `from('pedido_pagos').select()` | `GET /api/v1/branches/:branchId/payments` | 📋 | Con filtros |
| Checkout MP | Edge Function `mp-checkout` | `POST /api/v1/payments/mp/checkout` | 🔄 | Mantener EF |
| Webhook MP | Edge Function `mp-webhook` | `POST /api/v1/payments/mp/webhook` | 🔄 | Mantener EF |
| MP Point payment | Edge Function `mp-point-payment` | `POST /api/v1/payments/mp/point` | 🔄 | Mantener EF |
| Test conexión MP | Edge Function `mp-test-connection` | `GET /api/v1/payments/mp/test` | 🔄 | Mantener EF |

---

## 💵 CAJA (Cash Register)

| Funcionalidad | Supabase | NestJS Endpoint | Estado | Notas |
|---------------|----------|-----------------|--------|-------|
| Abrir caja | `from('cash_register_shifts').insert()` | `POST /api/v1/branches/:branchId/cash-register/open` | 📋 | Fondo inicial |
| Cerrar caja | `from('cash_register_shifts').update()` | `POST /api/v1/branches/:branchId/cash-register/close` | 📋 | Conteo final |
| Caja actual | `from('cash_register_shifts').select()` | `GET /api/v1/branches/:branchId/cash-register/current` | 📋 | Si abierta |
| Movimientos caja | `from('cash_movements').select()` | `GET /api/v1/branches/:branchId/cash-register/movements` | 📋 | Por turno |
| Registrar movimiento | `from('cash_movements').insert()` | `POST /api/v1/branches/:branchId/cash-register/movements` | 📋 | Ingreso/egreso |
| Historial cierres | `from('cash_register_shifts').select()` | `GET /api/v1/branches/:branchId/cash-register/closures` | 📋 | Con reportes |

---

## 📦 STOCK

| Funcionalidad | Supabase | NestJS Endpoint | Estado | Notas |
|---------------|----------|-----------------|--------|-------|
| Listar productos | `from('productos').select()` | `GET /api/v1/branches/:branchId/products` | 📋 | Con stock |
| Ver producto | `from('productos').select().eq('id', id)` | `GET /api/v1/products/:id` | 📋 | Stock detail |
| Stock actual | `from('stock_items').select()` | `GET /api/v1/branches/:branchId/stock` | 📋 | Por sucursal |
| Movimientos stock | `from('stock_movements').select()` | `GET /api/v1/branches/:branchId/stock/movements` | 📋 | Historial |
| Conteo stock | `from('stock_counts').insert()` | `POST /api/v1/branches/:branchId/stock/count` | 📋 | Físico |
| Ajuste stock | `from('stock_movements').insert()` | `POST /api/v1/branches/:branchId/stock/adjust` | 📋 | Corrección |
| Alertas stock bajo | `from('stock_alerts').select()` | `GET /api/v1/branches/:branchId/stock/alerts` | 📋 | Min stock |

---

## 🚚 DELIVERY

| Funcionalidad | Supabase | NestJS Endpoint | Estado | Notas |
|---------------|----------|-----------------|--------|-------|
| Calcular delivery | Edge Function `calculate-delivery` | `POST /api/v1/delivery/calculate` | 🔄 | Mantener EF |
| Tracking cadete | Edge Function `delivery-tracking` | `GET/POST /api/v1/delivery/track/:token` | 🔄 | Mantener EF |
| Zonas delivery | `from('delivery_zones').select()` | `GET /api/v1/branches/:branchId/delivery/zones` | 📋 | Geo |
| Crear zona | `from('delivery_zones').insert()` | `POST /api/v1/branches/:branchId/delivery/zones` | 📋 | Polygon |
| Config delivery | `from('branch_delivery_config').select()` | `GET /api/v1/branches/:branchId/delivery/config` | 📋 | Radio, cost |
| Asignar cadete | `from('pedidos').update({ delivery_user_id })` | `PATCH /api/v1/orders/:id/assign-delivery` | 📋 | Cadete |

---

## 👔 RRHH (HR)

### Fichaje

| Funcionalidad | Supabase | NestJS Endpoint | Estado | Notas |
|---------------|----------|-----------------|--------|-------|
| Registrar fichaje | Edge Function `register-clock-entry` | `POST /api/v1/hr/clock` | 🔄 | PIN auth |
| Ver fichajes | `from('clock_entries').select()` | `GET /api/v1/branches/:branchId/hr/clock-entries` | 📋 | Por usuario |
| Fichaje actual | `from('clock_entries').select().is('clock_out', null)` | `GET /api/v1/hr/clock/current` | 📋 | User activo |
| Reconciliar turnos | Edge Function `reconcile-stale-shifts` | `POST /api/v1/hr/reconcile-shifts` | 🔄 | Cron job |
| Turnos asignados | `from('employee_time_slots').select()` | `GET /api/v1/branches/:branchId/hr/schedules` | 📋 | Por semana |

### Staff

| Funcionalidad | Supabase | NestJS Endpoint | Estado | Notas |
|---------------|----------|-----------------|--------|-------|
| Listar staff | `from('profiles').select().join(...)` | `GET /api/v1/branches/:branchId/hr/staff` | 📋 | De sucursal |
| Invitar staff | Edge Function `send-staff-invitation` | `POST /api/v1/hr/staff/invite` | 🔄 | Email |
| Agregar a sucursal | `from('user_role_assignments').insert()` | `POST /api/v1/branches/:branchId/hr/staff` | 📋 | Role assign |
| Remover de sucursal | `from('user_role_assignments').update({ is_active: false })` | `DELETE /api/v1/branches/:branchId/hr/staff/:userId` | 📋 | Soft |
| Ver detalle empleado | `from('profiles').select()` | `GET /api/v1/hr/staff/:id` | 📋 | Full info |

---

## 📊 REPORTES (Reports)

| Funcionalidad | Supabase | NestJS Endpoint | Estado | Notas |
|---------------|----------|-----------------|--------|-------|
| RDO diario | Materialized view `rdo_diario` | `GET /api/v1/branches/:branchId/reports/rdo` | 📋 | Ventas day |
| Comparativa ventas | Custom query | `GET /api/v1/branches/:branchId/reports/sales-comparison` | 📋 | Periodos |
| Top productos | Custom query | `GET /api/v1/branches/:branchId/reports/top-products` | 📋 | Más vendidos |
| Rendimiento empleado | Custom query | `GET /api/v1/branches/:branchId/reports/employee-performance` | 📋 | Productividad |
| Finanzas | `from('expenses').select()` + aggregations | `GET /api/v1/branches/:branchId/reports/finance` | 📋 | Ingresos/gastos |

---

## 📋 OTROS MÓDULOS

### Compras (Purchases)

| Funcionalidad | Supabase | NestJS Endpoint | Estado | Notas |
|---------------|----------|-----------------|--------|-------|
| Listar compras | `from('compras').select()` | `GET /api/v1/branches/:branchId/purchases` | 📋 | Con items |
| Crear compra | `from('compras').insert()` | `POST /api/v1/branches/:branchId/purchases` | 📋 | + stock in |
| Ver compra | `from('compras').select().eq('id', id)` | `GET /api/v1/purchases/:id` | 📋 | Detalle |

### Gastos (Expenses)

| Funcionalidad | Supabase | NestJS Endpoint | Estado | Notas |
|---------------|----------|-----------------|--------|-------|
| Listar gastos | `from('expenses').select()` | `GET /api/v1/branches/:branchId/expenses` | 📋 | Con filtros |
| Crear gasto | `from('expenses').insert()` | `POST /api/v1/branches/:branchId/expenses` | 📋 | + trigger mov |
| Ver gasto | `from('expenses').select().eq('id', id)` | `GET /api/v1/expenses/:id` | 📋 | Detalle |
| Actualizar gasto | `from('expenses').update()` | `PATCH /api/v1/expenses/:id` | 📋 | Pre-aprobado |
| Eliminar gasto | `from('expenses').delete()` | `DELETE /api/v1/expenses/:id` | 📋 | Soft |

### Proveedores (Partners)

| Funcionalidad | Supabase | NestJS Endpoint | Estado | Notas |
|---------------|----------|-----------------|--------|-------|
| Listar proveedores | `from('partners').select()` | `GET /api/v1/partners` | 📋 | Activos |
| Crear proveedor | `from('partners').insert()` | `POST /api/v1/partners` | 📋 | Con cuenta cte |
| Ver proveedor | `from('partners').select().eq('id', id)` | `GET /api/v1/partners/:id` | 📋 | Detalle |
| Cuenta corriente | `from('partner_account_movements').select()` | `GET /api/v1/partners/:id/account` | 📋 | Saldo |

### Facturas (Invoices)

| Funcionalidad | Supabase | NestJS Endpoint | Estado | Notas |
|---------------|----------|-----------------|--------|-------|
| Listar facturas | `from('invoices').select()` | `GET /api/v1/branches/:branchId/invoices` | 📋 | Con items |
| Emitir factura AFIP | Edge Function `emitir-factura` | `POST /api/v1/invoices/afip/emit` | 🔄 | Mantener EF |
| Nota de crédito | Edge Function `emitir-nota-credito` | `POST /api/v1/invoices/afip/credit-note` | 🔄 | Mantener EF |
| Probar AFIP | Edge Function `probar-conexion-afip` | `GET /api/v1/invoices/afip/test` | 🔄 | Mantener EF |
| Ver factura | `from('invoices').select().eq('id', id)` | `GET /api/v1/invoices/:id` | 📋 | PDF |

### Comunicaciones

| Funcionalidad | Supabase | NestJS Endpoint | Estado | Notas |
|---------------|----------|-----------------|--------|-------|
| Crear comunicado | `from('communications').insert()` | `POST /api/v1/communications` | 📋 | Coordinador |
| Listar comunicados | `from('communications').select()` | `GET /api/v1/communications` | 📋 | Por rol |
| Marcar leído | `from('communication_reads').insert()` | `POST /api/v1/communications/:id/read` | 📋 | User |

### Reuniones (Meetings)

| Funcionalidad | Supabase | NestJS Endpoint | Estado | Notas |
|---------------|----------|-----------------|--------|-------|
| Crear reunión | `from('meetings').insert()` | `POST /api/v1/meetings` | 📋 | Con invitados |
| Listar reuniones | `from('meetings').select()` | `GET /api/v1/meetings` | 📋 | Mis reuniones |
| Notificar reunión | Edge Function `send-meeting-notification` | `POST /api/v1/meetings/:id/notify` | 🔄 | Email |
| Acta reunión | `from('meeting_minutes').insert()` | `POST /api/v1/meetings/:id/minutes` | 📋 | Doc |

### Inspecciones

| Funcionalidad | Supabase | NestJS Endpoint | Estado | Notas |
|---------------|----------|-----------------|--------|-------|
| Crear inspección | `from('inspections').insert()` | `POST /api/v1/branches/:branchId/inspections` | 📋 | Checklist |
| Listar inspecciones | `from('inspections').select()` | `GET /api/v1/branches/:branchId/inspections` | 📋 | Historial |

### Coaching

| Funcionalidad | Supabase | NestJS Endpoint | Estado | Notas |
|---------------|----------|-----------------|--------|-------|
| Crear coaching | `from('coachings').insert()` | `POST /api/v1/hr/coachings` | 📋 | Con feedback |
| Listar coachings | `from('coachings').select()` | `GET /api/v1/hr/coachings` | 📋 | Por empleado |

---

## 🔧 EDGE FUNCTIONS: Estrategia

### Funciones a mantener (🔄)

| Función | Razón | Consumo desde backend |
|---------|-------|----------------------|
| `create-webapp-order` | Público, sin auth | Backend puede llamarla via fetch |
| `webapp-order-tracking` | Público, SSR | Backend puede llamarla via fetch |
| `webapp-pedido-chat` | Público, tracking code | Backend puede llamarla via fetch |
| `delivery-tracking` | Público, cadetes sin app | Backend puede llamarla via fetch |
| `register-clock-entry` | PIN auth, kiosco | Backend puede llamarla via fetch |
| `reconcile-stale-shifts` | Cron job, no crítico | Backend puede llamarla via fetch |
| `calculate-delivery` | Lógica compleja, estable | Backend puede llamarla via fetch |
| `google-maps-key` | API key proxy | Backend puede llamarla via fetch |
| `mp-checkout` | Integración MP | Backend puede llamarla via fetch |
| `mp-webhook` | Webhook de MP | Backend puede llamarla via fetch |
| `mp-point-*` | 3 funciones MP Point | Backend puede llamarla via fetch |
| `emitir-factura` | AFIP WSAA/WSFEV1 | Backend puede llamarla via fetch |
| `emitir-nota-credito` | AFIP NC | Backend puede llamarla via fetch |
| `probar-conexion-afip` | Test AFIP | Backend puede llamarla via fetch |
| `send-*-notification` | 5 funciones notificaciones | Backend puede llamarla via fetch |
| `send-staff-invitation` | Email invitación | Backend puede llamarla via fetch |
| `link-guest-orders` | Onboarding webapp | Backend puede llamarla via fetch |
| `send-order-push` | Push notifications | Backend puede llamarla via fetch |
| `print-to-network` | Impresión local | Backend puede llamarla via fetch |

**Total:** 26 funciones, ~5,952 líneas de código Deno

### Servicios NestJS que consumen edge functions

```typescript
// backend/src/integrations/supabase-functions/supabase-functions.service.ts
@Injectable()
export class SupabaseFunctionsService {
  private readonly baseUrl = process.env.SUPABASE_URL;
  private readonly serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  async invokeFunction(name: string, body: any, headers?: Record<string, string>) {
    const response = await fetch(`${this.baseUrl}/functions/v1/${name}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.serviceKey}`,
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
    });
    return response.json();
  }

  // Métodos específicos
  async calculateDelivery(branchId: string, lat: number, lng: number) {
    return this.invokeFunction('calculate-delivery', { branch_id: branchId, customer_lat: lat, customer_lng: lng });
  }

  async sendOrderPush(pedidoId: string, estado: string, clienteUserId: string) {
    return this.invokeFunction('send-order-push', { pedido_id: pedidoId, estado, cliente_user_id: clienteUserId });
  }

  // ... etc
}
```

---

## 📊 Resumen de migración

| Categoría | Total endpoints | Estado |
|-----------|----------------|--------|
| Autenticación | 8 | 📋 Todos pendientes |
| Usuarios y permisos | 16 | 📋 Todos pendientes |
| Sucursales | 8 | 📋 Todos pendientes |
| Pedidos | 11 | 📋 8 pendientes, 3 mantener EF |
| Pagos | 7 | 📋 3 pendientes, 4 mantener EF |
| Caja | 6 | 📋 Todos pendientes |
| Stock | 7 | 📋 Todos pendientes |
| Delivery | 6 | 📋 3 pendientes, 3 mantener EF |
| RRHH | 10 | 📋 7 pendientes, 3 mantener EF |
| Reportes | 5 | 📋 Todos pendientes |
| Compras | 3 | 📋 Todos pendientes |
| Gastos | 5 | 📋 Todos pendientes |
| Proveedores | 4 | 📋 Todos pendientes |
| Facturas | 5 | 📋 2 pendientes, 3 mantener EF |
| Comunicaciones | 3 | 📋 Todos pendientes |
| Reuniones | 4 | 📋 3 pendientes, 1 mantener EF |
| Inspecciones | 2 | 📋 Todos pendientes |
| Coaching | 2 | 📋 Todos pendientes |

**Total estimado:** ~110 endpoints + 26 edge functions reutilizadas

---

## ✅ Criterios de validación

Para cada endpoint migrado:

- [ ] Controller creado con decoradores correctos
- [ ] Service con lógica de negocio
- [ ] DTOs con class-validator
- [ ] Guards aplicados (JWT, Roles, Branch)
- [ ] Tests unitarios ✅
- [ ] Tests de integración ✅
- [ ] Swagger documentation
- [ ] Error handling apropiado
- [ ] Logging implementado
- [ ] Frontend hook actualizado

---

**Estado:** ✅ **Matriz completa y actualizada** (5 de marzo de 2026)
