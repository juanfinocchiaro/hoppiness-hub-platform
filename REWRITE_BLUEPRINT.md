# REWRITE BLUEPRINT — Hoppiness Hub Platform

---

## 1. Resumen Ejecutivo

### Qué hace la app (en 10 líneas)

Hoppiness Hub es una plataforma SaaS integral para la gestión de una red de franquicias gastronómicas. Abarca **cuatro grandes áreas funcionales**:

1. **Webapp pública de pedidos**: catálogo digital, carrito, checkout con MercadoPago, tracking en tiempo real, delivery y takeaway.
2. **POS (Point of Sale)**: sistema de caja con gestión de turnos, impresión ESC/POS, cocina (KDS), pagos, cierres de caja y facturación electrónica AFIP.
3. **Panel de Local (Mi Local)**: gestión de equipo (fichajes, horarios, licencias, coaching, reuniones, apercibimientos), finanzas (proveedores, compras, gastos, P&L, RDO), configuración de sucursal y delivery.
4. **Panel de Marca (Mi Marca)**: administración centralizada de la red: usuarios, locales, carta/menú, centro de costos, precios por canal, supervisiones, comunicados, informes y auditoría.

Complementariamente ofrece un portal de empleados (**Mi Cuenta/Mi Trabajo**) para ver horarios, fichajes, coachings, solicitudes y comunicados.

### Problema principal hoy

La aplicación es un **monolito frontend masivo** (~677 archivos en `src/`) sin backend propio. Toda la lógica de negocio está dispersa entre servicios frontend, hooks, componentes sobredimensionados y funciones SQL en PostgreSQL/Supabase. No existe separación real entre dominios, lo que genera:

- **Acoplamiento extremo**: un cambio en el modelo de pedidos puede romper el POS, la webapp, los cierres de caja y la facturación simultáneamente.
- **Deuda técnica severa**: 47 componentes > 300 líneas, ~40+ archivos con `any`, violaciones sistemáticas de la arquitectura declarada en `.cursorrules`.
- **Testeo casi nulo**: solo 3 archivos de test unitario; cero tests de integración, e2e o de Edge Functions.
- **Seguridad frágil**: 7 Edge Functions con `verify_jwt = false`, secretos sin protección clara, RLS como única barrera.

### Riesgos críticos

| # | Riesgo | Impacto | Probabilidad |
|---|--------|---------|--------------|
| 1 | **Inyección / escalamiento de privilegios** vía Edge Functions sin JWT | Datos comprometidos, operaciones no autorizadas | Alta |
| 2 | **Regresiones silenciosas** por ausencia de tests | Pérdida de ventas, errores de facturación | Alta |
| 3 | **Imposibilidad de escalar** equipo: onboarding lento, riesgo de romper cosas | Velocidad de desarrollo < 50% potencial | Alta |
| 4 | **Vendor lock-in** total con Supabase (auth, DB, storage, functions, realtime) | Sin path de migración viable hoy | Media |
| 5 | **Datos fiscales inconsistentes** si falla la lógica dispersa de AFIP/facturación | Problemas legales / AFIP | Media |

### Recomendación

**Refactor incremental con arquitectura target** (Strangler Fig Pattern).

Justificación: un rewrite total sería de alto riesgo dado que la app está en producción con múltiples locales activos. El approach recomendado es:

1. Establecer la arquitectura target (módulos, contratos, tests).
2. Migrar dominio por dominio detrás de feature flags.
3. Cada módulo migrado debe pasar por una fase de paridad funcional antes de reemplazar al código viejo.

Tiempo estimado: **6-9 meses** con un equipo de 3-4 devs.

---

## 2. Mapa del Sistema (As-Is)

### Arquitectura actual (diagrama en texto)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           BROWSER (SPA)                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │  Webapp   │  │   POS    │  │ Mi Local │  │ Mi Marca │  │Mi Cuenta│ │
│  │  Pedidos  │  │  Caja    │  │  Panel   │  │  Admin   │  │  Staff  │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬────┘ │
│       │              │              │              │              │     │
│  ┌────┴──────────────┴──────────────┴──────────────┴──────────────┴──┐ │
│  │                      src/services/ (34 files)                     │ │
│  │              Supabase client → DB queries, RPCs                    │ │
│  └──────────────────────────────┬────────────────────────────────────┘ │
└─────────────────────────────────┼───────────────────────────────────────┘
                                  │ HTTPS
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          SUPABASE CLOUD                                │
│  ┌──────────────────┐  ┌──────────────┐  ┌────────────────────────┐   │
│  │   PostgreSQL      │  │    Auth      │  │   Edge Functions (26)  │   │
│  │   113 tables      │  │   JWT/OAuth  │  │   Deno runtime         │   │
│  │   10 views        │  │   RLS        │  │   AFIP, MP, delivery,  │   │
│  │   22+ RPCs        │  │              │  │   clock, push, print   │   │
│  │   405 migrations  │  │              │  │                        │   │
│  └──────────────────┘  └──────────────┘  └────────────────────────┘   │
│  ┌──────────────────┐  ┌──────────────┐                               │
│  │   Storage         │  │   Realtime   │                               │
│  │   (fotos fichaje) │  │   (pedidos)  │                               │
│  └──────────────────┘  └──────────────┘                               │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼              ▼
              ┌──────────┐ ┌──────────┐  ┌──────────────┐
              │MercadoPago│ │  AFIP    │  │ Google Maps  │
              │  API      │ │  WSFE    │  │ Geocoding    │
              └──────────┘ └──────────┘  └──────────────┘
```

### Módulos/paquetes principales y su responsabilidad

| Módulo | Path | Responsabilidad | Archivos |
|--------|------|-----------------|----------|
| **Webapp** | `src/components/webapp/`, `src/pages/webapp/` | Pedidos online, carrito, checkout, tracking, chat | ~25 componentes |
| **POS** | `src/components/pos/`, `src/pages/pos/` | Caja, pedidos presenciales, pagos, cocina, stock | ~20 componentes |
| **HR/Tiempo** | `src/components/hr/`, `src/hooks/useClock*.ts`, `src/lib/timeEngine.ts` | Fichajes, horarios, liquidación, licencias, adelantos | ~15 hooks, 1 engine |
| **Finanzas** | `src/components/finanzas/`, `src/components/rdo/` | Proveedores, compras, gastos, RDO, P&L, inversiones | ~15 componentes |
| **Admin/Marca** | `src/components/admin/`, `src/pages/admin/` | Gestión centralizada: locales, usuarios, carta, coaching | ~25 páginas |
| **Local** | `src/components/local/`, `src/pages/local/` | Panel de sucursal: dashboard, equipo, ventas, config | ~30 páginas |
| **Menu/Carta** | `src/components/menu/`, `src/components/centro-costos/` | Productos, categorías, modificadores, recetas, costos | ~10 componentes |
| **Auth** | `src/components/auth/`, `src/hooks/useAuth.tsx` | Login, registro, Google OAuth, guards | ~5 archivos |
| **Landing** | `src/components/landing/` | Página pública, franquicias, contacto | ~10 componentes |
| **Coaching** | `src/components/coaching/` | Evaluaciones, competencias, certificaciones | ~8 componentes |
| **Reuniones** | `src/components/meetings/` | Reuniones, actas, acuerdos | ~5 componentes |
| **Supervisiones** | `src/components/inspections/` | Inspecciones a locales con templates | ~5 componentes |
| **Delivery** | Edge Functions + `src/services/deliveryService.ts` | Zonas, pricing, tracking GPS | ~3 archivos |
| **Fiscal** | Edge Functions + `src/services/fiscalService.ts` | AFIP facturación electrónica | ~3 archivos |
| **Impresión** | `src/services/printingService.ts`, `src/hooks/usePrinting.ts` | ESC/POS vía Print Bridge local | ~3 archivos |

### Dependencias internas (qué llama a qué)

```
Pages → Components → Hooks → Services → supabaseClient → Supabase
                                 ↓
                           lib/ (timeEngine, formatters, errorHandler)
                                 ↓
                           types/ (DB types, domain types)
```

**Violaciones detectadas** (flujo ascendente):

| Violación | Archivo |
|-----------|---------|
| Page importa supabase | `src/pages/local/ClockInsPage.tsx` |
| Component importa supabase | `src/components/centro-costos/AsignadosSection.tsx` |
| Hook importa supabase | `src/hooks/useIsClockedInAtBranch.ts`, `src/hooks/useFichajeDetalle.ts` |

### Dependencias externas (APIs, SDKs, servicios)

| Servicio | Uso | Integración |
|----------|-----|-------------|
| **Supabase** | DB, Auth, Storage, Realtime, Edge Functions | `@supabase/supabase-js` |
| **MercadoPago** | Pagos online, Point (POS físico), webhooks | Edge Functions (6) |
| **AFIP (WSFE)** | Facturación electrónica argentina | Edge Functions (3), `node-forge` para certificados |
| **Google Maps** | Geocoding, autocompletado, cálculo de distancia | `@react-google-maps/api`, Edge Function |
| **Sentry** | Error monitoring, session replay | `@sentry/react` |
| **Cloudflare Turnstile** | CAPTCHA anti-bot en login | Widget en frontend |
| **Web Push (VAPID)** | Notificaciones push a navegadores | Edge Function + `push_subscriptions` |
| **Lovable** | Cloud auth, tagger (dev) | `@lovable.dev/cloud-auth-js`, `lovable-tagger` |

### Puntos de acoplamiento fuerte

1. **`src/integrations/supabase/types.ts`**: Archivo generado de ~10K+ líneas que tipifica las 113 tablas. Cualquier cambio en DB requiere regenerar y puede romper docenas de archivos.
2. **`src/services/index.ts`**: Barrel con `@ts-nocheck` y exports duplicados. Un import puede traer todo el tree de servicios.
3. **`posService.ts` ↔ `fiscalService.ts` ↔ `printingService.ts`**: El flujo de venta toca 3 servicios, hooks del POS, y Edge Functions simultáneamente.
4. **`timeEngine.ts` ↔ `hrService.ts` ↔ `schedulesService.ts`**: La lógica de tiempo laboral está partida entre lib, 2 servicios y ~15 hooks.
5. **`pedidos` tabla**: Usada por webapp, POS, delivery, cocina, facturación, analytics y cierres de caja.

---

## 3. Dominio y Reglas de Negocio

### Entidades principales (modelo mental)

```
Brand (marca)
  └── Branch (sucursal/local)
        ├── Employee (empleado)
        │     ├── ClockEntry (fichaje)
        │     ├── Schedule (horario)
        │     ├── ScheduleRequest (solicitud: licencia, vacación, franco)
        │     ├── Coaching (evaluación)
        │     └── Warning (apercibimiento)
        ├── Pedido (order)
        │     ├── PedidoItem (línea de pedido)
        │     │     └── PedidoItemModificador
        │     └── PedidoPago (pago)
        ├── CashRegister (caja registradora)
        │     └── CashRegisterShift (turno de caja)
        │           └── CashRegisterMovement (movimiento)
        ├── ShiftClosure (cierre de turno)
        ├── DeliveryZone (zona de delivery)
        ├── Proveedor (supplier)
        │     └── Compra / FacturaProveedor / PagoProveedor
        ├── AfipConfig (config de facturación)
        ├── MercadoPagoConfig
        └── WebappConfig
        
ItemCarta (item de menú)
  ├── ItemModificador
  ├── ItemRemovible
  ├── ItemExtra
  ├── GrupoOpcional → GrupoOpcionalItem
  └── ItemCartaComposicion → Insumo / Preparación

Profile (usuario)
  ├── UserRoleV2 (rol a nivel marca)
  └── UserBranchRole (rol por sucursal)
```

### Flujos críticos (happy path + edge cases)

#### Flujo 1: Pedido desde Webapp
1. Cliente entra a `/pedir/:branchSlug` → carga menú público (`webapp_menu_items` view)
2. Arma carrito → selecciona modificadores/extras → checkout
3. Si delivery: ingresa dirección → `calculate-delivery` Edge Function → costo/disponibilidad
4. Pago: MercadoPago (`mp-checkout` Edge Function) o efectivo
5. `create-webapp-order` Edge Function: inserta pedido + items + pagos, genera número de día
6. Tracking en tiempo real: `webapp-order-tracking` + Realtime subscription
7. **Edge cases**: local cerrado, producto sin stock, zona fuera de cobertura, pago rechazado, pedido cancelado post-confirmación

#### Flujo 2: Venta en POS
1. Cajero abre turno de caja → `CashRegisterShift`
2. Selecciona productos del grid → modificadores → total
3. Pago (efectivo, tarjeta, MercadoPago Point, split payment)
4. Si corresponde: facturación AFIP (`emitir-factura` Edge Function)
5. Impresión de ticket (`print-to-network` Edge Function o Print Bridge local)
6. Cierre de turno → reconciliación de caja vs ventas
7. **Edge cases**: descuento/promoción, devolución, nota de crédito, discrepancia de caja

#### Flujo 3: Fichaje de empleado
1. Empleado va a `/fichaje/:branchCode` → ingresa PIN
2. `register-clock-entry` Edge Function: valida PIN, determina si es clock_in/clock_out, escribe `clock_entries` y actualiza `employee_time_state`
3. `timeEngine.ts`: parea entradas, calcula horas, overtime (CCT 329/00)
4. Liquidación mensual: resumen laboral, presentismo, horas extra, adelantos
5. **Edge cases**: turno nocturno (cruza medianoche), olvido de fichaje, corrección manual, doble fichaje, reconciliación de turnos stale (`reconcile-stale-shifts`)

#### Flujo 4: Facturación AFIP
1. Se genera pedido/venta con total
2. Edge Function `emitir-factura`: conecta con WSFE, envía datos, obtiene CAE
3. Se guarda en `facturas_emitidas` con número de comprobante
4. Nota de crédito: `emitir-nota-credito` reversa la factura
5. **Edge cases**: AFIP caído, certificado vencido, número de factura desincronizado

### Reglas de negocio detectadas (y dónde viven)

| Regla | Ubicación | Problema |
|-------|-----------|----------|
| Cálculo de horas extra según CCT 329/00 | `src/lib/timeEngine.ts` | Correcto, bien aislado |
| Fecha operativa (turno nocturno = día anterior) | `src/lib/operationalDate.ts` | Correcto, bien aislado |
| Reglas de facturación (cuándo facturar, tipo A/B/C) | `src/lib/invoicing-rules.ts` | Parcialmente aislado |
| Cálculo de delivery (distancia, precio por zona) | `calculate-delivery` Edge Function + `delivery_pricing_config` | Disperso |
| Lógica de permisos por rol | `src/services/permissionsService.ts` + RLS + guards | Disperso en 3 capas |
| Promociones y descuentos | `src/hooks/usePromociones.ts` + `promociones` table | Parcialmente en hooks |
| Número de pedido por día | `generar_numero_pedido` RPC (PostgreSQL function) | Bien aislado en DB |
| Validación de PIN de fichaje | `validate_clock_pin_v2` RPC | Bien aislado en DB |
| Cierre de caja / reconciliación | `src/pages/local/CierreTurnoPage.tsx` (1 page monolítica) | Lógica de negocio en page |
| Cálculo de costos de recetas | `recalcular_costo_preparacion` / `recalcular_costo_item_carta` RPCs | Bien aislado en DB |

---

## 4. Datos

### Base/s utilizada/s

**PostgreSQL** vía Supabase Cloud. Proyecto: `diolgjqstduyvilmrtng`.

#### Tablas más importantes (113 total + 10 views)

| Tabla | Rows estimados | Función |
|-------|---------------|---------|
| `pedidos` | Core | Todos los pedidos (POS + webapp) |
| `pedido_items` | Core | Líneas de pedido |
| `pedido_pagos` | Core | Pagos por pedido |
| `clock_entries` | Core | Fichajes de empleados |
| `employee_time_state` | Core | Estado actual (working/not_working) |
| `employee_schedules` | Core | Horarios asignados |
| `branches` | Config | Sucursales de la red |
| `profiles` | Auth | Perfiles de usuario |
| `user_roles_v2` | Auth | Roles a nivel marca |
| `user_branch_roles` | Auth | Roles por sucursal |
| `items_carta` | Catálogo | Items del menú |
| `menu_categorias` | Catálogo | Categorías del menú |
| `facturas_emitidas` | Fiscal | Facturas AFIP |
| `proveedores` | Finanzas | Proveedores |
| `gastos` | Finanzas | Gastos operativos |
| `cash_register_shifts` | POS | Turnos de caja |
| `delivery_zones` | Delivery | Zonas de cobertura |
| `promociones` | Comercial | Promociones activas |
| `coachings` | HR | Evaluaciones de performance |
| `meetings` | HR | Reuniones de red |
| `warnings` | HR | Apercibimientos |

#### Views principales

| Vista | Uso |
|-------|-----|
| `webapp_menu_items` | Menú público para webapp |
| `branches_public` | Info pública de sucursales |
| `cuenta_corriente_proveedores` | Saldo con proveedores |
| `rdo_report_data` | Datos para resultado operativo |
| `v_menu_costos` | Costos calculados del menú |

### Integridad, relaciones, migrations

- **405 migrations** en `supabase/migrations/` con naming `YYYYMMDDHHMMSS_description.sql`
- **RLS activo** en tablas sensibles (`clock_entries`, `pedidos`, etc.)
- **RPCs (22+)** para operaciones que requieren lógica server-side o SECURITY DEFINER
- **No hay seeds**: no existe `seed.sql` ni datos de prueba automatizados
- **No hay rollback strategy**: las migrations son forward-only, sin `down` migrations

### Problemas de consistencia / duplicación / deuda

| Problema | Evidencia |
|----------|-----------|
| **`@ts-nocheck` en barrel** | `src/services/index.ts` tiene `@ts-nocheck` para ocultar exports duplicados |
| **Tipos `as any` masivos** | `hrService.ts` castea tablas no-tipadas como `'employee_time_state' as any`, `'labor_config' as any` |
| **fromUntyped() workaround** | `src/lib/supabase-helpers.ts` permite queries a tablas no incluidas en types.ts |
| **DB docs desactualizadas** | `docs/DATABASE.md` solo documenta 5 tablas de las 113 existentes |
| **Modelo dual viejo/nuevo** | Feature flags `VITE_TIME_ENGINE_V2_ENABLED` y `VITE_TIME_PARITY_LOG_ENABLED` sugieren motor de tiempo en transición |
| **No hay FK documentation** | Las relaciones entre tablas no están documentadas; dependen de naming conventions |

---

## 5. Backend

### Endpoints/handlers principales

El backend son **26 Edge Functions** en Deno (`supabase/functions/*/index.ts`):

| Función | Método | Auth | Dominio |
|---------|--------|------|---------|
| `register-clock-entry` | POST | PIN (no JWT) | HR/Fichaje |
| `reconcile-stale-shifts` | POST | Service role | HR/Cron |
| `create-webapp-order` | POST | Optional Bearer | Pedidos |
| `webapp-order-tracking` | GET | Público | Tracking |
| `webapp-pedido-chat` | POST | No JWT | Chat |
| `calculate-delivery` | POST | No JWT | Delivery |
| `delivery-tracking` | POST/GET | — | Delivery |
| `mp-checkout` | POST | Bearer | Pagos |
| `mp-webhook` | POST | Firma MP | Pagos |
| `mp-point-payment` | POST | — | POS Pagos |
| `mp-point-setup` | POST | — | POS Config |
| `mp-point-devices` | GET | — | POS Config |
| `mp-test-connection` | POST | — | POS Config |
| `emitir-factura` | POST | Bearer | Fiscal |
| `emitir-nota-credito` | POST | — | Fiscal |
| `probar-conexion-afip` | POST | — | Fiscal |
| `print-to-network` | POST | Bearer | Impresión |
| `link-guest-orders` | POST | Bearer | Onboarding |
| `send-order-push` | POST | No JWT | Notificaciones |
| `google-maps-key` | GET | Bearer | Maps |
| `send-staff-invitation` | POST | — | HR |
| `send-schedule-notification` | POST | — | HR |
| `send-warning-notification` | POST | — | HR |
| `send-meeting-notification` | POST | — | Reuniones |
| `send-meeting-minutes-notification` | POST | — | Reuniones |
| `contact-notification` | POST | — | Contacto |

### Servicios, repositorios, patrones usados

- **No hay repositorio layer**: los servicios acceden directamente a `supabase.from('table')`.
- **Patrón**: Service → `supabase.from().select/insert/update/delete` o `supabase.rpc()`.
- **No hay DTOs**: las funciones devuelven directamente los objetos de Supabase o transformaciones ad-hoc.
- **No hay validación de input** en servicios frontend: la validación es reactiva (Zod en algunos formularios, manual en otros).

### Autenticación y autorización

| Capa | Mecanismo |
|------|-----------|
| **Frontend** | `AuthProvider` con Supabase Auth (email/password + Google OAuth) |
| **Route guards** | `RequireAuth`, `AdminRoute`, `LocalRoute`, `RequireQRAccess` |
| **DB** | Row Level Security (RLS) en tablas sensibles |
| **Edge Functions** | Mix: algunas validan Bearer token, otras tienen `verify_jwt = false` |
| **Roles** | `superadmin`, `coordinador`, `informes`, `contador_marca`, `community_manager`, `franquiciado`, `encargado`, `contador_local`, `cajero`, `empleado`, `guest` |

**Problema de seguridad**: 7 Edge Functions con `verify_jwt = false` en `supabase/config.toml`. Algunas son legítimas (webhook, fichaje por PIN) pero otras como `webapp-pedido-chat` y `send-order-push` podrían ser abusadas.

### Manejo de errores y logging

- **Error handler centralizado**: `src/lib/errorHandler.ts` — `handleError()`, `withErrorHandling()`, `devLog()`, `devWarn()`
- **Error Boundary**: `src/components/ErrorBoundary.tsx` con reporte a Sentry
- **Sentry**: `Sentry.init()` en `main.tsx` si `VITE_SENTRY_DSN` está configurado
- **Problema**: `console.log/error` dispersos en toda la codebase sin estructura; no hay logging estructurado ni correlación de errores

---

## 6. Frontend

### Estructura de UI

| Capa | Componentes |
|------|-------------|
| **Layout** | `PublicLayout`, `WorkShell`, `BranchLayout`, `BrandLayout`, `CuentaLayout` |
| **Sidebar** | `LocalSidebar`, `BrandSidebar`, `CuentaSidebar` (comparten `WorkSidebar`) |
| **UI primitives** | ~50 componentes shadcn/Radix en `src/components/ui/` |
| **Feature components** | ~365 archivos en `src/components/` organizados por dominio |
| **Pages** | ~117 archivos en `src/pages/` con lazy loading |

### Estado (state management)

| Tipo | Herramienta | Uso |
|------|------------|-----|
| **Server state** | TanStack React Query | Todas las queries/mutations a Supabase |
| **Auth state** | React Context (`AuthProvider`) | user, session, loading |
| **UI state** | React Context (4 providers) | Impersonation, AuthModal, AccountSheets, EmployeePanel |
| **Local state** | `useState` / `useReducer` | Formularios, modales, toggles |

**No hay store global** (no Redux, Zustand, Jotai). Esto es adecuado dado el uso de React Query, pero genera prop drilling en áreas complejas como POS.

### Flujos de navegación

```
/                          → Landing (público)
/ingresar                  → Login → redirect según rol:
                              → /cuenta (empleado)
                              → /milocal/:branchId (encargado/cajero)
                              → /mimarca (admin/superadmin)
/pedir                     → Selector de local → /pedir/:branchSlug
/pedir/:branchSlug         → Menú → Carrito → Checkout → /pedido/:trackingCode
/milocal/:branchId/*       → Panel local (equipo, ventas, finanzas, config)
/mimarca/*                 → Panel marca (locales, usuarios, carta, informes)
/cuenta/*                  → Mi Trabajo (horario, fichajes, coachings)
/fichaje/:branchCode       → Fichaje por PIN (empleados)
```

### Problemas de performance / UX técnicos

| Problema | Impacto | Evidencia |
|----------|---------|-----------|
| **Bundle size**: todo en un SPA con 365 componentes | First load lento, especialmente en móvil | Sin análisis de bundle; POS y Webapp comparten código |
| **47 componentes > 300 líneas** | Rerenders innecesarios, difícil de mantener | `InlineScheduleEditor.tsx`: 1,436 líneas |
| **No hay virtualización** en listas grandes | Lags en tablas de equipo, pedidos, fichajes | OrderHistoryTable, TeamTable sin windowing |
| **Lazy loading parcial** | 4 páginas eagerly loaded, el resto lazy | `Index`, `Ingresar`, `Pedir`, `NotFound` se cargan siempre |
| **Sin code splitting por dominio** | POS, Webapp, Admin comparten el mismo chunk principal | Falta route-based splitting efectivo |
| **QueryClient global sin tuning por dominio** | `staleTime: 30s` genérico para todo | Datos de menú (estables) y pedidos (volátiles) tienen el mismo TTL |
| **PWA con SW básico** | `sw.js` en `/public/` sin estrategia de cache definida | Service worker mínimo |

---

## 7. Infra / DevOps

### Cómo se deploya hoy

| Componente | Deploy | Método |
|------------|--------|--------|
| **Frontend** | Vercel o Netlify (documentado, sin config file) | Auto-deploy on push to `main` |
| **Database** | Supabase Cloud | `supabase db push` (manual) |
| **Edge Functions** | Supabase Cloud | `supabase functions deploy` (manual) |
| **Migrations** | Supabase Cloud | `supabase db push` aplica las 405 migrations |

**No hay Dockerfile**, **no hay docker-compose**, **no hay IaC** (Terraform/CloudFormation).

### Entornos (dev/stage/prod)

| Entorno | Estado |
|---------|--------|
| **Local (dev)** | `npm run dev` → Vite en puerto 8080, apunta a Supabase cloud |
| **Staging** | Desconocido / requiere verificación — no hay evidencia de un entorno staging |
| **Producción** | Supabase proyecto `diolgjqstduyvilmrtng` + Vercel/Netlify |

**Problema crítico**: no hay entorno de staging. Los cambios de DB se aplican directamente a producción con `supabase db push`.

### Variables de entorno y secretos

| Variable | Tipo | Dónde |
|----------|------|-------|
| `VITE_SUPABASE_URL` | Frontend | `.env` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Frontend | `.env` |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend/CI | Secrets (no en repo) |
| `AFIP_CUIT`, `AFIP_CERT_BASE64`, `AFIP_KEY_BASE64` | Edge Functions | Supabase secrets |
| `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY` | Edge Functions | Supabase secrets |
| `VITE_SENTRY_DSN` | Frontend | `.env` (opcional) |
| `VITE_VAPID_PUBLIC_KEY` | Frontend | `.env` (opcional) |
| `VITE_TURNSTILE_SITE_KEY` | Frontend | `.env` (opcional) |

**Problema**: `.env` no está en `.gitignore`. El archivo actual contiene el project ID y la anon key (que son públicos, pero la práctica es mala).

### Observabilidad (logs/metrics/traces)

| Herramienta | Estado |
|-------------|--------|
| **Sentry** | Configurado para errores y session replay (si DSN presente) |
| **Logs estructurados** | No existen; `console.log` disperso |
| **Métricas** | No hay métricas de negocio ni de performance |
| **Traces** | Sentry traces (`tracesSampleRate`) — valor no verificado |
| **Time parity logging** | `src/lib/timeObservability.ts` — logging específico para migración de time engine |
| **Alertas** | No hay sistema de alertas configurado |

---

## 8. Calidad

### Testing actual

| Tipo | Framework | Archivos | Cobertura |
|------|-----------|----------|-----------|
| **Unit** | Vitest + jsdom | 3 archivos | `timeEngine`, `invoicing-rules`, `operationalDate` |
| **Integration** | — | 0 | — |
| **E2E** | — | 0 | — |
| **Edge Functions** | — | 0 | — |
| **Visual/Snapshot** | — | 0 | — |

### Cobertura aproximada / faltantes

**Cobertura estimada: < 2%** del codebase.

| Área | Tests | Estado |
|------|-------|--------|
| Time engine (cálculos laborales) | 4 suites | Cubierto |
| Reglas de facturación | 1 suite | Cubierto |
| Fecha operativa | 1 suite | Cubierto |
| Services (34 archivos) | 0 | SIN COBERTURA |
| Hooks (115 archivos) | 0 | SIN COBERTURA |
| Components (365 archivos) | 0 | SIN COBERTURA |
| Pages (117 archivos) | 0 | SIN COBERTURA |
| Edge Functions (26) | 0 | SIN COBERTURA |
| Guards / Auth | 0 | SIN COBERTURA |

### Deuda técnica priorizada (Top 20)

| # | Deuda | Severidad | Archivos afectados |
|---|-------|-----------|-------------------|
| 1 | Componentes > 300 líneas (47 archivos) | Alta | `InlineScheduleEditor.tsx` (1436), `CartSheet.tsx` (1083), etc. |
| 2 | Uso de `any` (~40+ archivos) | Alta | `hrService.ts`, `rdoService.ts`, `posService.ts`, `POSPage.tsx` |
| 3 | `@ts-nocheck` en barrel de servicios | Alta | `src/services/index.ts` |
| 4 | Tablas no tipadas (workaround `as any` y `fromUntyped`) | Alta | `hrService.ts`, `rdoService.ts` |
| 5 | Ausencia total de tests (< 2% cobertura) | Crítica | Todo el codebase |
| 6 | Edge Functions sin JWT verification | Alta | 7 funciones en `config.toml` |
| 7 | No hay entorno de staging | Alta | Infra |
| 8 | `.env` no está en `.gitignore` | Media | `.gitignore` |
| 9 | Violaciones de jerarquía de capas | Media | 4 archivos detectados |
| 10 | No hay validación de input centralizada | Media | Servicios y Edge Functions |
| 11 | Console.log disperso sin logging estructurado | Media | Todo el codebase |
| 12 | Sin code splitting por dominio | Media | `App.tsx`, Vite config |
| 13 | `supabaseClient.ts` con fallback hardcoded a URL de producción | Alta | `src/services/supabaseClient.ts` |
| 14 | QueryClient con staleTime genérico (30s) | Baja | `App.tsx` |
| 15 | Lógica de negocio en páginas | Media | `CierreTurnoPage.tsx`, `POSPage.tsx` |
| 16 | Sin seeds ni datos de prueba | Media | `supabase/` |
| 17 | DB docs desactualizadas (5/113 tablas) | Baja | `docs/DATABASE.md` |
| 18 | Sin down migrations (rollback) | Media | `supabase/migrations/` |
| 19 | `.cursorrules` sin completar Sección 1 | Baja | `.cursorrules` |
| 20 | PWA sin estrategia de cache | Baja | `public/sw.js` |

---

## 9. Problemas Detectados (con severidad)

### P0 — Críticos (bloquean el negocio si fallan)

| # | Problema | Impacto | Evidencia |
|---|----------|---------|-----------|
| P0-1 | **Sin tests en flujos de facturación AFIP** | Factura mal emitida = problema legal; sin forma de validar antes de deploy | `supabase/functions/emitir-factura/`, `src/services/fiscalService.ts` |
| P0-2 | **Sin tests en cálculo de horas/liquidación** (solo unit del engine) | Error = empleados mal pagados | `src/hooks/usePayrollReport.ts`, `src/hooks/useLaborHours.ts` |
| P0-3 | **Supabase client con URL hardcoded de producción como fallback** | Dev puede escribir en producción sin darse cuenta | `src/services/supabaseClient.ts` línea con fallback URL |
| P0-4 | **7 Edge Functions sin verify_jwt** | Endpoints públicos que pueden ser llamados por cualquiera | `supabase/config.toml` |

### P1 — Altos (degradan significativamente la experiencia o el desarrollo)

| # | Problema | Impacto | Evidencia |
|---|----------|---------|-----------|
| P1-1 | **No hay staging** | Todo cambio de DB va directo a prod | Ausencia de `supabase/config.toml` con staging project |
| P1-2 | **47 componentes > 300 líneas** | Velocidad de desarrollo baja, bugs frecuentes | `src/components/hr/InlineScheduleEditor.tsx` (1436 LOC) |
| P1-3 | **~40 archivos con `any`** | Type safety nula en áreas críticas (HR, POS, RDO) | `src/services/hrService.ts`, `src/pages/pos/POSPage.tsx` |
| P1-4 | **Services barrel con `@ts-nocheck`** | Errores de tipo silenciados, exports duplicados | `src/services/index.ts` |
| P1-5 | **Lógica de negocio en pages/components** | Imposible testear, difícil reutilizar | `CierreTurnoPage.tsx`, `POSPage.tsx` |
| P1-6 | **Sin logging estructurado** | Debugging en producción es a ciegas | Disperso en todo el codebase |

### P2 — Medios (mejora de calidad de vida del equipo)

| # | Problema | Impacto | Evidencia |
|---|----------|---------|-----------|
| P2-1 | `.env` sin gitignore | Secretos podrían filtrarse (hoy solo anon key) | `.gitignore` |
| P2-2 | `.cursorrules` Sección 1 sin completar | AI assistant no tiene contexto del stack | `.cursorrules` líneas 20, 35, 42, 47 |
| P2-3 | Sin virtualización en listas | UX degradada con muchos registros | Tablas de equipo, pedidos |
| P2-4 | QueryClient sin tuning por dominio | Refetches innecesarios o datos stale | `App.tsx` |
| P2-5 | DB docs solo cubren 5 tablas | Onboarding lento, decisiones a ciegas | `docs/DATABASE.md` |
| P2-6 | Sin seeds de desarrollo | Cada dev arranca con DB vacía | `supabase/` |
| P2-7 | PWA sin offline strategy | App no funciona sin conexión | `public/sw.js` |
| P2-8 | Sin análisis de bundle | No se sabe cuánto pesa cada módulo | Ausencia de `vite-bundle-analyzer` |

### Qué rompería si tocamos X

| Si tocamos... | Riesgo de romper... |
|---------------|---------------------|
| Tabla `pedidos` | POS, webapp, delivery, cocina, cierres de caja, facturación, analytics, RDO |
| `types.ts` (regenerar) | Cualquier service que usa `as any` porque las tablas nuevas no matchean |
| Auth / roles | Guards de ruta, permisos en sidebar, RLS, Edge Functions |
| `timeEngine.ts` | Liquidación, fichajes, horas extra, presentismo |
| Supabase client | Todo: la app entera depende de un único punto de acceso |
| Edge Functions deploy | Fichajes, pagos, facturación, delivery, push, chat |
| Migrations | Toda la DB si un migration falla a mitad |

---

## 10. Arquitectura Propuesta (To-Be)

### Principios

1. **Domain-Driven Design**: cada dominio de negocio es un módulo independiente con contratos claros.
2. **Separación de responsabilidades**: UI → Application → Domain → Infrastructure.
3. **Testabilidad**: toda lógica de negocio testeable sin browser ni DB.
4. **Type safety**: zero `any`, tipos generados y validados.
5. **Observabilidad de primera clase**: logging estructurado, métricas, traces.
6. **Independencia de infraestructura**: abstraer Supabase detrás de interfaces.
7. **Escalabilidad de equipo**: módulos con ownership claro, cambios localizados.

### Diseño por capas o módulos (propuesta)

```
src/
├── modules/                          # Bounded contexts
│   ├── orders/                       # Pedidos (POS + Webapp)
│   │   ├── domain/                   # Entidades, value objects, reglas
│   │   │   ├── Order.ts
│   │   │   ├── OrderItem.ts
│   │   │   └── orderRules.ts
│   │   ├── application/              # Use cases / services
│   │   │   ├── createOrder.ts
│   │   │   ├── cancelOrder.ts
│   │   │   └── calculateOrderTotal.ts
│   │   ├── infrastructure/           # Supabase repos, API calls
│   │   │   ├── orderRepository.ts
│   │   │   └── paymentGateway.ts
│   │   ├── ui/                       # React components, hooks, pages
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── pages/
│   │   └── index.ts                  # Public API del módulo
│   │
│   ├── hr/                           # Fichajes, horarios, liquidación
│   ├── catalog/                      # Menú, categorías, recetas, costos
│   ├── pos/                          # Caja, turnos, impresión
│   ├── fiscal/                       # AFIP, facturación
│   ├── delivery/                     # Zonas, pricing, tracking
│   ├── payments/                     # MercadoPago, pagos
│   ├── finance/                      # Proveedores, gastos, RDO
│   ├── coaching/                     # Evaluaciones, competencias
│   ├── auth/                         # Login, registro, permisos
│   ├── notifications/                # Push, email, WhatsApp
│   └── brand-admin/                  # Config de marca, usuarios, comms
│
├── shared/                           # Código compartido entre módulos
│   ├── ui/                           # Componentes UI (shadcn)
│   ├── lib/                          # Utilidades, formatters, constants
│   ├── types/                        # Tipos globales
│   └── infrastructure/               # Supabase client, error handler, logger
│
├── app/                              # Shell de la aplicación
│   ├── App.tsx                       # Providers, router
│   ├── routes/                       # Definición de rutas
│   └── layouts/                      # Layouts compartidos
│
└── edge-functions/                   # Mirror de supabase/functions/ para dev
    └── [function-name]/
        ├── handler.ts
        ├── validator.ts              # Zod schemas
        └── handler.test.ts
```

### Contratos internos (interfaces)

```typescript
// Ejemplo: orders module public API
interface OrderRepository {
  findById(id: string): Promise<Order | null>;
  findByBranch(branchId: string, filters: OrderFilters): Promise<Order[]>;
  create(order: CreateOrderInput): Promise<Order>;
  updateStatus(id: string, status: OrderStatus): Promise<void>;
}

interface PaymentGateway {
  createCheckout(order: Order, method: PaymentMethod): Promise<CheckoutResult>;
  processWebhook(payload: unknown): Promise<WebhookResult>;
}

// Cada módulo expone su API pública via index.ts
// Los módulos se comunican SOLO a través de estas interfaces
```

### Contratos externos (API spec)

```typescript
// Edge Functions con esquemas Zod de input/output

// POST /functions/v1/create-webapp-order
const CreateWebappOrderInput = z.object({
  branchId: z.string().uuid(),
  items: z.array(OrderItemSchema),
  customer: CustomerSchema,
  deliveryAddress: AddressSchema.optional(),
  paymentMethod: z.enum(['cash', 'mercadopago']),
});

const CreateWebappOrderOutput = z.object({
  orderId: z.string().uuid(),
  trackingCode: z.string(),
  numeroDia: z.number(),
});

// Cada Edge Function tiene un schema de request y response documentado
```

### Estrategia de datos (migrations, versionado)

1. **Entorno de staging**: crear segundo proyecto Supabase para staging.
2. **Branching de DB**: usar `supabase db branch` para feature branches.
3. **Down migrations**: agregar reversibilidad a migrations nuevas.
4. **Seeds**: crear `supabase/seed.sql` con datos de desarrollo.
5. **Regeneración de types**: automatizar `supabase gen types` en CI.
6. **Versionado de API**: prefixar Edge Functions con versión (`v1/`, `v2/`).

---

## 11. Plan de Rehacer la App (Roadmap ejecutable)

### Fase 0: Preparación (Sprints 1-2)

**Objetivo**: establecer las bases sin tocar funcionalidad.

| Tarea | Entregable | Prioridad |
|-------|------------|-----------|
| Configurar entorno de staging (Supabase + Vercel preview) | Staging funcional | P0 |
| Agregar `.env` y `.env.local` a `.gitignore` | Seguridad básica | P0 |
| Completar `.cursorrules` Sección 1 | Contexto para AI y equipo | P1 |
| Configurar bundle analyzer | `vite-bundle-visualizer` integrado | P1 |
| Crear `supabase/seed.sql` con datos de prueba | Dev reproducible | P1 |
| Agregar Zod schemas a Edge Functions existentes (input validation) | Seguridad | P0 |
| Configurar logging estructurado (pino/winston en Edge, console wrapper en frontend) | Observabilidad | P1 |
| Auditar Edge Functions sin JWT → agregar auth donde corresponda | Seguridad | P0 |
| Escribir tests de integración para flujos P0 (facturación, pagos, fichaje) | Safety net mínima | P0 |
| Eliminar fallback hardcoded en `supabaseClient.ts` | Seguridad | P0 |
| Configurar feature flags (environment-based) | Infraestructura de migración | P1 |

### Fase 1: Módulo HR/Tiempo (Sprints 3-5)

**Justificación**: ya tiene la mejor cobertura de tests (`timeEngine`), reglas de negocio claras (CCT 329/00), y está relativamente aislado.

| Tarea | Entregable |
|-------|------------|
| Crear `src/modules/hr/domain/` con entidades y reglas | Lógica de negocio pura, 100% testeable |
| Mover `timeEngine.ts` → `modules/hr/domain/timeEngine.ts` | Misma lógica, nueva ubicación |
| Crear `modules/hr/infrastructure/clockRepository.ts` | Abstracción sobre Supabase |
| Crear `modules/hr/application/` con use cases | `clockIn`, `clockOut`, `calculatePayroll` |
| Migrar hooks de HR a `modules/hr/ui/hooks/` | Hooks consumen application layer |
| Refactorizar `InlineScheduleEditor.tsx` (1436 líneas → 5-6 componentes) | Componentes < 200 líneas |
| Eliminar `any` de `hrService.ts` | Type safety |
| Agregar types para tablas faltantes en `types.ts` | Eliminar `as any` casts |
| Tests: unit para domain, integration para application | Cobertura > 80% del módulo |

### Fase 2: Módulo Pedidos/Orders (Sprints 6-8)

| Tarea | Entregable |
|-------|------------|
| Crear `modules/orders/domain/` con `Order`, `OrderItem`, reglas de negocio | Entidades puras |
| Crear `modules/orders/application/` con use cases de POS y Webapp | Lógica compartida |
| Abstraer `posService.ts` → repository + use cases | Separación de concerns |
| Refactorizar `POSPage.tsx` (eliminar `any`, extraer lógica) | Componente limpio |
| Unificar flujo de creación de pedido (POS + Webapp) | Un use case, dos UIs |
| Migrar `create-webapp-order` Edge Function con Zod validation | Input validado |
| Tests: flujo completo de pedido (unit + integration) | Cobertura > 70% |

### Fase 3: Módulo Fiscal y Pagos (Sprints 9-10)

| Tarea | Entregable |
|-------|------------|
| Crear `modules/fiscal/domain/` con reglas de facturación | AFIP rules testeable |
| Mover `invoicing-rules.ts` al módulo fiscal | Centralizar |
| Abstraer Edge Functions de AFIP con interfaces | Testeable sin WSFE real |
| Crear `modules/payments/` para MercadoPago | Abstraer gateway |
| Tests: facturación, pagos, webhooks | Safety net fiscal |

### Fase 4: Módulos restantes (Sprints 11-15)

| Sprint | Módulo |
|--------|--------|
| 11 | `catalog/` (menú, recetas, costos) |
| 12 | `delivery/` (zonas, pricing, tracking) |
| 13 | `finance/` (proveedores, gastos, RDO) |
| 14 | `coaching/` + `notifications/` |
| 15 | `brand-admin/` + `auth/` (permisos refactorizados) |

### Fase 5: Cleanup y Optimización (Sprint 16)

| Tarea | Entregable |
|-------|------------|
| Eliminar código dead (services/hooks/components sin uso) | Codebase más liviana |
| Code splitting por módulo (route-based chunks) | Bundle optimizado |
| Virtualización en listas grandes | UX mejorada |
| PWA con cache strategy real | Offline-first donde aplique |
| QueryClient tuning por dominio | Performance optimizada |
| Eliminar barrel `src/services/index.ts` | Imports directos |
| CI: agregar coverage gates (>60% global) | Calidad sostenida |

### Checklist de "Definition of Done" (por módulo)

- [ ] Domain layer con entidades y reglas de negocio, sin dependencias externas
- [ ] Application layer con use cases que orquestan domain + infrastructure
- [ ] Infrastructure layer con repositories que abstraen Supabase
- [ ] UI layer con componentes < 200 líneas y hooks que consumen application
- [ ] Zero `any` en el módulo
- [ ] Tests unitarios de domain (>90% cobertura)
- [ ] Tests de integración de application (>70% cobertura)
- [ ] Edge Functions del módulo con Zod input validation
- [ ] Documentación del módulo (README con API pública)
- [ ] Feature flag para rollback
- [ ] Review de seguridad (auth, RLS, input validation)
- [ ] No regresión en funcionalidad existente

### Estrategia para migrar sin apagar el negocio (Strangler Fig Pattern)

```
                    ┌──────────────────────┐
                    │    Feature Flag       │
                    │  (por módulo/branch)  │
                    └──────────┬───────────┘
                               │
                    ┌──────────┴───────────┐
                    │                       │
              ┌─────┴─────┐         ┌──────┴──────┐
              │  LEGACY    │         │   NEW MODULE │
              │  (viejo)   │         │   (nuevo)    │
              └─────┬─────┘         └──────┬──────┘
                    │                       │
                    └──────────┬───────────┘
                               │
                    ┌──────────┴───────────┐
                    │   Misma UI / misma    │
                    │   base de datos       │
                    └──────────────────────┘
```

1. **Coexistencia**: el módulo nuevo y el viejo coexisten. Un feature flag (`VITE_MODULE_X_V2=true`) determina cuál se usa.
2. **Parity check**: ambos módulos corren en paralelo; se comparan resultados (similar al `TIME_PARITY_LOG` existente).
3. **Rollout gradual**: por branch (sucursal), no global. Si falla, rollback instantáneo.
4. **Datos compartidos**: ambas versiones usan la misma DB. Los cambios de schema se hacen backward-compatible.
5. **Deprecación**: cuando el módulo nuevo tiene paridad y tests, se elimina el viejo.

---

## 12. Backlog Técnico

### Historias técnicas listas para Jira

---

#### TECH-001: Configurar entorno de staging

**Título**: Crear entorno de staging en Supabase + Vercel/Netlify preview

**Descripción**: Crear un segundo proyecto Supabase para staging. Configurar Vercel/Netlify para desplegar branches a preview URLs que apunten al staging. Esto permite probar cambios de DB y Edge Functions sin tocar producción.

**Criterios de aceptación**:
- [ ] Proyecto Supabase de staging creado con las 405 migrations aplicadas
- [ ] Variables de entorno de staging configuradas en Vercel/Netlify
- [ ] Branch `develop` despliega automáticamente a staging
- [ ] Seed data cargada en staging
- [ ] Documentación de uso en `docs/DEPLOYMENT.md`

---

#### TECH-002: Auditar y asegurar Edge Functions sin JWT

**Título**: Agregar autenticación a Edge Functions que la necesitan

**Descripción**: Revisar las 7 Edge Functions con `verify_jwt = false`. Para cada una, determinar si el bypass es legítimo (webhook, PIN-based) o si necesita auth. Agregar validación donde corresponda.

**Criterios de aceptación**:
- [ ] Cada función analizada y documentada (legítimo vs requiere fix)
- [ ] Funciones que requieren auth actualizadas con Bearer validation
- [ ] `webapp-pedido-chat` y `send-order-push` tienen rate limiting o auth
- [ ] Tests manuales de cada función modificada
- [ ] `config.toml` actualizado

---

#### TECH-003: Eliminar fallback de producción en supabaseClient

**Título**: Eliminar URL hardcodeada de producción en `supabaseClient.ts`

**Descripción**: El archivo `src/services/supabaseClient.ts` tiene un fallback que apunta a la URL de producción de Supabase cuando las env vars no son válidas. Esto hace que un dev sin `.env` correcto escriba contra producción.

**Criterios de aceptación**:
- [ ] Fallback eliminado; si las env vars faltan, la app muestra error claro
- [ ] `.env.example` actualizado con instrucciones
- [ ] `.env` y `.env.local` agregados a `.gitignore`
- [ ] Tests de que la app falla gracefully sin env vars

---

#### TECH-004: Agregar `.env` a `.gitignore`

**Título**: Proteger archivos de entorno del repositorio

**Descripción**: `.env` y `.env.local` no están en `.gitignore`. Agregarlos y limpiar el historial si ya fueron commiteados.

**Criterios de aceptación**:
- [ ] `.env`, `.env.local`, `.env.*.local` en `.gitignore`
- [ ] Archivos removidos del tracking de git (`git rm --cached`)
- [ ] Verificado que CI sigue funcionando (usa secrets, no archivos)

---

#### TECH-005: Agregar Zod validation a Edge Functions

**Título**: Validar inputs de todas las Edge Functions con Zod

**Descripción**: Ninguna Edge Function valida inputs estructuradamente. Agregar schemas Zod a cada una para prevenir inputs malformados y mejorar seguridad.

**Criterios de aceptación**:
- [ ] Cada Edge Function tiene un `schema.ts` con input/output Zod schemas
- [ ] Inputs validados al inicio del handler; 400 con detalle si falla
- [ ] Schemas exportados para uso en frontend (tipo compartido)
- [ ] Tests unitarios de validación

---

#### TECH-006: Tests de integración para flujos fiscales

**Título**: Escribir tests para facturación AFIP y notas de crédito

**Descripción**: Los flujos de facturación electrónica no tienen ningún test. Un bug puede generar facturas incorrectas con consecuencias legales. Crear tests que validen la lógica sin conectar a AFIP real.

**Criterios de aceptación**:
- [ ] Tests unitarios de `invoicing-rules.ts` expandidos (edge cases)
- [ ] Tests de integración de `emitir-factura` Edge Function con mock de WSFE
- [ ] Tests de `emitir-nota-credito` Edge Function con mock
- [ ] CI ejecuta estos tests en cada PR

---

#### TECH-007: Refactorizar InlineScheduleEditor (1436 → <200 LOC)

**Título**: Descomponer InlineScheduleEditor en sub-componentes

**Descripción**: `src/components/hr/InlineScheduleEditor.tsx` tiene 1,436 líneas en un solo componente. Viola la regla de 300 max de `.cursorrules`. Descomponerlo en componentes manejables.

**Criterios de aceptación**:
- [ ] Componente principal < 200 líneas
- [ ] Sub-componentes extraídos con responsabilidad única
- [ ] Lógica de estado extraída a hooks dedicados
- [ ] Funcionalidad idéntica (no regresión visual)
- [ ] Zero `any` en los nuevos archivos

---

#### TECH-008: Eliminar `any` de servicios críticos

**Título**: Reemplazar `any` con tipos correctos en hrService, posService, rdoService

**Descripción**: Los 3 servicios más críticos usan `any` extensivamente. Esto anula el type safety de TypeScript en las áreas más sensibles del negocio.

**Criterios de aceptación**:
- [ ] `hrService.ts`: zero `any`, tablas nuevas en types.ts
- [ ] `posService.ts`: zero `any`
- [ ] `rdoService.ts`: zero `any`, RPCs tipados
- [ ] `supabase gen types` regenerado y actualizado
- [ ] No regresiones en funcionalidad

---

#### TECH-009: Eliminar `@ts-nocheck` del barrel de servicios

**Título**: Refactorizar `src/services/index.ts` para eliminar `@ts-nocheck`

**Descripción**: El barrel exporta duplicados y silencia errores con `@ts-nocheck`. Refactorizar para que cada export sea único y tipado.

**Criterios de aceptación**:
- [ ] `@ts-nocheck` eliminado
- [ ] Exports duplicados resueltos
- [ ] Compilación sin errores
- [ ] Consumers actualizados si cambia un export

---

#### TECH-010: Configurar logging estructurado

**Título**: Implementar logging estructurado en frontend y Edge Functions

**Descripción**: Reemplazar `console.log` disperso con un logger que produzca JSON estructurado con context, level, timestamp, y correlation ID.

**Criterios de aceptación**:
- [ ] Logger wrapper creado en `src/shared/infrastructure/logger.ts`
- [ ] Edge Functions usan logger con request ID
- [ ] `console.log` reemplazados en servicios críticos
- [ ] Logs visibles en Supabase Dashboard / Sentry

---

#### TECH-011: Crear módulo HR con arquitectura target

**Título**: Implementar módulo HR como primer piloto de nueva arquitectura

**Descripción**: Primer módulo que sigue la arquitectura target (domain/application/infrastructure/ui). Migrar fichajes, horarios y liquidación al nuevo módulo detrás de feature flag.

**Criterios de aceptación**:
- [ ] `src/modules/hr/` creado con las 4 capas
- [ ] `timeEngine` movido a `domain/`
- [ ] Repository pattern para clock_entries
- [ ] Use cases: `clockIn`, `clockOut`, `calculatePayroll`
- [ ] Feature flag `VITE_HR_MODULE_V2`
- [ ] Tests: unit (domain >90%), integration (application >70%)
- [ ] Paridad funcional con código viejo verificada

---

#### TECH-012: Code splitting por dominio

**Título**: Configurar Vite chunks por módulo de negocio

**Descripción**: Hoy todo se bundlea en pocos chunks. Configurar `manualChunks` en Vite para separar POS, Webapp, Admin, Local y shared.

**Criterios de aceptación**:
- [ ] Cada módulo major tiene su propio chunk
- [ ] Bundle analyzer muestra separación clara
- [ ] First load de webapp no carga código de POS/Admin
- [ ] LCP mejorado en webapp pública

---

#### TECH-013: Escribir tests E2E para flujos críticos

**Título**: Implementar tests E2E con Playwright para 3 flujos core

**Descripción**: Agregar Playwright y escribir tests E2E para: (1) pedido webapp, (2) venta POS, (3) fichaje de empleado.

**Criterios de aceptación**:
- [ ] Playwright configurado con proyecto de staging
- [ ] Test E2E: crear pedido webapp → confirmar → tracking
- [ ] Test E2E: abrir caja → venta POS → cierre de turno
- [ ] Test E2E: fichaje entrada → fichaje salida
- [ ] CI ejecuta E2E en PRs a `main`

---

#### TECH-014: Completar documentación de base de datos

**Título**: Regenerar `docs/DATABASE.md` con las 113 tablas documentadas

**Descripción**: El script `generate-db-docs.ts` existe pero solo genera documentación de 5 tablas. Mejorar el script y la RPC `get_public_tables` para cubrir todas las tablas con descripciones.

**Criterios de aceptación**:
- [ ] Las 113 tablas documentadas con columnas, tipos y relaciones
- [ ] Las 10 views documentadas con su propósito
- [ ] Los RPCs documentados con inputs/outputs
- [ ] Script mejorado genera docs completas
- [ ] CI actualiza docs en push a main

---

#### TECH-015: Crear seed data para desarrollo

**Título**: Crear `supabase/seed.sql` con datos de prueba

**Descripción**: No hay datos de seed. Cada developer empieza con DB vacía. Crear seed con: marca, 2 branches, usuarios con cada rol, productos, categorías, pedidos de ejemplo.

**Criterios de aceptación**:
- [ ] `supabase/seed.sql` con datos coherentes
- [ ] Usuarios de prueba para cada rol (superadmin, encargado, cajero, empleado)
- [ ] 2 branches con menú, horarios, y config
- [ ] `supabase db reset` + seed funciona en < 2 minutos
- [ ] Documentado en README

---

#### TECH-016: Virtualización de listas grandes

**Título**: Implementar virtualización en tablas de equipo, pedidos y fichajes

**Descripción**: Las tablas grandes (`OrderHistoryTable`, `TeamTable`, `RosterTable`) renderizan todos los rows sin virtualización, causando lag con muchos registros.

**Criterios de aceptación**:
- [ ] `@tanstack/react-virtual` o equivalente integrado
- [ ] OrderHistoryTable virtualizado
- [ ] TeamTable virtualizado
- [ ] Performance medida antes/después (target: <16ms per frame)

---

#### TECH-017: Refactorizar POSPage (eliminar `any` y lógica de negocio)

**Título**: Descomponer POSPage y extraer lógica a hooks/use cases

**Descripción**: `src/pages/pos/POSPage.tsx` contiene lógica de negocio, `any` types y orquestación compleja que debería estar en hooks y servicios.

**Criterios de aceptación**:
- [ ] Page < 150 líneas, solo composición de componentes
- [ ] Lógica extraída a `usePOSFlow` hook o similar
- [ ] Zero `any`
- [ ] Funcionalidad idéntica

---

#### TECH-018: Completar `.cursorrules` con datos del proyecto

**Título**: Llenar Sección 1 de `.cursorrules` con stack, estructura, cliente DB e idioma

**Descripción**: La Sección 1 tiene placeholders `[COMPLETAR]`. Llenar con la información real del proyecto.

**Criterios de aceptación**:
- [ ] Stack: React 18, TypeScript 5.8, Supabase, Tailwind CSS, Vite 5
- [ ] Estructura: documentada con paths reales
- [ ] Cliente DB: `src/services/supabaseClient.ts`
- [ ] Idioma: Español para UI y comentarios, Inglés para código
- [ ] Sección 7 con reglas personalizadas del equipo

---

#### TECH-019: Configurar down migrations

**Título**: Establecer estrategia de rollback para migrations

**Descripción**: Las 405 migrations son forward-only. Para nuevas migrations, incluir un archivo `down.sql` companion o usar `supabase migration repair`.

**Criterios de aceptación**:
- [ ] Template de migration incluye comentario con rollback SQL
- [ ] Documentación de cómo hacer rollback de emergencia
- [ ] CI valida que nuevas migrations tienen rollback documentado

---

#### TECH-020: Configurar Playwright para tests E2E

**Título**: Setup de Playwright en el proyecto

**Descripción**: No hay framework de E2E. Instalar y configurar Playwright con staging como target, screenshots on failure, y CI integration.

**Criterios de aceptación**:
- [ ] `playwright.config.ts` configurado apuntando a staging
- [ ] 1 test smoke (login + navegación) funcional
- [ ] Screenshots y videos on failure
- [ ] CI workflow para E2E (separado del CI principal)
- [ ] Documentación de cómo correr tests localmente

---

*Documento generado el 2 de marzo de 2026. Basado en análisis estático del codebase. No se ejecutó la aplicación ni se inspeccionó la base de datos en runtime.*
