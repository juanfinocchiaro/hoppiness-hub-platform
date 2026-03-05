# 🚀 Roadmap Técnico: Migración a NestJS + PostgreSQL

**Fecha:** 5 de marzo de 2026 (Actualización completa post-refactoring)  
**Objetivo final:** Desacoplar completamente del sistema de Lovable/Supabase para autenticación y permisos, manteniendo una arquitectura escalable, dockerizada y centrada en el backend.

**Contexto:** El proyecto ha sido refactorizado masivamente:
- ✅ 429 migraciones SQL (schema en inglés)
- ✅ Nueva arquitectura de roles/permisos implementada
- ✅ 25+ funciones SQL renombradas a inglés
- ✅ 26 edge functions activas (~5,952 líneas Deno)

---

## 📅 Fase 0: Preparativos (Semana 1)

### 0.1 – Configurar entorno base
**Entregables:**
- Nuevo proyecto NestJS scaffolded
- Docker Compose con PostgreSQL + NestJS + frontend (dev)
- Variables de entorno (.env.local, .env.test, .env.prod)
- CI/CD básico (opcional: GitHub Actions)

**Tareas:**
1. `nest new backend-api`
2. Instalar dependencias:
   - `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`
   - `@nestjs/typeorm`, `typeorm`, `pg` (PostgreSQL driver)
   - `@nestjs/config`, `dotenv`
   - `bcrypt`, `jsonwebtoken` para crypto
   - `google-auth-library` para validación de Google tokens
3. Crear `docker-compose.yml`:
   ```yaml
   services:
     db:
       image: postgres:15-alpine
       environment:
         POSTGRES_PASSWORD: dev
         POSTGRES_DB: hoppiness
       ports: ["5432:5432"]
       volumes:
         - ./supabase/migrations:/docker-entrypoint-initdb.d
         - postgres_data:/var/lib/postgresql/data
     backend:
       build: ./backend-api
       ports: ["3000:3000"]
       depends_on: [db]
       environment:
         DATABASE_URL: postgres://postgres:dev@db:5432/hoppiness
         JWT_SECRET: dev-secret-key
         GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
     frontend:
       build: ./frontend
       ports: ["8080:8080"]
       depends_on: [backend]
   ```
4. Script de init DB:
   ```bash
   # backend/scripts/init-db.sh
   # Ejecuta migrations en orden, luego seeds.sql
   ```
5. README con `docker-compose up` para dev local

**Owner:** Arquitecto / Lead Backend  
**Duración:** 2-3 días  
**Hito:** Docker compose funciona, DB lista, NestJS genera "Hello World"

---

## 🔐 Fase 1: Autenticación y Autorización

### 1.1 – Entidades y BD (Auth layer)

**Contexto:** Ya tenemos 429 migraciones SQL con schema completo. No necesitamos crear migraciones desde cero.

**Tareas:**
1. **Reutilizar migraciones existentes:**
   - ✅ Las migraciones en `supabase/migrations/*.sql` contienen todo el DDL necesario
   - ✅ Tabla `auth.users` (gestionada por Supabase Auth, en NestJS será `public.users`)
   - ✅ Tabla `public.profiles` (user_id, full_name, email, phone, avatar_url, is_active)
   - ✅ Tabla `public.roles` (id, key, display_name, scope, hierarchy_level, is_system)
   - ✅ Tabla `public.permissions` (id, key, label, scope, category, is_editable)
   - ✅ Tabla `public.role_permissions` (role_id, permission_id)
   - ✅ Tabla `public.user_role_assignments` (id, user_id, role_id, branch_id, is_active, clock_pin, default_position)

2. **Adaptar para NestJS:**
   - Crear tabla `public.users` en lugar de `auth.users` (sin dependencia de Supabase Auth)
   - Agregar campos: `password_hash`, `google_id`, `email_confirmed_at`
   - Tabla `refresh_tokens` (id, user_id, token_hash, expires_at, created_at)

3. **Script de migración unificado (`backend/migrations/001_init_from_supabase.sql`):**
   ```sql
   -- Copiar DDL de tablas core desde supabase/migrations
   -- Adaptar auth.users → public.users con password_hash
   -- Copiar inserts de roles/permissions (seeds inline)
   -- Agregar refresh_tokens table
   ```

4. **Script `seeds/01_test_users.sql`:**
   - Usuario admin@test.local / password123 (superadmin)
   - Usuario coord@test.local / password123 (coordinador)
   - Usuario franq@test.local / password123 (franquiciado en sucursal 1)
   - Usuario cajero@test.local / password123 (cajero en sucursal 1)

**TypeORM Entities (backend-api/src/auth/entities):**
- `User.entity.ts` (id, email, password_hash, google_id, email_confirmed_at, is_active, created_at, updated_at)
- `UserProfile.entity.ts` → Renombrar a `Profile.entity.ts` (user_id, full_name, email, phone, avatar_url)
- `RefreshToken.entity.ts` (id, user_id, token_hash, expires_at, created_at)
- `Role.entity.ts` (id, key, display_name, scope, hierarchy_level, is_system)
- `Permission.entity.ts` (id, key, label, scope, category, is_editable)
- `UserRoleAssignment.entity.ts` (id, user_id, role_id, branch_id, is_active, clock_pin, default_position)
- `RolePermission.entity.ts` (role_id, permission_id)

**Owner:** Backend Dev (TypeORM)  
**Duración:** 2-3 días (simplificado gracias a migraciones existentes)  
**Hito:** `npm run migration:run` crea DB limpia con seeds, todas las tablas de permisos listas

---

### 1.2 – JWT y login endpoint

**Tareas:**
1. Crear `AuthService`:
   - `signUpLocal(email, password, fullName)` → hash password, crear User
   - `signInLocal(email, password)` → verify password, generar JWT
   - `signInGoogle(googleIdToken)` → validate token, crear/sync User, generar JWT
   - `refreshToken(refreshToken)` → generar nuevo access token
   - `logout(userId)` → invalidar refresh tokens

2. Crear `AuthController`:
   - `POST /api/v1/auth/signup` (email, password, full_name)
   - `POST /api/v1/auth/login` (email, password)
   - `POST /api/v1/auth/google` (id_token from frontend)
   - `POST /api/v1/auth/refresh` (refresh_token in body)
   - `POST /api/v1/auth/logout` (@UseGuards(JwtAuthGuard), @Request())

3. Crear `JwtStrategy` (Passport):
   - Validar JWT, extraer claims
   - Cargar usuario de DB
   
4. DTOs:
   - `SignUpDto`, `SignInDto`, `GoogleSignInDto`
   - `AuthResponseDto` (access_token, refresh_token, user)

**Testing:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@local","password":"123","full_name":"Test User"}'

# Response:
# { "access_token": "...", "refresh_token": "...", "user": {...} }
```

**Owner:** Backend Dev (Auth)  
**Duración:** 3 días  
**Hito:** Login funciona en Postman/curl, tokens válidos

---

### 1.3 – Eliminar dependencia de Lovable (Google OAuth directo en backend)

**Contexto:** Actualmente el frontend usa `@lovable.dev/cloud-auth-js` para Google OAuth. Vamos a reemplazarlo con autenticación directa en el backend.

**Tareas:**
1. **Backend: Google OAuth endpoint**
   - Instalar `google-auth-library`
   - Endpoint `POST /api/v1/auth/google`:
     ```typescript
     // body: { idToken: string }
     // 1. Verificar token con Google API
     // 2. Extraer email, google_id, full_name
     // 3. Buscar/crear usuario en DB
     // 4. Generar JWT propio
     // 5. Retornar { access_token, refresh_token, user }
     ```
   - Manejar usuarios nuevos: crear entrada en `users` + `profiles` + asignar rol default

2. **Frontend: reemplazar Lovable**
   - Eliminar dependencia `@lovable.dev/cloud-auth-js`
   - Implementar Google OAuth directo:
     ```typescript
     // Usar Google Identity Services (gsi client)
     // Obtener idToken desde Google
     // Enviar a backend /auth/google
     // Guardar JWT del backend en localStorage
     ```
   - Actualizar `src/integrations/lovable/index.ts` → migrar a `src/services/googleAuthService.ts`
   - Actualizar `AuthPopup.tsx` para usar nueva implementación

3. **Eliminar setSession de Supabase:**
   - Remover llamada a `supabase.auth.setSession()` después de Google login
   - Frontend solo debe manejar JWT del backend NestJS

**DTOs:**
- `GoogleSignInDto` (id_token: string)
- `AuthResponseDto` (access_token, refresh_token, user, profile)

**Owner:** Backend Dev (Auth) + Frontend Dev (integración)  
**Duración:** 3-4 días  
**Hito:** Login desde frontend vía Google → backend genera JWT propio → frontend funciona sin Lovable

---

### 1.4 – Guards y decoradores de autorización

**Tareas:**
1. `JwtAuthGuard` → @UseGuards(JwtAuthGuard)
2. `RolesGuard` → @Roles('superadmin', 'encargado')
3. `BranchGuard` → verifica que user tenga acceso a branch_id del request
4. Decoradores custom:
   - `@CurrentUser()` → inyecta user del JWT
   - `@RequireBranch()` → asigna branch_id desde params
   - `@Permission(key: string)` → valida permiso específico

**Ejemplo:**
```typescript
@Post(':branchId/open-shift')
@UseGuards(JwtAuthGuard, BranchGuard)
@Roles('encargado', 'franquiciado')
async openShift(
  @CurrentUser() user: User,
  @Param('branchId') branchId: string,
  @Body() dto: OpenShiftDto
) {
  // user ya está validado, tiene acceso a branchId
}
```

**Owner:** Backend Dev (Auth)  
**Duración:** 2 días  
**Hito:** Guards funcionan, requests no autorizados devuelven 401/403

---

## 👥 Fase 2: Usuarios, Permisos y Branches

### 2.1 – Servicios de permisos

**Tareas:**
1. `PermissionsService`:
   - `getUserBrandRole(userId)` → BrandRole
   - `getUserBranchRoles(userId)` → LocalRole[]
   - `getUserPermissions(userId, branchId?)` → permission keys[]
   - `hasPermission(userId, permissionKey, branchId?)` → boolean
   - `canAccessBranch(userId, branchId)` → boolean
   - `getRolesForPermission(permissionKey)` → Role[]

2. `RolesService`:
   - CRUD roles (admin-only)
   - Assign/revoke role a usuario
   - Mapear permisos a roles

3. DTOs + responses

**Owner:** Backend Dev (Domain)  
**Duración:** 2 días  
**Hito:** Queries de permisos funcionan, guards pueden usarlos

---

### 2.2 – Endpoints de usuarios

**Tareas:**
1. `UsersController`:
   - `GET /api/v1/users/me` → perfil actual + roles
   - `PUT /api/v1/users/me` → actualizar perfil
   - `GET /api/v1/users` (admin) → listar usuarios, filtros, paginación
   - `GET /api/v1/users/:id` → detalles de usuario
   - `POST /api/v1/users` (admin) → crear usuario
   - `PUT /api/v1/users/:id` (admin) → actualizar usuario
   - `DELETE /api/v1/users/:id` (admin) → soft delete

2. `UserPasswordService`:
   - `updatePassword(userId, oldPassword, newPassword)`
   - `resetPassword(email)` → enviar email con link
   - `confirmPasswordReset(token, newPassword)`

3. DTOs: `UserProfileDto`, `UpdateProfileDto`, `UserListResponseDto`

**Owner:** Backend Dev (Domain)  
**Duración:** 3 días  
**Hito:** CRUD de usuarios funciona, permisos respetados

---

### 2.3 – Branches

**Tareas:**
1. Migración: Tabla `branches` (copiar de Supabase, sin RLS)
2. `BranchesService`:
   - CRUD branches
   - `getUserAccessibleBranches(userId)` → filtrado por permisos
   - Queries by user, by region, etc.

3. `BranchesController`:
   - `GET /api/v1/branches` → solo mis branches
   - `GET /api/v1/branches/:id` → detalles (con check de acceso)
   - `POST /api/v1/branches` (coordinador+) → crear
   - `PUT /api/v1/branches/:id` (coordinador+) → actualizar
   - `DELETE /api/v1/branches/:id` (coordinador+) → soft delete

4. DTOs: `BranchDto`, `CreateBranchDto`, `UpdateBranchDto`

**Owner:** Backend Dev (Domain)  
**Duración:** 2 días  
**Hito:** Branches CRUD funciona, filtrado por usuario

---

## 🎯 Fase 3: Migración de módulos del core

*(Una vez Fase 1 y 2 firmes)*

### 3.1 – Módulo PEDIDOS (Orders)

**Contexto:** Tablas ya existen en las 429 migraciones. Funciones SQL renombradas a inglés facilitan la integración.

**Tareas:**
1. **Reutilizar migraciones existentes:**
   - ✅ Tabla `pedidos` (orders) - esquema completo disponible
   - ✅ Tabla `pedido_items` (order_items) - con modificadores
   - ✅ Tabla `pedido_pagos` (order_payments)
   - ✅ Tabla `delivery_tracking`
   - ✅ Funciones SQL críticas ya renombradas:
     - `update_order_cogs()` → calcula CMV del pedido
     - `deduct_order_stock()` → descuenta stock automáticamente
     - `generate_order_number()` → genera número correlativo

2. **Adaptar triggers a NestJS:**
   - **Opción A (rápida):** Mantener triggers SQL temporalmente
   - **Opción B (recomendada):** Mover lógica a servicios:
     ```typescript
     // En OrderService
     async createOrder(dto) {
       // 1. Crear pedido
       // 2. Crear items
       // 3. Descontar stock (antes: trigger deduct_order_stock)
       // 4. Calcular CMV (antes: trigger update_order_cogs)
       // 5. Notificar (llamar edge function send-order-push)
     }
     ```

3. **TypeORM Entities:**
   - `Order.entity.ts` (pedidos)
   - `OrderItem.entity.ts` (pedido_items)
   - `OrderPayment.entity.ts` (pedido_pagos)
   - `DeliveryTracking.entity.ts` (delivery_tracking)

4. **OrderService:**
   - `createOrder(dto, userId, branchId)` → incluye lógica de triggers
   - `getOrder(orderId, userId)` → con validación de acceso por branch
   - `listOrders(branchId, filters)` → paginado, estado, fechas
   - `updateOrderStatus(orderId, status, userId)` → notifica cambios
   - `cancelOrder(orderId, reason, userId)` → rollback stock

5. **OrderController:**
   - `POST /api/v1/branches/:branchId/orders` → crear orden
   - `GET /api/v1/branches/:branchId/orders` → listar con filtros
   - `GET /api/v1/orders/:id` → detalles (valida acceso)
   - `PATCH /api/v1/orders/:id/status` → cambiar estado
   - `POST /api/v1/orders/:id/cancel` → cancelar

6. **Integración con edge-functions:**
   - `calculate-delivery` → llamar via fetch desde backend antes de crear orden
   - `send-order-push` → llamar después de cambio de estado
   - `webapp-order-tracking` → mantener como está (público, no necesita backend)

**DTOs:**
- `CreateOrderDto`, `UpdateOrderStatusDto`, `CancelOrderDto`
- `OrderItemDto`, `OrderPaymentDto`
- Validation con class-validator

**Owner:** Backend Dev (Core domain)  
**Duración:** 5-6 días (incluye migración de triggers)  
**Hito:** Orders CRUD funciona end-to-end, stock se descuenta correctamente

---

### 3.2 – Módulo CASH REGISTER (Caja)

**Tareas:**
1. Migraciones:
   - Tabla `cash_registers`
   - Tabla `cash_register_shifts`
   - Tabla `cash_register_movements`

2. `CashRegisterService`:
   - `openShift(branchId, userId, openingAmount)`
   - `recordMovement(shiftId, type, amount, method)`
   - `closeShift(shiftId, closingAmount, userId)`
   - `getShiftMovements(shiftId)`
   - Validaciones de RLS: usuario debe haber fichado en ese branch

3. `CashRegisterController`:
   - `POST /api/v1/branches/:branchId/cash-register/shifts` → abrir
   - `GET /api/v1/branches/:branchId/cash-register/shifts` → listar shifts
   - `POST /api/v1/cash-register/shifts/:shiftId/movements` → registrar movimiento
   - `PATCH /api/v1/cash-register/shifts/:shiftId/close` → cerrar

4. Tests

**Owner:** Backend Dev (POS domain)  
**Duración:** 4 días  
**Hito:** Apertura/cierre de caja funciona, validaciones de permisos OK

---

### 3.3 – Módulo PAYMENTS (Pagos)

**Tareas:**
1. Migraciones:
   - Tabla `payment_methods`
   - Tabla `payment_transactions`
   - MercadoPago config

2. `PaymentService`:
   - Abstracción para diferentes métodos (efectivo, MP, etc.)
   - `processPayment(orderId, method, amount)`
   - Integraciones con MP SDK

3. `PaymentController`:
   - `POST /api/v1/payments` → procesar pago
   - `GET /api/v1/payments/:id` → estado del pago
   - Webhooks para MP

**Owner:** Backend Dev (Payments)  
**Duración:** 4 días  
**Hito:** Pagos funciona, integraciones con MP OK

---

### 3.4 – Módulo DELIVERY

**Tareas:**
1. Tabla `delivery_tracking`
2. `DeliveryService`:
   - `calculateDeliveryZone(lat, lng)` → llama a edge-function (por ahora)
   - `createDeliveryTracking(orderId, token)`
   - `updateTrackingLocation(token, lat, lng)`
   - `completeDelivery(token)`

3. `DeliveryController`:
   - `GET /api/v1/delivery/track/:token` → público, sin JWT
   - `POST /api/v1/delivery/track/:token/update` → update ubicación
   - `POST /api/v1/delivery/track/:token/complete` → completar

**Owner:** Backend Dev (Delivery)  
**Duración:** 3 días  
**Hito:** Tracking funciona, coords se actualizan

---

## 🔄 Fase 4: Frontend Migration (paralela a Fase 3+)

### 4.1 – Actualizar AuthService y hooks

**Tareas:**
1. `src/services/apiClient.ts`:
   - Cliente HTTP con `fetch` o `axios`
   - Auto-attacha JWT de localStorage
   - Manejo de refresh tokens automático

2. Actualizar `src/hooks/useAuth.tsx`:
   - Login → llamar a `POST /api/v1/auth/login` (backend)
   - Signup → llamar a `POST /api/v1/auth/signup` (backend)
   - Google → frontend abre popup → backend hace Google OAuth
   - Logout → limpiar localStorage + llamar a backend

3. Actualizar `src/services/authService.ts`:
   - Reescribir para usar `apiClient` en lugar de Supabase

4. Remover `supabase` imports de auth-related

**Owner:** Frontend Dev  
**Duración:** 3 días  
**Hito:** Login desde UI funciona contra backend

---

### 4.2 – Migrar hooks de permisos

**Tareas:**
1. Reescribir `src/hooks/usePermissions.ts`:
   - En lugar de `fetchUserBrandRole()` → `GET /api/v1/users/me`
   - En lugar de `fetchUserBranchRoles()` → incluir en `/users/me`
   - Mantener la interfaz existente (`PermissionsV2`)

2. Reescribir `src/services/permissionsService.ts`:
   - Cambiar calls de Supabase a API calls al backend

**Owner:** Frontend Dev  
**Duración:** 2 días  
**Hito:** `usePermissions` funciona contra backend

---

### 4.3 – Migrar hooks de dominio (orders, cash, etc.)

**Tareas:**
1. Por cada módulo migrado en backend:
   - Reescribir el hook correspondiente
   - Cambiar calls de Supabase a API calls
   - Mantener lógica local (validación, UI state)

2. Ejemplo para `useCashRegister`:
   - `useOpenShift()` → POST `/api/v1/branches/:branchId/cash-register/shifts`
   - `useCloseShift()` → PATCH `/api/v1/cash-register/shifts/:shiftId/close`
   - Mantener los mismos DTOs y respuestas

**Owner:** Frontend Dev  
**Duración:** Depende de cuántos hooks; ~1 semana para los más críticos

---

## 🧹 Fase 5: Limpieza y deprecación

### 5.1 – Desactivar Supabase client en frontend

**Tareas:**
1. **Eliminar dependencias de Supabase:**
   - Remover `@supabase/supabase-js` del package.json
   - Remover `@lovable.dev/cloud-auth-js` del package.json
   
2. **Limpiar variables de entorno:**
   ```bash
   # Remover de .env
   VITE_SUPABASE_URL=
   VITE_SUPABASE_PUBLISHABLE_KEY=
   ```

3. **Eliminar archivos obsoletos:**
   - `src/integrations/supabase/` → mantener solo types si se reutilizan
   - `src/integrations/lovable/` → eliminar completamente
   - `src/services/supabaseClient.ts` → reemplazar con `apiClient.ts`

4. **Actualizar `src/services/apiClient.ts`:**
   ```typescript
   // Nuevo cliente HTTP usando fetch/axios
   const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
   
   export const apiClient = {
     get: (url, config) => fetch(`${API_URL}${url}`, { ...config, headers: { Authorization: `Bearer ${getToken()}` } }),
     post: (url, data, config) => fetch(`${API_URL}${url}`, { method: 'POST', body: JSON.stringify(data), ...config }),
     // ... put, patch, delete
   };
   ```

5. **Edge functions a mantener:**
   - Las 26 edge functions Deno **se mantienen** inicialmente
   - Backend NestJS puede consumirlas via fetch
   - Migración progresiva de lógica según prioridad:
     - **Mantener:** AFIP, MP webhook, tracking público
     - **Migrar:** Notificaciones, validaciones, cálculos

**Owner:** Frontend Dev + Backend Dev  
**Duración:** 2 días

---

### 5.2 – Estrategia con Edge Functions

**Opciones:**

**A) Mantener todas las edge functions (recomendado corto plazo):**
- Backend NestJS las consume via fetch cuando sea necesario
- No requiere reescritura inmediata
- Funciones públicas (tracking, delivery) siguen funcionando sin cambios

**B) Migrar progresivamente (largo plazo):**
- **Prioridad 1:** Funciones con lógica crítica (AFIP, MP webhook)
- **Prioridad 2:** Notificaciones (send-order-push, send-staff-invitation)
- **Prioridad 3:** Validaciones y cálculos (calculate-delivery)

**Implementación:**
```typescript
// backend/src/integrations/supabase-functions.service.ts
@Injectable()
export class SupabaseFunctionsService {
  async callFunction(name: string, body: any) {
    return fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
  }
}
```

**Owner:** Backend Dev (Integraciones)  
**Duración:** Incremental, según prioridad de cada función

---

### 5.3 – Desactivar RLS en base de datos

**Contexto:** Si usamos PostgreSQL puro (no Supabase managed), no hay RLS que gestionar.

**Si mantenemos Supabase como DB:**
1. Desactivar RLS en tablas críticas:
   ```sql
   ALTER TABLE users DISABLE ROW LEVEL SECURITY;
   ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
   ALTER TABLE user_role_assignments DISABLE ROW LEVEL SECURITY;
   -- ... etc
   ```
2. Backend NestJS maneja toda la autorización via Guards

**Si usamos PostgreSQL nuevo:**
- Las migraciones NO incluyen `CREATE POLICY` (se omiten)
- Solo DDL de tablas, índices y funciones SQL necesarias

**Owner:** DBA / Backend Lead  
**Duración:** 1 día (si aplica)

---

## 📊 Timeline y responsabilidades

### Resumen de fases (actualizado post-refactoring)

| Fase | Descripción | Duración | Dependencias |
|------|-------------|----------|--------------|
| **0** | Setup Docker + NestJS + PostgreSQL | 2-3 días | - |
| **1.1** | Entidades y migraciones (reutilizar 429 SQL) | 2-3 días | Fase 0 |
| **1.2** | JWT y endpoints login/register | 3 días | Fase 1.1 |
| **1.3** | Google OAuth en backend (eliminar Lovable) | 3-4 días | Fase 1.2 |
| **1.4** | Guards, decoradores y middleware | 2 días | Fase 1.3 |
| **2.1** | Servicios de permisos (RBAC completo) | 2 días | Fase 1.4 |
| **2.2** | Endpoints de usuarios CRUD | 3 días | Fase 2.1 |
| **2.3** | Endpoints de branches CRUD | 2 días | Fase 2.1 |
| **3.1** | Módulo Pedidos + migración triggers | 5-6 días | Fase 2 |
| **3.2** | Módulo Cash Register | 4 días | Fase 2 |
| **3.3** | Módulo Payments (MP integración) | 4 días | Fase 3.1 |
| **3.4** | Módulo Delivery | 3 días | Fase 3.1 |
| **4.1** | Migración hooks frontend → API calls | 5-7 días | Fase 3 |
| **5.1** | Eliminar Supabase/Lovable del frontend | 2 días | Fase 4.1 |
| **5.2** | Estrategia edge functions | Incremental | Fase 5.1 |
| **5.3** | Desactivar RLS si aplica | 1 día | Fase 5.1 |

**Total estimado:** 6-8 semanas (considerando 1 desarrollador backend + 1 frontend)

**Ventajas del refactoring previo:**
- ✅ Schema SQL ya estandarizado en inglés → menos confusión
- ✅ 429 migraciones listas → no hay que crear DDL desde cero
- ✅ Funciones SQL bien nombradas → fácil replicar en TypeScript
- ✅ RLS helpers actualizados → sabemos exactamente qué lógica portar

---

## 🎯 Priorización de módulos

### Fase 3 - Orden recomendado:

1. **Pedidos (Orders)** → Core del negocio, bloquea todo lo demás
2. **Cash Register** → POS necesita esto funcionando YA
3. **Payments** → Sin esto no se puede cobrar
4. **Delivery** → Menos crítico, puede esperar
5. **Stock** → Importante pero no bloquea operación diaria
6. **Reports (RDO)** → Último, consume datos de otros módulos

### Fase 4 - Frontend:

- Prioridad: hooks de auth, pedidos, caja
- Secundario: reports, configuraciones
- Último: módulos administrativos (coaching, meetings, etc.)

---

## ✅ Checklist de validación

### Por cada módulo migrado:

- [ ] Migraciones SQL aplicadas correctamente
- [ ] Entities TypeORM creadas con relaciones
- [ ] Service con CRUD completo
- [ ] Controller con endpoints documentados (Swagger)
- [ ] Guards aplicados correctamente
- [ ] DTOs validados con class-validator
- [ ] Tests unitarios ✅
- [ ] Tests de integración ✅
- [ ] Frontend hook migrado
- [ ] Documentación actualizada

---

## 📝 Notas finales

**Ventajas del nuevo contexto (Marzo 2026):**
1. Schema estandarizado → menos refactoring durante migración
2. Funciones SQL claras → sabemos qué replicar en NestJS
3. Edge functions estables → pueden coexistir con backend
4. Permisos modernos → RBAC limpio para implementar

**Riesgos mitigados:**
1. ✅ Triggers identificados → plan claro para migrarlos
2. ✅ RLS helpers mapeados → sabemos qué Guards necesitamos
3. ✅ Edge functions catalogadas → estrategia de coexistencia definida

**Estado:** ✅ **Roadmap actualizado y listo para ejecución**
┌────────────┬─────────────────────────────┬──────────────┐
│ Fase       │ Duración aproximada         │ Owner(s)     │
├────────────┼─────────────────────────────┼──────────────┤
│ 0 - Prep   │ 2-3 días                    │ Arch/DevOps  │
│ 1 - Auth   │ 10-12 días                  │ Backend Lead │
│ 2 - Users  │ 7-8 días                    │ Backend      │
│ 3 - Core   │ 20 días (paralelo con 4)    │ Backend      │
│ 4 - Frontend│ 10-15 días (paralelo con 3)│ Frontend     │
│ 5 - Cleanup│ 3 días                      │ Full team    │
├────────────┼─────────────────────────────┼──────────────┤
│ TOTAL      │ ~4 semanas (paralelo)       │ Full team    │
└────────────┴─────────────────────────────┴──────────────┘
```

**Timeline secuencial (si no hay paralelismo):**  
~6-7 semanas

---

## ✅ Checklist de hitos

- [ ] **Fase 0:** Docker compose up → DB + backend + frontend local
- [ ] **Fase 1.1:** Migraciones y seeds funcionan
- [ ] **Fase 1.2:** Login endpoint funciona en Postman
- [ ] **Fase 1.3:** Frontend llama a backend para login, JWT guardado
- [ ] **Fase 1.4:** Guards validan JWT y permisos
- [ ] **Fase 2.1-2.3:** Usuarios, roles, branches CRUD OK
- [ ] **Fase 3.1-3.4:** Módulos core migrando, tests passing
- [ ] **Fase 4.1-4.3:** Frontend completamente desacoplado de Supabase
- [ ] **Fase 5:** Zero imports de `@supabase/*` en frontend
- [ ] **Testing:** E2E contra backend funciona

---

## 🚨 Riesgos y mitigación

| Riesgo | Mitigación |
|--------|-----------|
| Pérdida de datos en migración | Backup de Supabase antes de empezar, tests de data integrity |
| Edge-functions quebradas | Mantenerlas en paralelo, testing exhaustivo antes de desactivar |
| Permisos no traducidos correctamente | Auditoría detallada de RLS, tests de autorización por caso de uso |
| Performance del backend | Índices en DB, caching, benchmarks tempranos |
| Downtime durante switch | Canary deployment, feature flags para nuevo backend |

---

## 📝 Documentación obligatoria

1. **README.md** del backend con setup local
2. **API.md** con documentos OpenAPI 3.0 de todos los endpoints
3. **ARCHITECTURE.md** explicando módulos y patrones
4. **MIGRATION.md** con instrucciones paso a paso
5. **TROUBLESHOOTING.md** para problemas comunes

---

**Status:** ✅ Roadmap listo para ejecución.
