# Auditoría Completa de Duplicación Funcional

**Fecha:** 2026-01-20  
**Autor:** Sistema  
**Estado:** COMPLETO

---

## 1. INVENTARIO COMPLETO DE PANTALLAS

### 1.1 Panel Marca (`/admin/*`)

| # | Ruta | Menú | Sección | Página | Archivo | Estado |
|---|------|------|---------|--------|---------|--------|
| 1 | `/admin` | Fixed | - | Dashboard Home | `AdminHome.tsx` | ✅ |
| 2 | `/admin/sucursales` | Fixed | - | Sucursales | `Branches.tsx` | ✅ |
| 3 | `/admin/sucursales/:id/productos` | Hidden | - | Productos por Sucursal | `BranchProducts.tsx` | ✅ |
| 4 | `/admin/productos` | Catálogo | Productos | Productos | `Products.tsx` | ✅ |
| 5 | `/admin/productos/nuevo` | Hidden | - | Nuevo Producto | `ProductForm.tsx` | ✅ |
| 6 | `/admin/productos/:id` | Hidden | - | Editar Producto | `ProductForm.tsx` | ✅ |
| 7 | `/admin/modificadores` | Catálogo | Modificadores | Modificadores | `Modifiers.tsx` | ✅ |
| 8 | `/admin/ingredientes` | Insumos | Ingredientes | Ingredientes | `Ingredients.tsx` | ✅ |
| 9 | `/admin/proveedores` | Insumos | Proveedores | Proveedores | `Suppliers.tsx` | ✅ |
| 10 | `/admin/control-proveedores` | Insumos | Control | Control por Ingrediente | `IngredientSuppliers.tsx` | ✅ |
| 11 | `/admin/equipo` | Equipo | Usuarios | Usuarios | `Users.tsx` | ✅ |
| 12 | `/admin/plantillas` | Equipo | Plantillas | Plantillas de Rol | `RoleTemplates.tsx` | ✅ |
| 13 | `/admin/overrides` | Hidden | - | Overrides por Sucursal | `UserBranchOverrides.tsx` | ✅ |
| 14 | `/admin/usuarios` | Legacy | - | Redirect → Users | `Users.tsx` | ⚠️ DUPLICADO |
| 15 | `/admin/accesos` | Legacy | - | Panel Accesos | `Permissions.tsx` | ⚠️ DUPLICADO |
| 16 | `/admin/permisos` | Legacy | - | Redirect → Permissions | `Permissions.tsx` | ⚠️ DUPLICADO |
| 17 | `/admin/performance` | Reportes | Performance | Performance Locales | `BranchPerformance.tsx` | ✅ |
| 18 | `/admin/reportes` | Reportes | Ventas | Ventas | `SalesReports.tsx` | ✅ |
| 19 | `/admin/estado-resultados` | Reportes | P&L | P&L Locales | `ProfitLossReport.tsx` | ✅ |
| 20 | `/admin/finanzas-marca` | Reportes | Finanzas | Finanzas Marca | `BrandFinances.tsx` | ✅ |
| 21 | `/admin/clientes` | Hidden | - | Clientes | `Customers.tsx` | ✅ |
| 22 | `/admin/descuentos` | Hidden | - | Descuentos | `Discounts.tsx` | ✅ |
| 23 | `/admin/escaner-comprobantes` | Hidden | - | Escáner Facturas | `InvoiceScanner.tsx` | ✅ |
| 24 | `/admin/estado-sucursales` | Hidden | - | Estado Sucursales | `BranchStatus.tsx` | ✅ |

### 1.2 Panel Mi Local (`/local/:branchId/*`)

| # | Ruta | Menú | Sección | Página | Archivo | Estado |
|---|------|------|---------|--------|---------|--------|
| 25 | `/local/:id` | Escritorio | - | Dashboard | `LocalDashboard.tsx` (inline) | ✅ |
| 26 | `/local/:id` + POS | Operación | POS | Tomar Pedidos | `POSView.tsx` | ✅ |
| 27 | `/local/:id` + KDS | Operación | KDS | Cocina | `KDSView.tsx` | ✅ |
| 28 | `/local/:id/pedidos` | Operación | Gestor | Gestor de Pedidos | `LocalPedidos.tsx` | ✅ |
| 29 | `/local/:id/historial` | Operación | Historial | Historial | `LocalHistorial.tsx` | ✅ |
| 30 | `/local/:id/productos` | Menú Local | Productos | Productos | `LocalProductos.tsx` | ✅ |
| 31 | `/local/:id/extras` | Menú Local | Extras | Modificadores | `LocalExtras.tsx` | ✅ |
| 32 | `/local/:id/stock` | Stock | Stock | Stock Ingredientes | `LocalStock.tsx` | ✅ |
| 33 | `/local/:id/inventario` | Stock | Inventario | Conteo Inventario | `LocalInventory.tsx` | ✅ |
| 34 | `/local/:id/cmv` | Stock | CMV | Reporte CMV | `LocalCMVReport.tsx` | ✅ |
| 35 | `/local/:id/clientes` | Clientes | Clientes | Cuenta Corriente | `LocalCustomers.tsx` | ✅ |
| 36 | `/local/:id/transacciones` | Finanzas | Ledger | Ledger | `LocalTransactions.tsx` | ✅ |
| 37 | `/local/:id/caja` | Finanzas | Caja | Caja | `LocalCaja.tsx` | ✅ |
| 38 | `/local/:id/proveedores` | Finanzas | Proveedores | Proveedores | `LocalSuppliers.tsx` | ⚠️ VER DUPLIC. |
| 39 | `/local/:id/facturas` | Finanzas | Facturas | Facturas | `LocalFacturas.tsx` | ✅ |
| 40 | `/local/:id/obligaciones` | Finanzas | Obligaciones | Obligaciones | `LocalObligaciones.tsx` | ✅ |
| 41 | `/local/:id/reportes` | Finanzas | Reportes | Reportes | `LocalFinanceReports.tsx` | ✅ |
| 42 | `/local/:id/rrhh/fichajes` | RRHH | Fichajes | Fichajes | `LocalRRHHFichajes.tsx` | ✅ |
| 43 | `/local/:id/rrhh/horarios` | RRHH | Horarios | Horarios | `LocalRRHHHorarios.tsx` | ✅ |
| 44 | `/local/:id/rrhh/colaboradores` | RRHH | Colaboradores | Colaboradores | `LocalRRHHColaboradores.tsx` | ✅ |
| 45 | `/local/:id/rrhh/horas` | RRHH | Horas | Horas del Mes | `LocalRRHHHoras.tsx` | ✅ |
| 46 | `/local/:id/rrhh/liquidacion` | RRHH | Liquidación | Liquidación | `LocalRRHHLiquidacion.tsx` | ✅ |
| 47 | `/local/:id/config` | Configuración | Mi Sucursal | Mi Sucursal | `LocalConfig.tsx` | ⚠️ DUPLIC. INTEG. |
| 48 | `/local/:id/integraciones` | Configuración | Integraciones | Integraciones | `LocalIntegraciones.tsx` | ⚠️ DUPLIC. INTEG. |
| 49 | `/local/:id/zonas-delivery` | Configuración | Zonas | Zonas Delivery | `LocalDeliveryZones.tsx` | ✅ |
| 50 | `/local/:id/impresoras` | Configuración | Impresoras | Impresoras | `LocalImpresoras.tsx` | ✅ |
| 51 | `/local/:id/kds-config` | Configuración | KDS Config | Configuración KDS | `LocalKDSSettings.tsx` | ✅ |

### 1.3 Rutas Públicas

| # | Ruta | Archivo | Estado |
|---|------|---------|--------|
| 52 | `/` | `Index.tsx` | ✅ |
| 53 | `/ingresar` | `Ingresar.tsx` | ✅ |
| 54 | `/pedir` | `Pedir.tsx` | ✅ |
| 55 | `/pedir/:branchSlug` | `PedirBranch.tsx` | ✅ |
| 56 | `/pedido/:trackingToken` | `PedidoTracking.tsx` | ✅ |
| 57 | `/menu` | `NuestroMenu.tsx` | ✅ |
| 58 | `/menu/:branchSlug` | `MenuPublic.tsx` | ✅ |
| 59 | `/franquicias` | `Franquicias.tsx` | ✅ |
| 60 | `/clock-in` | `ClockIn.tsx` | ✅ |
| 61 | `/registro-staff` | `RegistroStaff.tsx` | ✅ |

### 1.4 Rutas POS (Standalone)

| # | Ruta | Archivo | Estado |
|---|------|---------|--------|
| 62 | `/pos` | `POS.tsx` | ⚠️ VER DUPLIC. |
| 63 | `/pos/:branchId/kds` | `KDS.tsx` | ⚠️ VER DUPLIC. |
| 64 | `/pos/pedidos` | `OrdersDashboard.tsx` | ⚠️ VER DUPLIC. |
| 65 | `/attendance-kiosk/:branchId` | `AttendanceKiosk.tsx` | ✅ |

---

## 2. MATRIZ DE DUPLICACIONES DETECTADAS

### 2.1 🔴 CRÍTICO: Integraciones (LocalConfig vs LocalIntegraciones)

**Archivos:**
- `src/pages/local/LocalConfig.tsx` (líneas 484-750)
- `src/pages/local/LocalIntegraciones.tsx` (completo)

**Campos duplicados:**
| Campo | LocalConfig | LocalIntegraciones |
|-------|-------------|-------------------|
| `mercadopago_access_token` | ✅ Línea 49, 85, 505-565 | ✅ Líneas 52-56 |
| `mercadopago_public_key` | ✅ Línea 50, 86, 533-542 | ✅ Líneas 52-56 |
| `rappi_store_id` | ✅ Línea 51, 87, 571-640 | ✅ Líneas 76-78 |
| `rappi_api_key` | ✅ Línea 52, 88, 598-615 | ✅ Líneas 76-78 |
| `pedidosya_restaurant_id` | ✅ Línea 53, 89 | ✅ Líneas 85-91 |
| `pedidosya_api_key` | ✅ Línea 54, 90 | ✅ Líneas 85-91 |
| `mp_delivery_store_id` | ✅ Línea 55, 91 | ✅ Líneas 60-67 |
| `facturante_*` | ✅ Auto-factura toggle | ✅ Líneas 94-104 |

**Riesgo:** ALTO - Doble escritura al mismo campo desde dos pantallas distintas.

**Propuesta:** 
- Eliminar sección "Integraciones de Pago y Agregadores" de LocalConfig.tsx
- Mantener solo en LocalIntegraciones.tsx con UI completa
- En LocalConfig solo dejar: Servicios, Tiempo preparación, Proveedor facturación

---

### 2.2 🔴 CRÍTICO: Gestión de Permisos (3 pantallas solapadas)

**Archivos:**
- `src/pages/admin/Users.tsx` + `UserCard.tsx` (Ficha usuario con scope/paneles/overrides)
- `src/pages/admin/Permissions.tsx` (Panel legacy "Accesos")
- `src/pages/admin/UserBranchOverrides.tsx` (Overrides por sucursal)
- `src/pages/admin/RoleTemplates.tsx` (Plantillas de rol)

**Funcionalidad solapada:**

| Funcionalidad | Users.tsx | Permissions.tsx | UserBranchOverrides.tsx | RoleTemplates.tsx |
|---------------|-----------|-----------------|-------------------------|-------------------|
| Ver permisos usuario | ✅ (efectivos) | ✅ (editar) | ✅ (overrides) | ❌ |
| Editar permisos | ❌ | ✅ | ✅ | ✅ (plantilla) |
| Seleccionar usuario | ✅ | ✅ | ✅ | ❌ |
| Seleccionar sucursal | ✅ (scope) | ✅ | ✅ | ❌ |
| Ver plantilla rol | ✅ | ❌ | ✅ | ✅ |
| Editar plantilla | ❌ | ❌ | ❌ | ✅ |

**Rutas legacy activas:**
- `/admin/accesos` → `Permissions.tsx`
- `/admin/permisos` → `Permissions.tsx`
- `/admin/usuarios` → `Users.tsx`

**Riesgo:** ALTO - Modelo mental confuso, múltiples caminos para lo mismo.

**Propuesta:**
1. **Eliminar** `Permissions.tsx` completamente
2. **Mantener**:
   - `Users.tsx` → Listado + Ficha (identidad, paneles, scope, plantilla, link a overrides)
   - `RoleTemplates.tsx` → Definición de plantillas por rol
   - `UserBranchOverrides.tsx` → Solo overrides (acceso desde ficha usuario)
3. **Eliminar rutas legacy:** `/admin/accesos`, `/admin/permisos`

---

### 2.3 🟡 MODERADO: Proveedores (Local vs Marca)

**Archivos:**
- `src/pages/admin/Suppliers.tsx` (Panel Marca)
- `src/pages/local/LocalSuppliers.tsx` (Panel Mi Local)

**Análisis:**
- Marca: CRUD de proveedores maestros (brand-level)
- Local: Gestión de pagos/deuda a proveedores (branch-level)

**Veredicto:** NO ES DUPLICACIÓN - Son scopes diferentes
- Marca = catálogo maestro de proveedores
- Local = operaciones financieras con proveedores asignados

---

### 2.4 🟡 MODERADO: POS Standalone vs Embebido

**Rutas standalone:**
- `/pos` → `POS.tsx`
- `/pos/:branchId/kds` → `KDS.tsx`
- `/pos/pedidos` → `OrdersDashboard.tsx`

**Rutas embebidas en LocalLayout:**
- `/local/:id` + action='pos' → `POSView.tsx`
- `/local/:id` + action='kds' → `KDSView.tsx`
- `/local/:id/pedidos` → `LocalPedidos.tsx`

**Análisis:**
- POS standalone es legacy/fallback
- Embebido en LocalLayout es la versión actual

**Propuesta:**
- Deprecar rutas standalone `/pos/*`
- Redirigir a `/local/:branchId` con parámetro de vista

---

### 2.5 🟡 MODERADO: Clientes (Marca vs Local)

**Archivos:**
- `src/pages/admin/Customers.tsx` (Panel Marca - hidden)
- `src/pages/local/LocalCustomers.tsx` (Panel Local)

**Análisis:**
- Marca: Clientes globales (CRM centralizado)
- Local: Cuenta corriente por sucursal

**Veredicto:** NO ES DUPLICACIÓN directa pero necesita clarificación
- Marca = directorio global de clientes
- Local = operaciones de cuenta corriente específicas de sucursal

---

### 2.6 🟢 BAJO: Productos (Marca vs Local)

**Archivos:**
- `src/pages/admin/Products.tsx` (Catálogo maestro)
- `src/pages/local/LocalProductos.tsx` (Disponibilidad local)

**Veredicto:** CORRECTO - Separación de responsabilidades clara
- Marca = definición de productos (recetas, precios base)
- Local = disponibilidad y precios custom

---

## 3. NAVEGACIÓN Y PANELES

### 3.1 Lógica de Paneles Habilitados

**Estado actual (usePanelAccess.ts):**

```typescript
interface PanelAccessData {
  canUseLocalPanel: boolean;    // user_panel_access.can_use_local_panel
  canUseBrandPanel: boolean;    // user_panel_access.can_use_brand_panel
  brandAccess: boolean;         // user_panel_access.brand_access
  branchAccess: Branch[];       // user_branch_access
}
```

**Mapeo esperado por rol:**

| Rol | canUseLocalPanel | canUseBrandPanel | brandAccess | Notas |
|-----|------------------|------------------|-------------|-------|
| admin | ✅ | ✅ | ✅ | Acceso total |
| coordinador | ❌ | ✅ | ✅ | Solo marca |
| socio | ❌ | ✅ | ✅ | Solo reportes marca |
| franquiciado | ✅ | ❓ | ❌ | Local + ¿marca limitado? |
| encargado | ✅ | ❌ | ❌ | Solo local |
| cajero | ✅ | ❌ | ❌ | Solo POS/KDS |
| kds | ✅ | ❌ | ❌ | Solo KDS |

**Problema detectado:**
- El flag `can_use_brand_panel` para franquiciado no está claro
- No hay lógica de "marca limitada" (solo ver SUS sucursales en reportes marca)

---

### 3.2 Botones de Switch de Panel

**Panel Marca (Dashboard.tsx):**
```tsx
// Línea 341-350
{hasLocalPanelAccess && (
  <Link to={`/local/${branchAccess[0].id}`}>
    <Button variant="outline">Panel Mi Local</Button>
  </Link>
)}
```

**Panel Local (LocalLayout.tsx):**
```tsx
// Footer del sidebar
{canUseBrandPanel && (
  <Link to="/admin">
    <Button variant="outline">Panel Marca</Button>
  </Link>
)}
```

**Estado:** ✅ Correcto - Se ocultan según permisos

---

## 4. CAMPOS CON DOBLE ESCRITURA

### 4.1 Tabla `branches` - Campos de Integraciones

| Campo | LocalConfig | LocalIntegraciones | Acción |
|-------|-------------|-------------------|--------|
| `mercadopago_access_token` | ✅ | ✅ | MOVER a Integraciones |
| `mercadopago_public_key` | ✅ | ✅ | MOVER a Integraciones |
| `mercadopago_delivery_enabled` | ❌ | ✅ | OK |
| `mp_delivery_store_id` | ✅ | ✅ | MOVER a Integraciones |
| `rappi_enabled` | ❌ | ✅ | OK |
| `rappi_store_id` | ✅ | ✅ | MOVER a Integraciones |
| `rappi_api_key` | ✅ | ✅ | MOVER a Integraciones |
| `pedidosya_enabled` | ❌ | ✅ | OK |
| `pedidosya_restaurant_id` | ✅ | ✅ | MOVER a Integraciones |
| `pedidosya_api_key` | ✅ | ✅ | MOVER a Integraciones |
| `facturante_enabled` | ❌ | ✅ | OK |
| `facturante_*` | ❌ | ✅ | OK |
| `auto_invoice_integrations` | ✅ | ❌ | MOVER a Integraciones |

---

## 5. PROPUESTA DE SOLUCIÓN

### 5.1 Eliminar Permissions.tsx

**Pasos:**
1. Eliminar archivo `src/pages/admin/Permissions.tsx`
2. Eliminar rutas en App.tsx:
   - `/admin/accesos`
   - `/admin/permisos`
3. Asegurar que UserBranchOverrides.tsx cubra toda la funcionalidad

### 5.2 Consolidar Integraciones

**En LocalConfig.tsx - ELIMINAR:**
- Sección "Integraciones de Pago y Agregadores" (líneas 484-750 aprox)
- Estados: `mpAccessToken`, `mpPublicKey`, `rappiStoreId`, `rappiApiKey`, etc.
- Mantener solo:
  - Control Rápido de Servicios
  - Tiempo de Preparación
  - Proveedor de Facturación (selector)
  - Horarios de Sucursal

**En LocalIntegraciones.tsx - AGREGAR:**
- Toggle `auto_invoice_integrations`
- Mover toda la UI de credenciales ahí

### 5.3 Deprecar POS Standalone

**Pasos:**
1. En `/pos` → Redirect a `/local/:defaultBranchId`
2. En `/pos/:branchId/kds` → Redirect a `/local/:branchId` con query `?view=kds`
3. En `/pos/pedidos` → Redirect a `/local/:branchId/pedidos`

---

## 6. CHECKLIST QA

### 6.1 Post-eliminación Permissions.tsx
- [ ] `/admin/accesos` devuelve 404 o redirect
- [ ] `/admin/permisos` devuelve 404 o redirect
- [ ] UserBranchOverrides funciona correctamente
- [ ] Ficha de usuario muestra "Ver permisos efectivos"

### 6.2 Post-consolidación Integraciones
- [ ] LocalConfig NO muestra campos de MercadoPago/Rappi/etc
- [ ] LocalIntegraciones muestra TODOS los campos
- [ ] No hay doble escritura a `branches`

### 6.3 Navegación de Paneles
- [ ] Cajero NO ve botón "Panel Marca"
- [ ] Coordinador NO ve botón "Mi Local"
- [ ] Franquiciado ve ambos botones
- [ ] Admin ve ambos botones

---

## 7. PANTALLAS NO INSPECCIONADAS

| Pantalla | Razón | Cómo acceder |
|----------|-------|--------------|
| `LocalRRHHSueldos.tsx` | No inspeccionado código | `/local/:id/rrhh/sueldos` |
| Contenido de modales internos | Requiere inspección manual | Abrir cada modal |

---

## 8. RESUMEN EJECUTIVO

| Categoría | Cantidad | Estado |
|-----------|----------|--------|
| Pantallas totales | 65 | Inventariadas |
| Duplicaciones críticas | 2 | Integraciones + Permisos |
| Duplicaciones moderadas | 3 | POS, Clientes, Proveedores |
| Rutas legacy a eliminar | 4 | accesos, permisos, usuarios, pos/* |
| Campos con doble escritura | 8 | En tabla branches |

**Prioridad de corrección:**
1. 🔴 Eliminar Permissions.tsx
2. 🔴 Consolidar Integraciones en LocalConfig
3. 🟡 Deprecar rutas /pos/*
4. 🟢 Documentar diferencia Clientes Marca vs Local
