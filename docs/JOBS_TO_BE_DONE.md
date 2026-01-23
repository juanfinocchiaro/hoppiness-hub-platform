# Jobs-to-be-Done por Avatar

Auditoría formal de las tareas principales de cada rol y su ruta en el sistema.

## 1. Admin / Dueño de Marca (`brand_owner`)
**Scope:** `brand` | **Landing:** `/admin`

| # | Tarea Semanal | Ruta | Estado |
|---|---------------|------|--------|
| 1 | Revisar ventas consolidadas | `/admin` → Dashboard | ✅ |
| 2 | Comparar rendimiento entre locales | `/admin/reportes` | ✅ |
| 3 | Gestionar catálogo de productos | `/admin/productos` | ✅ |
| 4 | Administrar modificadores | `/admin/modificadores` | ✅ |
| 5 | Revisar costos de ingredientes | `/admin/ingredientes` | ✅ |
| 6 | Gestionar proveedores maestros | `/admin/proveedores` | ✅ |
| 7 | Administrar usuarios y permisos | `/admin/usuarios`, `/admin/permisos` | ✅ |
| 8 | Configurar descuentos globales | `/admin/descuentos` | ✅ |
| 9 | Revisar finanzas de marca | `/admin/finanzas` | ✅ |
| 10 | Acceder a cualquier local | Dashboard → "Ir a Mi Local" | ✅ |

---

## 2. Socio (`partner`)
**Scope:** `brand` | **Landing:** `/admin/reportes`

| # | Tarea Semanal | Ruta | Estado |
|---|---------------|------|--------|
| 1 | Ver reportes financieros consolidados | `/admin/reportes` | ✅ |
| 2 | Revisar ingresos por local | `/admin/reportes` (filtros) | ✅ |
| 3 | Analizar tendencias de ventas | `/admin/reportes` (gráficos) | ✅ |
| 4 | Exportar datos a Excel | Reportes → Exportar | ✅ |
| 5 | Comparar performance entre sucursales | `/admin/reportes` (heatmap) | ✅ |

**Nota:** El socio NO opera, solo visualiza reportes financieros.

---

## 3. Coordinador Digital (`coordinator`)
**Scope:** `brand` | **Landing:** `/admin`

| # | Tarea Semanal | Ruta | Estado |
|---|---------------|------|--------|
| 1 | Actualizar catálogo de productos | `/admin/productos` | ✅ |
| 2 | Configurar modificadores | `/admin/modificadores` | ✅ |
| 3 | Gestionar ingredientes maestros | `/admin/ingredientes` | ✅ |
| 4 | Administrar usuarios globales | `/admin/usuarios` | ✅ |
| 5 | Revisar reportes de ventas | `/admin/reportes` | ✅ |
| 6 | Configurar proveedores | `/admin/proveedores` | ✅ |
| 7 | Acceder a locales para soporte | Dashboard → "Ir a Mi Local" | ✅ |

---

## 4. Franquiciado / Dueño de Local (`franchise_owner`)
**Scope:** `franchise` | **Landing:** `/local/{branchId}`

| # | Tarea Semanal | Ruta | Estado |
|---|---------------|------|--------|
| 1 | Revisar ventas del día/semana | Dashboard Local | ✅ |
| 2 | Consultar P&L del local | `/local/{id}/finanzas/pnl` | ✅ |
| 3 | Gestionar stock e inventario | `/local/{id}/stock` | ✅ |
| 4 | Cargar gastos y facturas | `/local/{id}/finanzas/transacciones` | ✅ |
| 5 | Revisar horarios del personal | `/local/{id}/rrhh/horarios` | ✅ |
| 6 | Procesar liquidación de sueldos | `/local/{id}/rrhh/liquidacion` | ✅ |
| 7 | Gestionar proveedores locales | `/local/{id}/proveedores` | ✅ |
| 8 | Configurar zonas de delivery | `/local/{id}/config/zonas` | ✅ |
| 9 | Revisar fichajes del personal | `/local/{id}/rrhh/fichajes` | ✅ |
| 10 | Administrar colaboradores | `/local/{id}/rrhh/colaboradores` | ✅ |

---

## 5. Encargado / Gerente (`manager`)
**Scope:** `branch` | **Landing:** `/local/{branchId}`

| # | Tarea Semanal | Ruta | Estado |
|---|---------------|------|--------|
| 1 | Gestionar pedidos activos | `/local/{id}/pedidos` | ✅ |
| 2 | Controlar asistencia del personal | `/local/{id}/rrhh/fichajes` | ✅ |
| 3 | Actualizar disponibilidad de productos | `/local/{id}/disponibilidad` | ✅ |
| 4 | Abrir/cerrar caja | `/local/{id}/finanzas/caja` | ✅ |
| 5 | Gestionar horarios semanales | `/local/{id}/rrhh/horarios` | ✅ |
| 6 | Resolver problemas de pedidos | `/local/{id}/pedidos` → Detalles | ✅ |
| 7 | Revisar stock crítico | Dashboard → Alertas | ✅ |
| 8 | Cargar gastos operativos | `/local/{id}/finanzas/transacciones` | ✅ |
| 9 | Operar POS si es necesario | `/local/{id}` → POS | ✅ |
| 10 | Revisar métricas del turno | Dashboard Local | ✅ |

---

## 6. Cajero (`cashier`)
**Scope:** `branch` | **Landing:** `/local/{branchId}` → POS directo

| # | Tarea Diaria | Ruta | Estado |
|---|--------------|------|--------|
| 1 | Procesar ventas (POS) | POS View | ✅ |
| 2 | Cobrar pedidos | POS → Checkout | ✅ |
| 3 | Aplicar descuentos | POS → Descuentos | ✅ |
| 4 | Dividir pagos | POS → Split Payment | ✅ |
| 5 | Abrir/cerrar turno de caja | Caja → Turno | ✅ |
| 6 | Registrar movimientos de caja | Caja → Movimientos | ✅ |
| 7 | Ver estado de pedidos | POS → Lista | ✅ |
| 8 | Cancelar/modificar pedidos | POS → Cancelar | ✅ |
| 9 | Generar facturas | POS → Facturar | ✅ |
| 10 | Consultar ventas del turno | Dashboard (limitado) | ✅ |

---

## 7. KDS / Cocina (`kds`)
**Scope:** `branch` | **Landing:** `/local/{branchId}` → KDS directo

| # | Tarea Operativa | Ruta | Estado |
|---|-----------------|------|--------|
| 1 | Ver pedidos en preparación | KDS View | ✅ |
| 2 | Marcar ítems como listos | KDS → Completar | ✅ |
| 3 | Ver detalles de modificadores | KDS → Expandir | ✅ |
| 4 | Filtrar por estación | KDS → Tabs | ✅ |
| 5 | Priorizar pedidos urgentes | KDS → Ordenar | ✅ |

---

## 8. Empleado General (`employee`)
**Scope:** `branch` | **Landing:** `/local/{branchId}` o `/`

| # | Tarea | Ruta | Estado |
|---|-------|------|--------|
| 1 | Fichar entrada/salida | `/fichar` | ✅ |
| 2 | Ver horario asignado | `/cuenta` → MyScheduleCard | ✅ |
| 3 | Consultar información básica | Dashboard (muy limitado) | ✅ |

---

## Resumen de Gaps Detectados

| Gap | Avatar Afectado | Prioridad | Estado |
|-----|-----------------|-----------|--------|
| Vista de "Mi horario" para empleados | `employee` | Media | ✅ Completado |
| Checklist diario de apertura/cierre | `manager` | Baja | 🔲 Futuro |
| Notificaciones push de alertas | Todos | Media | 🔲 Futuro |

---

## Matriz de Acceso Rápido

| Avatar | POS | KDS | Dashboard | Reportes | RRHH | Finanzas | Catálogo |
|--------|-----|-----|-----------|----------|------|----------|----------|
| brand_owner | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| partner | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ |
| coordinator | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| franchise_owner | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| manager | ✅ | ✅ | ✅ | ⚠️ | ✅ | ⚠️ | ❌ |
| cashier | ✅ | ❌ | ⚠️ | ❌ | ❌ | ⚠️ | ❌ |
| kds | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| employee | ❌ | ❌ | ⚠️ | ❌ | ⚠️ | ❌ | ❌ |

**Leyenda:** ✅ Acceso completo | ⚠️ Acceso limitado | ❌ Sin acceso
