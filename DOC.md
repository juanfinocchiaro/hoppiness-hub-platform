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
