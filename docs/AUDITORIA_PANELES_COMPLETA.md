# AUDITORÍA COMPLETA - PANELES MI LOCAL Y MI MARCA

**Fecha:** 2026-01-20  
**Versión:** 1.0

---

## PARTE 1: MI LOCAL (`/local/:branchId`)

### Archivo Layout Principal
- **Archivo:** `src/pages/local/LocalLayout.tsx` (639 líneas)
- **Funcionalidad:** Sidebar colapsable, selector de sucursal, integración POS/KDS inline

---

### 1.1 ESCRITORIO (Dashboard)

| Campo | Valor |
|-------|-------|
| **Ruta** | `/local/:branchId` |
| **Archivo** | `src/pages/local/LocalDashboard.tsx` (594 líneas) |
| **Tablas DB** | `orders`, `order_items`, `attendance_logs`, `branches` |

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ RoleWelcomeCard (saludo según avatar)                       │
│ Header: Nombre sucursal + Badge Abierto/Cerrado             │
│ Badges de canales activos (DEL, TA, AP, RAP, PYA, MPD)      │
├─────────────────────────────────────────────────────────────┤
│ FilterBar (sticky): Período + Canal                         │
├─────────────────────────────────────────────────────────────┤
│ 4 Cards KPI:                                                │
│ - Ventas del período ($)                                    │
│ - Unidades vendidas                                         │
│ - Ticket Promedio                                           │
│ - Pedidos Activos                                           │
├─────────────────────────────────────────────────────────────┤
│ Card: Ventas por Canal (barras de progreso)                 │
├─────────────────────────────────────────────────────────────┤
│ Card: Productividad del Mes                                 │
│ - Horas trabajadas                                          │
│ - Unidades/hora                                             │
├─────────────────────────────────────────────────────────────┤
│ OrdersHeatmap: Mapa de calor por hora/día                   │
│ RecentCompletedOrders: Últimos pedidos entregados           │
└─────────────────────────────────────────────────────────────┘
```

**Componentes:**
| Componente | Ubicación | Descripción |
|------------|-----------|-------------|
| `DashboardFilterBar` | Sticky top | Filtro período (Hoy/Semana/Mes) y canal |
| `RoleWelcomeCard` | Top | Bienvenida personalizada según rol |
| `OrdersHeatmap` | Centro | Visualización de pedidos por hora |
| `RecentCompletedOrders` | Bottom | Lista de pedidos recientes |

**Datos mostrados:**
- Ventas: `SUM(orders.total)` filtrado por período/canal
- Unidades: `SUM(order_items.quantity)`
- Ticket promedio: `ventas / cantidad_pedidos`
- Pedidos activos: `orders WHERE status IN (pending, preparing, confirmed)`
- Horas: calculado desde `attendance_logs` (IN/OUT)

**Funcionalidad:**
- ✅ Estadísticas en tiempo real con refresh cada 60s
- ✅ Filtros por período y canal
- ✅ Cálculo de productividad (unidades/hora)
- ✅ Realtime subscription para updates de branch
- ⚠️ Heatmap puede estar vacío si no hay datos

---

### 1.2 OPERACIÓN

#### 1.2.1 Tomar Pedidos (POS)

| Campo | Valor |
|-------|-------|
| **Ruta** | Inline en Layout (no tiene ruta propia) |
| **Archivo** | `src/components/pos/POSView.tsx` |
| **Tablas DB** | `products`, `branch_products`, `product_categories`, `orders`, `order_items`, `modifier_options`, `customers` |

**Layout:**
```
┌──────────────────────────────────────────────────────────────┐
│ Tabs de categorías (scrollable horizontal)                   │
├──────────────────────────────────────────────────────────────┤
│ Grid de productos (cards con imagen, nombre, precio)         │
│ - Click para agregar al carrito                              │
│ - Badge de cantidad si está en carrito                       │
├──────────────────────────────────────────────────────────────┤
│ Panel lateral: Carrito                                       │
│ - Lista de items                                             │
│ - Modificadores expandibles                                  │
│ - Subtotal, descuentos, propina                              │
│ - Selector de cliente                                        │
│ - Botón checkout                                             │
└──────────────────────────────────────────────────────────────┘
```

**Funcionalidad:**
- ✅ Agregar productos al carrito
- ✅ Modificadores por producto
- ✅ Búsqueda de cliente existente
- ✅ Crear cliente nuevo inline
- ✅ Aplicar descuentos
- ✅ Split payment
- ✅ Propina
- ✅ Checkout con múltiples métodos de pago
- ✅ Impresión de ticket (si hay impresora configurada)

---

#### 1.2.2 Cocina (KDS)

| Campo | Valor |
|-------|-------|
| **Ruta** | Inline en Layout (no tiene ruta propia) |
| **Archivo** | `src/components/pos/KDSView.tsx` |
| **Tablas DB** | `orders`, `order_items`, `products` |

**Layout:**
```
┌──────────────────────────────────────────────────────────────┐
│ Cards de pedidos activos (ordenados por tiempo)              │
│ - Número de pedido                                           │
│ - Tiempo transcurrido                                        │
│ - Lista de items                                             │
│ - Botón: Marcar Listo                                        │
└──────────────────────────────────────────────────────────────┘
```

**Funcionalidad:**
- ✅ Vista de pedidos en preparación
- ✅ Realtime updates
- ✅ Cambiar estado a "ready"
- ✅ Timer visual por pedido

---

#### 1.2.3 Gestor de Pedidos

| Campo | Valor |
|-------|-------|
| **Ruta** | `/local/:branchId/pedidos` |
| **Archivo** | `src/pages/local/LocalPedidos.tsx` (586 líneas) |
| **Tablas DB** | `orders`, `order_items`, `order_cancellations`, `products` |

**Layout:**
```
┌──────────────────────────────────────────────────────────────┐
│ Header: "Pedidos" + Botón Actualizar                         │
├──────────────────────────────────────────────────────────────┤
│ Tabs: [Activos (badge)] [Completados] [Buscar/Historial]     │
├──────────────────────────────────────────────────────────────┤
│ Tab Activos:                                                 │
│ - Grid de OrderCards                                         │
│ - Cada card: cliente, items, estado, botón avanzar           │
│ - Botón cancelar → Dialog con motivo                         │
├──────────────────────────────────────────────────────────────┤
│ Tab Completados:                                             │
│ - Grid de pedidos entregados/cancelados del día              │
├──────────────────────────────────────────────────────────────┤
│ Tab Historial:                                               │
│ - Buscador + Tabla con todos los pedidos                     │
│ - Exportar a Excel                                           │
└──────────────────────────────────────────────────────────────┘
```

**Botones/Acciones:**
| Botón | Acción | Destino/Efecto |
|-------|--------|----------------|
| Actualizar | Click | Refetch pedidos |
| Avanzar Estado | Click | pending→confirmed→preparing→ready→delivered |
| Cancelar | Click | Abre dialog con motivos de cancelación |
| Exportar Excel | Click | Descarga archivo .xlsx |

**Funcionalidad:**
- ✅ Realtime subscription para nuevos pedidos
- ✅ Flujo de estados completo
- ✅ Cancelación con auditoría (motivo requerido)
- ✅ Exportación a Excel
- ✅ Búsqueda por nombre/teléfono/ID

---

#### 1.2.4 Historial

| Campo | Valor |
|-------|-------|
| **Ruta** | `/local/:branchId/historial` |
| **Archivo** | `src/pages/local/LocalHistorial.tsx` (368 líneas) |
| **Tablas DB** | `orders`, `order_items`, `products` |

**Layout:**
```
┌──────────────────────────────────────────────────────────────┐
│ Header: "Historial de Pedidos" + Actualizar + Exportar       │
├──────────────────────────────────────────────────────────────┤
│ Stats: Total pedidos | Ingresos | Entregados | Cancelados    │
├──────────────────────────────────────────────────────────────┤
│ Filtros:                                                     │
│ - Buscar (nombre/teléfono/ID)                                │
│ - Período (Hoy/Ayer/Semana/Mes/Custom)                       │
│ - Estado (Todos/Entregado/Cancelado/etc)                     │
│ - Canal (Todos/Mostrador/Delivery/etc)                       │
├──────────────────────────────────────────────────────────────┤
│ Tabla expandible:                                            │
│ - Fecha | Cliente | Canal | Estado | Total                   │
│ - Expandir → ver items del pedido                            │
└──────────────────────────────────────────────────────────────┘
```

**Funcionalidad:**
- ✅ Filtros combinables
- ✅ Fechas personalizadas con calendar picker
- ✅ Filas expandibles para ver detalle
- ✅ Exportar a Excel

---

### 1.3 MENÚ LOCAL

#### 1.3.1 Productos

| Campo | Valor |
|-------|-------|
| **Ruta** | `/local/:branchId/productos` |
| **Archivo** | `src/pages/local/LocalProductos.tsx` (441 líneas) |
| **Tablas DB** | `branch_products`, `products`, `product_categories`, `availability_logs` |

**Layout:**
```
┌──────────────────────────────────────────────────────────────┐
│ Header: "Productos" + Badge "X sin stock"                    │
├──────────────────────────────────────────────────────────────┤
│ Buscador                                                     │
├──────────────────────────────────────────────────────────────┤
│ Lista colapsable por categoría:                              │
│ ▸ Hamburguesas (12) [2 sin stock]                            │
│   └ Card: Imagen | Nombre | Precio | Switch disponibilidad  │
│ ▸ Bebidas (8)                                                │
│   └ ...                                                      │
└──────────────────────────────────────────────────────────────┘
```

**Funcionalidad:**
- ✅ Toggle disponibilidad por producto
- ✅ Al desactivar: requiere motivo (sin_stock, rotura, etc)
- ✅ Log de cambios de disponibilidad
- ✅ Tooltip con historial de cambio

---

#### 1.3.2 Extras / Modificadores

| Campo | Valor |
|-------|-------|
| **Ruta** | `/local/:branchId/extras` |
| **Archivo** | `src/pages/local/LocalExtras.tsx` (423 líneas) |
| **Tablas DB** | `branch_modifier_options`, `modifier_options`, `modifier_groups`, `availability_logs` |

**Layout:**
```
┌──────────────────────────────────────────────────────────────┐
│ Header: "Extras / Modificadores" + Badge "X sin stock"       │
├──────────────────────────────────────────────────────────────┤
│ Buscador                                                     │
├──────────────────────────────────────────────────────────────┤
│ Lista colapsable por grupo de modificadores:                 │
│ ▸ Extras (+$) (6)                                            │
│   └ Card: Nombre | +$precio | Switch disponibilidad         │
│ ▸ Sin... (0$) (4)                                            │
│   └ ...                                                      │
└──────────────────────────────────────────────────────────────┘
```

**Funcionalidad:**
- ✅ Toggle disponibilidad por modificador
- ✅ Motivo requerido al desactivar
- ✅ Similar a productos

---

### 1.4 STOCK & INVENTARIO

#### 1.4.1 Stock Ingredientes

| Campo | Valor |
|-------|-------|
| **Ruta** | `/local/:branchId/stock` |
| **Archivo** | `src/pages/local/LocalStock.tsx` (395 líneas) |
| **Tablas DB** | `ingredients`, `branch_ingredients`, `stock_movements` |

**Layout:**
```
┌──────────────────────────────────────────────────────────────┐
│ Header: "Stock de Ingredientes"                              │
├──────────────────────────────────────────────────────────────┤
│ Cards: Ingredientes (total) | Stock Bajo (alarma)            │
├──────────────────────────────────────────────────────────────┤
│ Filtros: Buscar | Botón "Stock Bajo"                         │
├──────────────────────────────────────────────────────────────┤
│ Tabla:                                                       │
│ Ingrediente | Categoría | Stock | Mínimo | Costo | Estado | +│
│ - Botón "+ Movimiento" → Dialog                              │
└──────────────────────────────────────────────────────────────┘
```

**Dialog Movimiento:**
- Tipo: Compra/Ajuste/Merma/Transferencia entrada/salida
- Cantidad + Costo unitario (si compra)
- Notas

**Funcionalidad:**
- ✅ Ver stock actual vs mínimo
- ✅ Registrar movimientos
- ✅ Actualiza `branch_ingredients.current_stock` via trigger
- ✅ Filtrar por stock bajo

---

#### 1.4.2 Conteo Inventario

| Campo | Valor |
|-------|-------|
| **Ruta** | `/local/:branchId/inventario` |
| **Archivo** | `src/pages/local/LocalInventory.tsx` (503 líneas) |
| **Tablas DB** | `inventory_counts`, `inventory_count_lines`, `ingredients`, `branch_ingredients`, `stock_movements` |

**Layout:**
```
┌──────────────────────────────────────────────────────────────┐
│ Vista 1: Sin conteo activo                                   │
│ - Historial de conteos anteriores                            │
│ - Botón "Iniciar Conteo" → Dialog tipo (Semanal/Mensual)     │
├──────────────────────────────────────────────────────────────┤
│ Vista 2: Conteo en progreso                                  │
│ - Cards: Contados | Con diferencias | Progreso %             │
│ - Buscador                                                   │
│ - Tabla: Ingrediente | Sistema | Contado | Diferencia        │
│ - Input para ingresar cantidad contada                       │
│ - Textarea notas                                             │
│ - Botones: Guardar Progreso | Finalizar Conteo               │
└──────────────────────────────────────────────────────────────┘
```

**Funcionalidad:**
- ✅ Iniciar conteo semanal o mensual
- ✅ Guardar progreso parcial
- ✅ Calcular diferencias sistema vs físico
- ✅ Al finalizar: genera `stock_movements` de ajuste automático
- ✅ Historial de conteos

---

#### 1.4.3 Reporte CMV

| Campo | Valor |
|-------|-------|
| **Ruta** | `/local/:branchId/cmv` |
| **Archivo** | `src/pages/local/LocalCMVReport.tsx` (561 líneas) |
| **Tablas DB** | `ingredients`, `inventory_counts`, `inventory_count_lines`, `stock_movements`, `branch_ingredients` |

**Layout:**
```
┌──────────────────────────────────────────────────────────────┐
│ Header: "Reporte CMV" + Selector mes + Exportar              │
├──────────────────────────────────────────────────────────────┤
│ Cards: CMV Total | CMV Alimentos | Bebidas | Categorías      │
├──────────────────────────────────────────────────────────────┤
│ Desglose por categoría (colapsable):                         │
│ ▸ CMV Alimentos ($XXX) 45%                                   │
│   └ Tabla: Ingrediente | St.Ini | Compras | St.Fin | Consumo │
│ ▸ Bebidas con Alcohol ($XXX) 15%                             │
│   └ ...                                                      │
└──────────────────────────────────────────────────────────────┘
```

**Fórmula CMV:** `Stock Inicial + Compras - Stock Final = Consumo`

**Funcionalidad:**
- ✅ Cálculo automático de CMV por categoría
- ✅ Requiere conteos mensuales para funcionar
- ✅ Exportar a Excel
- ⚠️ Si no hay conteos mensuales, muestra vacío

---

### 1.5 CLIENTES

#### 1.5.1 Cuenta Corriente

| Campo | Valor |
|-------|-------|
| **Ruta** | `/local/:branchId/clientes` |
| **Archivo** | `src/pages/local/LocalCustomers.tsx` |
| **Tablas DB** | `customers`, `branch_customer_accounts`, `customer_account_movements` |

**Funcionalidad:**
- ✅ Lista de clientes con cuenta corriente
- ✅ Ver saldo
- ✅ Registrar pagos/consumos

---

### 1.6 FINANZAS

#### 1.6.1 Ledger (Transacciones)

| Campo | Valor |
|-------|-------|
| **Ruta** | `/local/:branchId/transacciones` |
| **Archivo** | `src/pages/local/LocalTransactions.tsx` (870 líneas) |
| **Tablas DB** | `transactions`, `coa_accounts`, `suppliers` |

**Layout:**
```
┌──────────────────────────────────────────────────────────────┐
│ Header: "Ledger" + Nueva transacción                         │
├──────────────────────────────────────────────────────────────┤
│ Filtros: Período | Tipo | Cuenta                             │
├──────────────────────────────────────────────────────────────┤
│ Tabla:                                                       │
│ Fecha | Concepto | Cuenta | Tipo | Monto | Proveedor | Estado│
└──────────────────────────────────────────────────────────────┘
```

**Funcionalidad:**
- ✅ Registrar ingresos y gastos
- ✅ Clasificar por cuenta contable (COA)
- ✅ Vincular a proveedor
- ✅ Subir comprobante
- ✅ Estados de pago (pendiente, pagado, devengado)

---

#### 1.6.2 Caja

| Campo | Valor |
|-------|-------|
| **Ruta** | `/local/:branchId/caja` |
| **Archivo** | `src/pages/local/LocalCaja.tsx` (1117 líneas) |
| **Tablas DB** | `cash_registers`, `cash_register_shifts`, `cash_register_movements` |

**Layout:**
```
┌──────────────────────────────────────────────────────────────┐
│ Tabs: Una tab por caja registradora                          │
├──────────────────────────────────────────────────────────────┤
│ Estado de turno: Abierto/Cerrado                             │
│ - Si cerrado: Botón "Abrir Turno" → Dialog monto inicial     │
│ - Si abierto: Monto actual, movimientos, botón cerrar        │
├──────────────────────────────────────────────────────────────┤
│ Movimientos del turno:                                       │
│ - Lista de ingresos/egresos                                  │
│ - Botón "+ Ingreso" / "+ Egreso"                             │
├──────────────────────────────────────────────────────────────┤
│ Arqueo de cierre:                                            │
│ - Ingresar monto declarado                                   │
│ - Mostrar diferencia vs esperado                             │
└──────────────────────────────────────────────────────────────┘
```

**Funcionalidad:**
- ✅ Múltiples cajas registradoras
- ✅ Abrir/cerrar turnos
- ✅ Registrar movimientos manuales
- ✅ Arqueo de cierre con diferencia
- ✅ Historial de turnos

---

#### 1.6.3 Proveedores (Local)

| Campo | Valor |
|-------|-------|
| **Ruta** | `/local/:branchId/proveedores` |
| **Archivo** | `src/pages/local/LocalSuppliers.tsx` |
| **Tablas DB** | `suppliers`, `branch_suppliers`, `transactions` |

**Funcionalidad:**
- ✅ Ver proveedores asignados a la sucursal
- ✅ Ver saldo con cada proveedor
- ✅ Registrar pagos

---

#### 1.6.4 Facturas

| Campo | Valor |
|-------|-------|
| **Ruta** | `/local/:branchId/facturas` |
| **Archivo** | `src/pages/local/LocalFacturas.tsx` |
| **Tablas DB** | `invoices`, `orders` |

**Funcionalidad:**
- ✅ Lista de facturas emitidas
- ✅ Generar factura desde pedido
- ⚠️ Requiere integración Facturante configurada

---

#### 1.6.5 Obligaciones

| Campo | Valor |
|-------|-------|
| **Ruta** | `/local/:branchId/obligaciones` |
| **Archivo** | `src/pages/local/LocalObligaciones.tsx` |
| **Tablas DB** | `transactions` (filtrado por due_date) |

**Funcionalidad:**
- ✅ Ver pagos pendientes por fecha de vencimiento
- ✅ Calendario de obligaciones

---

#### 1.6.6 Reportes Financieros

| Campo | Valor |
|-------|-------|
| **Ruta** | `/local/:branchId/reportes` |
| **Archivo** | `src/pages/local/LocalFinanceReports.tsx` |

**Funcionalidad:**
- ✅ P&L del local
- ✅ Gráficos de tendencias

---

### 1.7 RRHH

#### 1.7.1 Usuarios (Local)

| Campo | Valor |
|-------|-------|
| **Ruta** | `/local/:branchId/usuarios` |
| **Archivo** | `src/pages/local/LocalUsuarios.tsx` |
| **Tablas DB** | `user_branch_access`, `auth.users`, `user_roles` |

**Funcionalidad:**
- ✅ Ver usuarios con acceso a la sucursal
- ⚠️ Invitar nuevo staff (requiere edge function)

---

#### 1.7.2 Fichajes

| Campo | Valor |
|-------|-------|
| **Ruta** | `/local/:branchId/rrhh/fichajes` |
| **Archivo** | `src/pages/local/LocalRRHHFichajes.tsx` (28 líneas - wrapper) |
| **Componentes** | `EmployeeDetailManager`, `OperationalStaffManager` |
| **Tablas DB** | `employees`, `employee_private_details`, `attendance_logs` |

**Layout:**
```
┌──────────────────────────────────────────────────────────────┐
│ EmployeeDetailManager:                                       │
│ - Lista de empleados con datos personales                    │
│ - Expandir para ver/editar DNI, CBU, contacto emergencia     │
├──────────────────────────────────────────────────────────────┤
│ OperationalStaffManager:                                     │
│ - Fichajes del día (quién está adentro)                      │
│ - Botones marcar entrada/salida                              │
└──────────────────────────────────────────────────────────────┘
```

**Funcionalidad:**
- ✅ Ver/editar datos de empleados
- ✅ Registrar entrada/salida manual
- ✅ Ver quién está activo ahora

---

#### 1.7.3 Horarios

| Campo | Valor |
|-------|-------|
| **Ruta** | `/local/:branchId/rrhh/horarios` |
| **Archivo** | `src/pages/local/LocalRRHHHorarios.tsx` |
| **Tablas DB** | `employee_schedules`, `employees` |

**Funcionalidad:**
- ✅ Definir horarios semanales por empleado
- ✅ Vista calendario mensual

---

#### 1.7.4 Horas del Mes

| Campo | Valor |
|-------|-------|
| **Ruta** | `/local/:branchId/rrhh/horas` |
| **Archivo** | `src/pages/local/LocalRRHHHoras.tsx` |
| **Tablas DB** | `attendance_logs`, `employees` |

**Funcionalidad:**
- ✅ Resumen de horas trabajadas por empleado
- ✅ Comparativa vs horas esperadas

---

#### 1.7.5 Liquidación

| Campo | Valor |
|-------|-------|
| **Ruta** | `/local/:branchId/rrhh/liquidacion` |
| **Archivo** | `src/pages/local/LocalRRHHLiquidacion.tsx` |
| **Tablas DB** | `employees`, `employee_private_details`, `attendance_logs` |

**Funcionalidad:**
- ✅ Calcular liquidación basada en horas × tarifa
- ✅ Exportar a Excel

---

### 1.8 CONFIGURACIÓN

#### 1.8.1 Mi Sucursal

| Campo | Valor |
|-------|-------|
| **Ruta** | `/local/:branchId/config` |
| **Archivo** | `src/pages/local/LocalConfig.tsx` |
| **Tablas DB** | `branches` |

**Funcionalidad:**
- ✅ Editar datos básicos (nombre, dirección, teléfono)
- ✅ Horarios de atención
- ✅ Toggle canales de venta

---

#### 1.8.2 Integraciones

| Campo | Valor |
|-------|-------|
| **Ruta** | `/local/:branchId/integraciones` |
| **Archivo** | `src/pages/local/LocalIntegraciones.tsx` |
| **Tablas DB** | `branches` (campos de API keys) |

**Funcionalidad:**
- ✅ Configurar Rappi, PedidosYa, MercadoPago
- ✅ Guardar API keys
- ⚠️ Facturante requiere configuración especial

---

#### 1.8.3 Zonas Delivery

| Campo | Valor |
|-------|-------|
| **Ruta** | `/local/:branchId/zonas-delivery` |
| **Archivo** | `src/pages/local/LocalDeliveryZones.tsx` |
| **Tablas DB** | `delivery_zones` |

**Funcionalidad:**
- ✅ Crear/editar zonas con Google Maps
- ✅ Dibujar polígonos o círculos
- ✅ Definir costo, pedido mínimo, tiempo estimado

---

#### 1.8.4 Impresoras

| Campo | Valor |
|-------|-------|
| **Ruta** | `/local/:branchId/impresoras` |
| **Archivo** | `src/pages/local/LocalImpresoras.tsx` |

**Funcionalidad:**
- ⚠️ Placeholder - requiere integración con servicio de impresión

---

#### 1.8.5 Configuración KDS

| Campo | Valor |
|-------|-------|
| **Ruta** | `/local/:branchId/kds-config` |
| **Archivo** | `src/pages/local/LocalKDSSettings.tsx` |

**Funcionalidad:**
- ✅ Configurar estaciones KDS

---

### RUTAS ADICIONALES EN MI LOCAL (no en menú principal)

| Ruta | Archivo | Descripción | En menú |
|------|---------|-------------|---------|
| `/local/:branchId/disponibilidad` | `LocalDisponibilidad.tsx` | Vista alternativa de disponibilidad | ❌ |
| `/local/:branchId/canales` | `LocalChannels.tsx` | Configuración de canales | ❌ |
| `/local/:branchId/disponibilidad-canales` | `LocalChannelAvailability.tsx` | Disponibilidad por canal | ❌ |
| `/local/:branchId/rrhh/colaboradores` | `LocalRRHHColaboradores.tsx` | Alias de fichajes | ❌ |
| `/local/:branchId/rrhh/sueldos` | `LocalRRHHSueldos.tsx` | Configuración sueldos | ❌ |
| `/attendance-kiosk/:branchId` | `AttendanceKiosk.tsx` | Kiosk para fichaje QR | ❌ (acceso directo) |

---

## PARTE 2: MI MARCA (`/admin`)

### Archivo Layout Principal
- **Archivo:** `src/pages/admin/Dashboard.tsx` (369 líneas)
- **Funcionalidad:** Sidebar colapsable con secciones

---

### 2.1 DASHBOARD

| Campo | Valor |
|-------|-------|
| **Ruta** | `/admin` |
| **Archivo** | `src/pages/admin/AdminHome.tsx` (550 líneas) |
| **Tablas DB** | `orders`, `order_items`, `branches`, `products`, `product_categories`, `attendance_logs` |

**Layout:**
```
┌──────────────────────────────────────────────────────────────┐
│ RoleWelcomeCard                                              │
│ Header: "Administración Central"                             │
├──────────────────────────────────────────────────────────────┤
│ Card: Resumen del Mes (todas las sucursales)                 │
│ - Facturación Total | Unidades | Ticket Promedio             │
│ - Total Pedidos | Horas Registradas | Productividad          │
├──────────────────────────────────────────────────────────────┤
│ Cards: Productos (link) | Sucursales                         │
├──────────────────────────────────────────────────────────────┤
│ Estado de Sucursales (read-only):                            │
│ - Cada sucursal con canales activos, ventas del mes          │
│ - Botón "Modificar" → BranchStatus                           │
└──────────────────────────────────────────────────────────────┘
```

**Funcionalidad:**
- ✅ Estadísticas consolidadas de toda la marca
- ✅ Vista rápida de estado de sucursales
- ✅ Link a modificar estado

---

### 2.2 SUCURSALES

| Campo | Valor |
|-------|-------|
| **Ruta** | `/admin/sucursales` |
| **Archivo** | `src/pages/admin/Branches.tsx` |
| **Tablas DB** | `branches` |

**Funcionalidad:**
- ✅ Lista de sucursales
- ✅ Crear/editar sucursal
- ✅ Ver productos por sucursal

---

### 2.3 CATÁLOGO

#### 2.3.1 Productos

| Campo | Valor |
|-------|-------|
| **Ruta** | `/admin/productos` |
| **Archivo** | `src/pages/admin/Products.tsx` (908 líneas) |
| **Tablas DB** | `products`, `product_categories`, `branches`, `branch_products`, `availability_schedules` |

**Layout:**
```
┌──────────────────────────────────────────────────────────────┐
│ Header: "Catálogo de Productos" + Nuevo + Categorías         │
├──────────────────────────────────────────────────────────────┤
│ Filtros: Buscar | Categoría | Estado (Todos/Activos/Dest.)   │
├──────────────────────────────────────────────────────────────┤
│ Lista por categoría (colapsable):                            │
│ ▸ Hamburguesas [⏰]                                          │
│   └ Fila: Imagen | Nombre | Precio | GP MNT NVC VA VCP | ⭐  │
│     - Click fila → Expandir inline editor                    │
│     - Click sucursal → Toggle habilitado                     │
│     - Click ⭐ → Toggle destacado                            │
└──────────────────────────────────────────────────────────────┘
```

**Botones:**
| Botón | Acción |
|-------|--------|
| + Nuevo Producto | Navega a `/admin/productos/nuevo` |
| Categorías | Abre CategoryManager dialog |
| ⏰ (categoría) | Schedule dialog |
| Toggle sucursal | Activa/desactiva en esa sucursal |
| ⭐ | Marca como destacado |
| 🗑️ | Eliminar producto (con confirmación) |

**Funcionalidad:**
- ✅ CRUD completo de productos
- ✅ Habilitar/deshabilitar por sucursal
- ✅ Inline editor para edición rápida
- ✅ Gestión de categorías
- ✅ Programación de disponibilidad

---

#### 2.3.2 Modificadores

| Campo | Valor |
|-------|-------|
| **Ruta** | `/admin/modificadores` |
| **Archivo** | `src/pages/admin/Modifiers.tsx` |
| **Tablas DB** | `modifier_groups`, `modifier_options`, `product_modifier_groups` |

**Funcionalidad:**
- ✅ Crear grupos de modificadores
- ✅ Crear opciones dentro de grupos
- ✅ Asignar grupos a productos
- ✅ Configurar min/max selecciones

---

### 2.4 INSUMOS & COMPRAS

#### 2.4.1 Ingredientes

| Campo | Valor |
|-------|-------|
| **Ruta** | `/admin/ingredientes` |
| **Archivo** | `src/pages/admin/Ingredients.tsx` |
| **Tablas DB** | `ingredients` |

**Funcionalidad:**
- ✅ CRUD de ingredientes maestros
- ✅ Definir unidad, categoría, costo
- ✅ Stock mínimo default

---

#### 2.4.2 Proveedores

| Campo | Valor |
|-------|-------|
| **Ruta** | `/admin/proveedores` |
| **Archivo** | `src/pages/admin/Suppliers.tsx` |
| **Tablas DB** | `suppliers`, `branch_suppliers` |

**Funcionalidad:**
- ✅ CRUD de proveedores
- ✅ Asignar a sucursales

---

#### 2.4.3 Control por Ingrediente

| Campo | Valor |
|-------|-------|
| **Ruta** | `/admin/control-proveedores` |
| **Archivo** | `src/pages/admin/IngredientSuppliers.tsx` |
| **Tablas DB** | `ingredient_suppliers`, `ingredients`, `suppliers` |

**Funcionalidad:**
- ✅ Vincular ingredientes con proveedores
- ✅ Definir precio por proveedor
- ✅ Ver alternativas

---

### 2.5 EQUIPO & ACCESOS

#### 2.5.1 Usuarios

| Campo | Valor |
|-------|-------|
| **Ruta** | `/admin/equipo` |
| **Archivo** | `src/pages/admin/Users.tsx` |
| **Tablas DB** | `user_roles`, `user_branch_access`, `user_panel_access`, `auth.users` |

**Funcionalidad:**
- ✅ Ver todos los usuarios
- ✅ Asignar roles
- ✅ Asignar acceso a sucursales
- ✅ Invitar nuevo usuario

---

#### 2.5.2 Plantillas de Permisos

| Campo | Valor |
|-------|-------|
| **Ruta** | `/admin/plantillas` |
| **Archivo** | `src/pages/admin/RoleTemplates.tsx` |
| **Tablas DB** | `brand_templates`, `brand_template_permissions` |

**Funcionalidad:**
- ✅ Crear plantillas de permisos
- ✅ Asignar permisos a plantillas
- ✅ Aplicar plantillas a usuarios

---

### 2.6 REPORTES

#### 2.6.1 Performance Locales

| Campo | Valor |
|-------|-------|
| **Ruta** | `/admin/performance` |
| **Archivo** | `src/pages/admin/BranchPerformance.tsx` |
| **Tablas DB** | `orders`, `branches` |

**Funcionalidad:**
- ✅ Comparativa de ventas entre sucursales
- ✅ Ranking de performance

---

#### 2.6.2 Ventas

| Campo | Valor |
|-------|-------|
| **Ruta** | `/admin/reportes` |
| **Archivo** | `src/pages/admin/SalesReports.tsx` |
| **Tablas DB** | `orders`, `order_items`, `products` |

**Funcionalidad:**
- ✅ Reportes de ventas por período
- ✅ Desglose por producto/categoría
- ✅ Exportar a Excel

---

#### 2.6.3 P&L Locales

| Campo | Valor |
|-------|-------|
| **Ruta** | `/admin/estado-resultados` |
| **Archivo** | `src/pages/admin/ProfitLossReport.tsx` |
| **Tablas DB** | `transactions`, `orders` |

**Funcionalidad:**
- ✅ Estado de resultados por sucursal
- ✅ Comparativa mensual

---

#### 2.6.4 Finanzas Marca

| Campo | Valor |
|-------|-------|
| **Ruta** | `/admin/finanzas-marca` |
| **Archivo** | `src/pages/admin/BrandFinances.tsx` |
| **Tablas DB** | `transactions`, `branches` |

**Funcionalidad:**
- ✅ Consolidado financiero de la marca
- ✅ Royalties por sucursal

---

### 2.7 MENSAJES

| Campo | Valor |
|-------|-------|
| **Ruta** | `/admin/mensajes` |
| **Archivo** | `src/pages/admin/Messages.tsx` |
| **Tablas DB** | `contact_messages` |

**Funcionalidad:**
- ✅ Bandeja de entrada de mensajes de contacto
- ✅ Filtros por asunto (Franquicia/Empleo/Pedidos/General)
- ✅ Marcar como leído
- ✅ Agregar notas internas
- ✅ Quick actions (WhatsApp, Email)
- ✅ Ver CV adjuntos (si empleo)

---

### RUTAS ADICIONALES EN MI MARCA (no en menú principal)

| Ruta | Archivo | Descripción | En menú |
|------|---------|-------------|---------|
| `/admin/estado-sucursales` | `BranchStatus.tsx` | Modificar estado de sucursales | ❌ (desde Dashboard) |
| `/admin/sucursales/:branchId/productos` | `BranchProducts.tsx` | Productos específicos de sucursal | ❌ |
| `/admin/productos/nuevo` | `ProductForm.tsx` | Crear producto | ❌ |
| `/admin/productos/:productId` | `ProductForm.tsx` | Editar producto | ❌ |
| `/admin/clientes` | `Customers.tsx` | Gestión de clientes | ❌ |
| `/admin/descuentos` | `Discounts.tsx` | Gestión de descuentos | ❌ |
| `/admin/escaner-comprobantes` | `InvoiceScanner.tsx` | Escanear facturas con OCR | ❌ |
| `/admin/canales` | `Channels.tsx` | Gestión de canales de venta | ❌ |
| `/admin/overrides` | `UserBranchOverrides.tsx` | Permisos específicos por sucursal | ❌ |

---

## PARTE 3: CÓDIGO NO VISIBLE

### 3.1 Rutas definidas pero no en menú

| Ruta | Archivo | Visible en menú |
|------|---------|-----------------|
| `/admin/clientes` | `Customers.tsx` | ❌ No |
| `/admin/descuentos` | `Discounts.tsx` | ❌ No |
| `/admin/escaner-comprobantes` | `InvoiceScanner.tsx` | ❌ No |
| `/admin/canales` | `Channels.tsx` | ❌ No |
| `/admin/overrides` | `UserBranchOverrides.tsx` | ❌ No |
| `/local/:branchId/disponibilidad` | `LocalDisponibilidad.tsx` | ❌ No (duplica productos) |
| `/local/:branchId/canales` | `LocalChannels.tsx` | ❌ No |
| `/local/:branchId/disponibilidad-canales` | `LocalChannelAvailability.tsx` | ❌ No |
| `/local/:branchId/rrhh/colaboradores` | `LocalRRHHColaboradores.tsx` | ❌ No |
| `/local/:branchId/rrhh/sueldos` | `LocalRRHHSueldos.tsx` | ❌ No |

### 3.2 Páginas públicas relacionadas

| Ruta | Archivo | Descripción |
|------|---------|-------------|
| `/menu` | Redirect a `/pedir` | Legacy redirect |
| `/menu/:branchSlug` | `MenuPublic.tsx` | Menú público de sucursal |
| `/nuestro-menu` | — | No existe (redirigir?) |

### 3.3 Tablas sin UI completa

| Tabla | UI disponible | Falta |
|-------|---------------|-------|
| `availability_schedules` | Parcial (ScheduleDialog) | Vista de todas las programaciones |
| `order_cancellations` | Solo escritura | Vista de auditoría de cancelaciones |
| `stock_movements` | Solo escritura | Vista de historial de movimientos |
| `customer_preferences` | No | Vista de preferencias de cliente |
| `customer_discounts` | No | Asignar descuentos a clientes |

---

## PARTE 4: RESUMEN EJECUTIVO

### Estadísticas

| Métrica | Cantidad |
|---------|----------|
| Total de páginas en Mi Local | 32 archivos |
| Total de páginas en Mi Marca | 23 archivos |
| Total de tablas en DB | 60+ |
| Rutas no visibles en menú | 10 |

### Funcionalidades por estado

| Estado | Cantidad | Lista |
|--------|----------|-------|
| ✅ Completo y funcional | 35 | Dashboard, POS, KDS, Pedidos, Historial, Productos, Extras, Stock, Inventario, CMV, Caja, Transacciones, Fichajes, Horarios, Horas, Liquidación, Config, Zonas Delivery, KDS Config, Admin Dashboard, Products, Modifiers, Ingredients, Suppliers, Users, Templates, Performance, Ventas, P&L, Finanzas Marca, Mensajes, Branches |
| ⚠️ Parcialmente funcional | 8 | Clientes CC (básico), Facturas (requiere Facturante), Obligaciones (básico), Impresoras (placeholder), Integraciones (requiere keys), Canales, Descuentos, InvoiceScanner |
| ❌ No funciona / Vacío | 2 | LocalDisponibilidad (duplicado), LocalRRHHSueldos (incompleto) |
| 👻 Existe pero no se ve | 10 | Customers, Discounts, Channels, Overrides, InvoiceScanner, LocalChannels, LocalChannelAvailability, LocalRRHHColaboradores, LocalRRHHSueldos |

### Recomendaciones

#### ELIMINAR (código muerto)
- `src/pages/local/LocalDisponibilidad.tsx` - Duplica funcionalidad de LocalProductos
- `src/pages/local/LocalRRHHColaboradores.tsx` - Alias de Fichajes

#### COMPLETAR (funcionalidad a medias)
- `src/pages/local/LocalImpresoras.tsx` - Implementar integración con servicio de impresión
- `src/pages/local/LocalRRHHSueldos.tsx` - Completar configuración de sueldos
- `src/pages/admin/Discounts.tsx` - Agregar al menú de Mi Marca
- `src/pages/admin/Customers.tsx` - Agregar al menú de Mi Marca

#### AGREGAR AL MENÚ
- Descuentos → Menú Mi Marca (sección Catálogo o nueva sección Comercial)
- Clientes → Menú Mi Marca (nueva sección CRM)
- Canales → Menú Mi Marca (sección Configuración)

#### NUEVA FUNCIONALIDAD SUGERIDA
- Vista de auditoría de cancelaciones de pedidos
- Dashboard de descuentos utilizados
- Vista de historial de movimientos de stock
