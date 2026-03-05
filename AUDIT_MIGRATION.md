# 📋 Auditoría de código para migración a NestJS + PostgreSQL

**Fecha:** 5 de marzo de 2026 (Actualización completa)  
**Última revisión:** Post-refactoring masivo (migraciones + código)  
**Objetivo:** Documentar estado actual del sistema para migración limpia y ordenada.

---

## 🔍 1. PERMISOS: Análisis de tablas en uso

### Hallazgo
**No se encontraron referencias directas a:**
- `user_roles`
- `user_branch_roles`
- `user_branch_permissions`
- `branch_permissions`

**Tablas realmente en uso:**
1. **`user_role_assignments`** (nueva estructura)
   - Campos: `user_id`, `role_id`, `branch_id`, `is_active`
   - Relación: `roles(key, scope)` donde scope es `'brand'` o `'branch'`
   - Uso: En `permissionsService.ts` → `fetchUserBrandRole()`, `fetchUserBranchRoles()`

2. **`roles`** (definición de roles del sistema)
   - Campos: `id`, `key`, `display_name`, `scope`, `hierarchy_level`, `is_system`
   - Ejemplos de roles:
     - **Scope 'brand':** superadmin, coordinador, informes, contador_marca, community_manager
     - **Scope 'branch':** franquiciado, encargado, contador_local, cajero, empleado
   - Uso: En `permissionsService.ts` → `fetchRoles()`

3. **`permissions`** (definiciones de permisos granulares)
   - Campos: `id`, `key`, `label`, `scope`, `category`, `is_editable`
   - Uso: En `permissionsService.ts` → `fetchPermissions()`

4. **`role_permissions`** (mapeo rol → permisos)
   - Campos: `role_id`, `permission_id`
   - Uso: En `permissionsService.ts` → `fetchRolePermissions()`, `addRolePermission()`, `removeRolePermission()`

5. **`profiles`** (datos del usuario)
   - Campos: `id`, `user_id`, `full_name`, `email`, `phone`, `avatar_url`, `is_active`, `created_at`, `updated_at`
   - Uso: En `permissionsService.ts` → `fetchUserProfile()`

### Conclusión
- **Esquema moderno y granular:** roles RBAC + system-wide permissions.
- **Las tablas legacy son basura:** descartar `user_roles`, `user_branch_roles`, etc.
- **RLS en uso:** Se consulta via `SECURITY DEFINER` RPC `get_user_branches()` y fallback a query directa.

---

## 🌐 2. AUTENTICACIÓN: Integración con Google y Lovable

### Flujo actual
```
Frontend → Lovable SDK (@lovable.dev/cloud-auth-js)
         ↓
         Google OAuth
         ↓
         Supabase Auth (JWT)
```

### Componentes clave
- **`src/integrations/lovable/index.ts`**: Wrapper que usa `createLovableAuth()`
  - `lovable.auth.signInWithOAuth('google', opts)` → maneja popup/redirect de Google
  - El resultado: Lovable devuelve tokens que se setean en Supabase: `supabase.auth.setSession(result.tokens)`

- **`src/pages/AuthPopup.tsx`**: Popup window que invoca OAuth, postMessage al padre
- **`src/hooks/useGooglePopupAuth.ts`**: Hook que abre popup y escucha postMessage
- **`src/services/authService.ts`**: Wrapper de Supabase auth
  - `signInWithPassword()` → Supabase
  - `signUpWithPassword()` → Supabase
  - `getSession()`, `onAuthStateChange()` → Supabase

### Email/Password
- Manejo directo en `authService.ts` sin dependencia de Lovable
- Validación con Zod: `emailSchema`, `passwordSchema`

### Conclusión
- **Dependency a Lovable:** Sólo para Google OAuth (popup helper).
- **Supabase auth:** Maneja tokens, sesiones y refresh.
- **En backend NestJS necesitamos replicar:** Google OAuth + email/password + JWT own tokens.

---

## 🔧 3. EDGE FUNCTIONS: Consumo desde frontend

### Edge functions usadas (26 funciones, ~5,952 líneas)

| Función | Ubicación Frontend | Tipo | Propósito |
|---------|-------------------|------|----------|
| **webapp-order-tracking** | `TrackingPage.tsx`, `TrackingInlineView.tsx` | GET/SSR | Tracking de órdenes webapp (público) |
| **delivery-tracking** | `CadeteTrackingPage.tsx` | GET/POST | GPS tracking de cadetes (no auth) |
| **register-clock-entry** | `FichajeEmpleado.tsx` | POST | Registro de entrada/salida (PIN auth) |
| **reconcile-stale-shifts** | CRON | POST | Cierre automático de turnos (service role) |
| **webapp-pedido-chat** | `OrderChat.tsx`, `FloatingOrderChat.tsx` | GET/POST | Chat de pedidos (tracking code) |
| **google-maps-key** | `BranchLocationMap.tsx`, `checkoutService.ts`, `posService.ts` | GET | API key de Google Maps (Bearer) |
| **mp-point-devices** | `paymentConfigService.ts` | invoke() | MercadoPago Point devices |
| **mp-point-setup** | `paymentConfigService.ts` | invoke() | Setup MP Point |
| **mp-test-connection** | `paymentConfigService.ts` | invoke() | Test MP connection |
| **mp-point-payment** | `posService.ts` | invoke() | MP Point payment |
| **mp-checkout** | `checkoutService.ts` | invoke() | Checkout MP |
| **mp-webhook** | Webhook | POST | Webhook de MercadoPago (firma MP) |
| **calculate-delivery** | `deliveryService.ts` | invoke() | Cálculo de delivery |
| **create-webapp-order** | `checkoutService.ts` | POST | Crear orden webapp (guest/auth) |
| **link-guest-orders** | `userOnboardingService.ts` | invoke() | Link órdenes de guest |
| **send-order-push** | DB trigger | POST | Push notifications de órdenes |
| **contact-notification** | `contactService.ts` | invoke() | Notificación de contacto |
| **send-schedule-notification** | `schedulesService.ts` | invoke() | Notificaciones de schedule |
| **send-meeting-notification** | `meetingsService.ts` | invoke() | Notificaciones de reuniones |
| **send-meeting-minutes-notification** | `meetingsService.ts` | invoke() | Notificación de actas |
| **send-warning-notification** | `warningsService.ts` | invoke() | Notificaciones de warnings |
| **send-staff-invitation** | `staffService.ts` | invoke() | Invitación de staff |
| **emitir-factura** | `fiscalService.ts` | invoke() | Emisión de facturas AFIP |
| **emitir-nota-credito** | `fiscalService.ts` | invoke() | Nota de crédito AFIP |
| **probar-conexion-afip** | `fiscalService.ts` | invoke() | Test AFIP connection |
| **print-to-network** | `printService.ts` | invoke() | Impresión en red |

### Formas de consumo
1. **`fetch()` directo a URL:**
   ```typescript
   fetch(`${baseUrl}/functions/v1/webapp-order-tracking?code=${code}`)
   ```
2. **`supabase.functions.invoke()`:**
   ```typescript
   await supabase.functions.invoke('mp-point-devices', { body })
   ```

### Conclusión
- **26 edge functions** manejando lógica crítica (pagos, AFIP, tracking, notificaciones)
- **5,952 líneas de código Deno/TypeScript**
- **Estrategia de migración:** Backend NestJS puede consumirlas via fetch o replicar su lógica
- **Prioridad:** Funciones críticas (AFIP, MP webhook) se mantienen en Deno, resto se migra progresivamente

---

## 🗄️ 4. BASE DE DATOS: Cambios críticos (Marzo 2026)

### 📝 REFACTORING MASIVO DETECTADO

**Migración `20260304201424`:** Nueva arquitectura de permisos
- ✅ Creadas tablas: `roles`, `permissions`, `role_permissions`, `user_role_assignments`
- ✅ Migrados datos desde `user_roles_v2`, `user_branch_roles`, `permission_config`
- ✅ Funciones RLS reescritas para nuevo modelo (`is_superadmin`, `get_brand_role`, etc.)

**Migración `20260304202108`:** Helpers RLS adicionales
- ✅ Creadas 10+ funciones helper: `has_any_brand_role()`, `has_any_local_role()`, `user_has_access_to_any_branch()`, etc.
- ✅ Reescritura de políticas RLS en todas las tablas usando nuevo modelo

**Migración `20260305122901` (417 líneas):** Renombrado masivo de funciones SQL
- ✅ 25+ funciones renombradas de español a inglés:
  - `actualizar_saldo_factura` → `update_invoice_balance`
  - `descontar_stock_pedido` → `deduct_order_stock`
  - `actualizar_stock_movimiento` → `update_stock_movement`
  - `actualizar_cmv_pedido` → `update_order_cogs`
  - Y muchas más...
- ✅ Triggers recreados con nombres en inglés
- ✅ RLS policies actualizadas

**Migración `20260305125620`:** Últimas correcciones
- ✅ Trigger `sync_expense_movement` recreado
- ✅ Políticas RLS renombradas: `gastos` → `expenses`, `items_factura` → `invoice_items`, `socios` → `partners`, `pedido_items` → `order_items`

### Estado actual del schema
- **429 migraciones SQL totales**
- **Schema estandarizado en inglés**
- **Funciones SQL modernas y bien nombradas**
- **RLS policies completas y actualizadas**

### TRIGGERS SQL: Estrategia de migración

**Decisión:** Opción B - Mover lógica a NestJS
- **Triggers críticos identificados:**
  - `update_invoice_balance` → cuando se modifica `invoice_items`
  - `deduct_order_stock` → cuando se crea `pedido_items`
  - `update_stock_movement` → cuando se actualiza `stock_movements`
  - `update_order_cogs` → cuando se finaliza un pedido
  - `sync_expense_movement` → cuando se crea un gasto
  
- **Beneficios:**
  - Mayor control desde backend
  - Auditable y testeable
  - Rollback más fácil
  - Compatible con múltiples DBs si fuera necesario
  
- **Riesgo mitigado:** Cada trigger debe tener su equivalente en NestJS services

---

## 🌱 5. SEEDS.sql: Contenido necesario

Debe incluir:
- ✅ Usuarios de prueba (admin, gerente, empleado, franquiciado)
- ✅ Sucursales de prueba
- ✅ Roles y role-permissions
- ✅ Productos/categorías (si aplica)
- ✅ Permisos base del sistema

---

## 📦 6. DOCKER: Configuración

```yaml
# docker-compose.yml debe tener:
- PostgreSQL 15
- Backend NestJS (puerto 3000)
- Frontend Vite dev server (puerto 8080)
- Volúmenes persistentes para DB
- Script de init que aplique migraciones + seeds
```

---

## 🔐 7. JWT LOCAL (sin Lovable en dev)

Script en backend:
```bash
# npm run dev:auth
# Genera un token JWT válido con claims básicos
# Usuario: dev@hoppiness.com / password123
```

---

## 📊 8. MÓDULOS PRIORITARIOS para migración

### Fase 1 (Fundamentación)
1. **auth** → login, signup, token refresh
2. **permissions** → roles, permisos, checks
3. **users** → profiles, sync de usuarios
4. **branches** → lectura y control de acceso

### Fase 2 (Operativo)
5. **pedidos** → orden CRUD, items, estado
6. **cash-register** → shifts, movements, closures
7. **payments** → métodos, transacciones

### Fase 3 (Complementarios, puede hacerse en paralelo)
8. **delivery** → tracking, zonas, pricing
9. **stock** → movimientos, conteos
10. **reports** → RDO, finanzas, comparativas

---

## 📝 Resumen ejecutivo

| Área | Estado | Decisión |
|------|--------|----------|
| **Base de Datos** | 429 migraciones, schema estandarizado en inglés | DDL listo para usar, funciones SQL renombradas |
| **Permisos** | RBAC moderno con `user_role_assignments + roles + permissions` | Replicar en NestJS sin cambios en estructura |
| **Auth** | Google via Lovable + email/password en Supabase | Backend genera JWT propio, Google OAuth en backend |
| **Edge Functions** | 26 funciones Deno activas (~5,952 líneas) | Backend las consume via fetch o replica progresivamente |
| **Triggers** | 5+ triggers críticos (factura, stock, pedido, gastos) | Mover a NestJS |
| **Seeds** | No existe | Crear con datos de prueba |
| **Docker** | No existe | Crear docker-compose completo |
| **JWT dev** | Usa Lovable | Crear script de login local |

---

**Estado:** ✅ **Listo para generar el roadmap detallado actualizado.**

**Cambios clave desde última auditoría:**
- ✅ Schema completamente en inglés
- ✅ Nueva arquitectura de roles/permisos implementada
- ✅ 25+ funciones SQL renombradas
- ✅ Triggers actualizados y optimizados
- ✅ RLS policies reescritas con nuevo modelo
