# Inventario de Rutas y Permisos - Hoppiness Hub

**Fecha:** 2026-01-26
**Estado:** Migración V2 completada

---

## 1. RUTAS PÚBLICAS (sin autenticación)

| Ruta | Componente | Descripción |
|------|------------|-------------|
| `/` | `Index` | Landing page |
| `/ingresar` | `Ingresar` | Login |
| `/olvide-password` | `OlvidePassword` | Recuperar contraseña |
| `/reset-password` | `ResetPassword` | Nueva contraseña |
| `/pedir` | `Pedir` | Selector de sucursal para pedir |
| `/pedir/:branchSlug` | `PedirBranch` | Menú de sucursal |
| `/checkout` | `Checkout` | Finalizar pedido |
| `/pedido/:trackingToken` | `PedidoTracking` | Seguimiento de pedido |
| `/menu/:branchSlug` | `MenuPublic` | Menú público |
| `/franquicias` | `Franquicias` | Info para franquiciados |
| `/nosotros` | `Nosotros` | About us |
| `/contacto` | `Contacto` | Formulario de contacto |
| `/clock-in` | `ClockIn` | Fichaje público |
| `/kds/public` | `KDSPublic` | KDS sin login (token) |

---

## 2. RUTAS DE CUENTA (RequireAuth)

| Ruta | Componente | Permisos |
|------|------------|----------|
| `/cuenta` | `CuentaDashboard` | Autenticado |
| `/cuenta/pedidos` | `CuentaPedidos` | Autenticado |
| `/cuenta/perfil` | `CuentaPerfil` | Autenticado |
| `/cuenta/direcciones` | `CuentaDirecciones` | Autenticado |

---

## 3. RUTAS MI LOCAL (LocalRoute)

### 3.1 Operación Diaria
| Ruta | Componente | Permiso V2 |
|------|------------|------------|
| `/local/:branchId/integrador` | `LocalIntegrador` | `local.canViewIntegrador` |
| `/local/:branchId/pos` | `LocalPOS` | `local.canOperatePOS` |
| `/local/:branchId/kds` | `LocalKDS` | `local.canViewKDS` |
| `/local/:branchId/pedidos` | `LocalPedidos` | `local.canManageOrders` |
| `/local/:branchId/historial` | `LocalHistorial` | `local.canViewHistorial` |

### 3.2 Caja y Pagos
| Ruta | Componente | Permiso V2 |
|------|------------|------------|
| `/local/:branchId/caja` | `LocalCaja` | `local.canViewCajaVenta` |
| `/local/:branchId/cuenta-corriente` | `LocalCustomers` | `local.canViewCuentaCorriente` |
| `/local/:branchId/cierre` | `LocalCierreTurno` | `local.canViewCierreTurno` |

### 3.3 Stock y Compras
| Ruta | Componente | Permiso V2 |
|------|------------|------------|
| `/local/:branchId/stock` | `LocalStock` | `local.canViewStock` |
| `/local/:branchId/stock/pedir` | `LocalStockPedir` | `local.canOrderFromSupplier` |
| `/local/:branchId/stock/factura` | `LocalStockFactura` | `local.canUploadInvoice` |
| `/local/:branchId/stock/historial` | `LocalStockHistorial` | `local.canViewStock` |
| `/local/:branchId/stock/conteo` | `LocalInventory` | `local.canDoInventoryCount` |
| `/local/:branchId/compras/proveedores` | `LocalComprasProveedores` | `local.canViewSuppliers` |
| `/local/:branchId/compras/cuentas` | `LocalComprasCuentas` | `local.canViewSupplierAccounts` |

### 3.4 Menú del Local
| Ruta | Componente | Permiso V2 |
|------|------------|------------|
| `/local/:branchId/menu/productos` | `LocalProductos` | `local.canViewMenu` |
| `/local/:branchId/menu/combos` | `LocalMenuCombos` | `local.canViewMenu` |
| `/local/:branchId/menu/extras` | `LocalExtras` | `local.canToggleAvailability` |

### 3.5 Reportes
| Ruta | Componente | Permiso V2 |
|------|------------|------------|
| `/local/:branchId/reportes/ventas` | `LocalReportesVentas` | `local.canViewSalesReports` |
| `/local/:branchId/reportes/resultados` | `LocalFinanceReports` | `local.canViewLocalPnL` |
| `/local/:branchId/reportes/cmv` | `LocalCMVReport` | `local.canViewCMV` |
| `/local/:branchId/reportes/movimientos-stock` | `LocalReportesMovimientosStock` | `local.canViewStockMovements` |

### 3.6 Equipo
| Ruta | Componente | Permiso V2 |
|------|------------|------------|
| `/local/:branchId/equipo` | `LocalUsuarios` | `local.canViewTeam` |
| `/local/:branchId/equipo/mi-equipo` | `LocalTeam` | `local.canViewTeam` |
| `/local/:branchId/equipo/fichar` | `LocalRRHHFichajes` | `local.canViewAllClockIns` |
| `/local/:branchId/equipo/horarios` | `LocalRRHHHorarios` | `local.canEditSchedules` |
| `/local/:branchId/equipo/horas` | `LocalRRHHHoras` | `local.canViewMonthlyHours` |
| `/local/:branchId/equipo/liquidacion` | `LocalRRHHLiquidacion` | `local.canViewPayroll` |
| `/local/:branchId/equipo/adelantos` | `LocalAdelantos` | `local.canViewPayroll` |
| `/local/:branchId/equipo/apercibimientos` | `LocalApercibimientos` | `local.canViewTeam` |

### 3.7 Finanzas
| Ruta | Componente | Permiso V2 |
|------|------------|------------|
| `/local/:branchId/finanzas/movimientos` | `LocalTransactions` | `local.canViewFinanceMovements` |
| `/local/:branchId/finanzas/facturas` | `LocalFacturas` | `local.canViewInvoices` |
| `/local/:branchId/finanzas/obligaciones` | `LocalObligaciones` | `local.canViewObligaciones` |

### 3.8 Configuración
| Ruta | Componente | Permiso V2 |
|------|------------|------------|
| `/local/:branchId/config/local` | `LocalConfig` | `local.canEditLocalConfig` |
| `/local/:branchId/config/zonas` | `LocalDeliveryZones` | `local.canConfigDeliveryZones` |
| `/local/:branchId/config/integraciones` | `LocalIntegraciones` | `local.canConfigIntegrations` |
| `/local/:branchId/config/impresoras` | `LocalImpresoras` | `local.canConfigPrinters` |
| `/local/:branchId/config/kds` | `LocalKDSSettings` | `local.canConfigKDS` |
| `/local/:branchId/config/turnos` | `LocalShiftConfig` | `local.canConfigShifts` |

---

## 4. RUTAS MI MARCA (AdminRoute)

### 4.1 Visión General
| Ruta | Componente | Permiso V2 |
|------|------------|------------|
| `/admin` | `AdminHome` | `canAccessBrandPanel` |
| `/admin/resultados` | `ProfitLossReport` | `brand.canViewPnL` |
| `/admin/comparativa` | `BranchPerformance` | `brand.canViewComparativa` |

### 4.2 Mis Locales
| Ruta | Componente | Permiso V2 |
|------|------------|------------|
| `/admin/locales/:slug` | `BranchDetail` | `brand.canViewLocales` |
| `/admin/sucursales` | `Branches` | `brand.canViewLocales` |
| `/admin/sucursales/:branchId/productos` | `BranchProducts` | `brand.canViewProducts` |

### 4.3 Catálogo
| Ruta | Componente | Permiso V2 |
|------|------------|------------|
| `/admin/catalogo/productos` | `Products` | `brand.canViewProducts` |
| `/admin/catalogo/productos/nuevo` | `ProductForm` | `brand.canEditProducts` |
| `/admin/catalogo/productos/:productId` | `ProductForm` | `brand.canEditProducts` |
| `/admin/catalogo/modificadores` | `Modifiers` | `brand.canManageModifiers` |
| `/admin/catalogo/ingredientes` | `Ingredients` | `brand.canManageIngredients` |
| `/admin/catalogo/descuentos` | `Discounts` | `brand.canManagePromotions` |
| `/admin/catalogo/combos` | `Combos` | `brand.canEditProducts` |

### 4.4 Abastecimiento
| Ruta | Componente | Permiso V2 |
|------|------------|------------|
| `/admin/abastecimiento/proveedores` | `Suppliers` (import missing) | `brand.canManageSuppliers` |
| `/admin/abastecimiento/productos-obligatorios` | `MandatoryProducts` | `brand.canManageSuppliers` |
| `/admin/abastecimiento/alertas` | `PurchaseAlerts` | `brand.canManageSuppliers` |

### 4.5 Personas
| Ruta | Componente | Permiso V2 |
|------|------------|------------|
| `/admin/personas/equipo` | `CentralTeam` | `brand.canManageCentralTeam` |
| `/admin/personas/usuarios` | `UsersPage` | `brand.canSearchUsers` |
| `/admin/personas/roles` | `RoleTemplates` | `brand.canAssignRoles` |
| `/admin/overrides` | `UserBranchOverrides` | `isSuperadmin` |

### 4.6 Comunicación
| Ruta | Componente | Permiso V2 |
|------|------------|------------|
| `/admin/comunicacion/mensajes` | `Messages` | `brand.canManageMessages` |

### 4.7 Configuración
| Ruta | Componente | Permiso V2 |
|------|------------|------------|
| `/admin/config/marca` | `BrandSettings` | `brand.canEditBrandConfig` |
| `/admin/config/canales` | `Channels` | `brand.canManageChannels` |
| `/admin/config/integraciones` | `Integrations` | `brand.canManageIntegrations` |
| `/admin/config/notificaciones` | `Notifications` | `brand.canEditBrandConfig` |

---

## 5. ESTADO DE MIGRACIÓN

### ✅ Completado
- [x] 25 archivos migrados de `useUserRole` → `usePermissionsV2`
- [x] SQL: `has_branch_access` e `is_admin` usan `user_roles_v2`
- [x] Guards: `RequireAdmin` y `RequireLocal` usan `useRoleLandingV2`

### ⚠️ Pendiente
- [ ] Eliminar hooks legacy (`useUserRole.tsx`, `useUserRoles.ts`)
- [ ] Verificar protección de rutas individuales con permisos granulares
- [ ] Agregar `RequirePermission` component para permisos específicos

---

## 6. MATRIZ DE ROLES → ACCESO A PANELES

| Rol | Mi Marca | Mi Local | Requiere branch_ids |
|-----|----------|----------|---------------------|
| `superadmin` | ✅ | ✅ (todos) | ❌ |
| `coordinador` | ✅ | ❌ | ❌ |
| `informes` | ✅ (solo lectura) | ❌ | ❌ |
| `contador_marca` | ✅ (finanzas) | ❌ | ❌ |
| `franquiciado` | ❌ | ✅ | ✅ |
| `encargado` | ❌ | ✅ | ✅ |
| `contador_local` | ❌ | ✅ | ✅ |
| `cajero` | ❌ | ✅ | ✅ |
| `empleado` | ❌ | ✅ (solo KDS/fichaje) | ✅ |
