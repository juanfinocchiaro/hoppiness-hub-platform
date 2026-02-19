# AUDITORIA COMPLETA - PANELES MI LOCAL Y MI MARCA

**Fecha:** 2026-01-20  
**Version:** 1.0

---

## PARTE 1: MI LOCAL (`/local/:branchId`)

### Archivo Layout Principal
- **Archivo:** `src/pages/local/LocalLayout.tsx` (639 lineas)
- **Funcionalidad:** Sidebar colapsable, selector de sucursal, integracion POS/KDS inline

---

### 1.1 ESCRITORIO (Dashboard)

| Campo | Valor |
|-------|-------|
| **Ruta** | `/local/:branchId` |
| **Archivo** | `src/pages/local/LocalDashboard.tsx` (594 lineas) |
| **Tablas DB** | `orders`, `order_items`, `attendance_logs`, `branches` |

**Layout:**
```
+-------------------------------------------------------------+
| RoleWelcomeCard (saludo segun avatar)                       |
| Header: Nombre sucursal + Badge Abierto/Cerrado             |
| Badges de canales activos (DEL, TA, AP, RAP, PYA, MPD)      |
+-------------------------------------------------------------+
| FilterBar (sticky): Periodo + Canal                         |
+-------------------------------------------------------------+
| 4 Cards KPI:                                                |
| - Ventas del periodo ($)                                    |
| - Unidades vendidas                                         |
| - Ticket Promedio                                           |
| - Pedidos Activos                                           |
+-------------------------------------------------------------+
| Card: Ventas por Canal (barras de progreso)                 |
+-------------------------------------------------------------+
| Card: Productividad del Mes                                 |
| - Horas trabajadas                                          |
| - Unidades/hora                                             |
+-------------------------------------------------------------+
| OrdersHeatmap: Mapa de calor por hora/dia                   |
| RecentCompletedOrders: Ultimos pedidos entregados           |
+-------------------------------------------------------------+
```

**Componentes:**
| Componente | Ubicacion | Descripcion |
|------------|-----------|-------------|
| `DashboardFilterBar` | Sticky top | Filtro periodo (Hoy/Semana/Mes) y canal |
| `RoleWelcomeCard` | Top | Bienvenida personalizada segun rol |
| `OrdersHeatmap` | Centro | Visualizacion de pedidos por hora |
| `RecentCompletedOrders` | Bottom | Lista de pedidos recientes |

**Datos mostrados:**
- Ventas: `SUM(orders.total)` filtrado por periodo/canal
- Unidades: `SUM(order_items.quantity)`
- Ticket promedio: `ventas / cantidad_pedidos`
- Pedidos activos: `orders WHERE status IN (pending, preparing, confirmed)`
- Horas: calculado desde `attendance_logs` (IN/OUT)

**Funcionalidad:**
- [OK] Estadisticas en tiempo real con refresh cada 60s
- [OK] Filtros por periodo y canal
- [OK] Calculo de productividad (unidades/hora)
- [OK] Realtime subscription para updates de branch
- [PARCIAL] Heatmap puede estar vacio si no hay datos

---

### 1.2 OPERACION

#### 1.2.1 Tomar Pedidos (POS)

| Campo | Valor |
|-------|-------|
| **Ruta** | Inline en Layout (no tiene ruta propia) |
| **Archivo** | `src/components/pos/POSView.tsx` |
| **Tablas DB** | `products`, `branch_products`, `product_categories`, `orders`, `order_items`, `modifier_options`, `customers` |

**Layout:**
```
+--------------------------------------------------------------+
| Tabs de categorias (scrollable horizontal)                   |
+--------------------------------------------------------------+
| Grid de productos (cards con imagen, nombre, precio)         |
| - Click para agregar al carrito                              |
| - Badge de cantidad si esta en carrito                       |
+--------------------------------------------------------------+
| Panel lateral: Carrito                                       |
| - Lista de items                                             |
| - Modificadores expandibles                                  |
| - Subtotal, descuentos, propina                              |
| - Selector de cliente                                        |
| - Boton checkout                                             |
+--------------------------------------------------------------+
```

**Funcionalidad:**
- [OK] Agregar productos al carrito
- [OK] Modificadores por producto
- [OK] Busqueda de cliente existente
- [OK] Crear cliente nuevo inline
- [OK] Aplicar descuentos
- [OK] Split payment
- [OK] Propina
- [OK] Checkout con multiples metodos de pago
- [OK] Impresion de ticket (si hay impresora configurada)

---

#### 1.2.2 Cocina (KDS)

| Campo | Valor |
|-------|-------|
| **Ruta** | Inline en Layout (no tiene ruta propia) |
| **Archivo** | `src/components/pos/KDSView.tsx` |
| **Tablas DB** | `orders`, `order_items`, `products` |

**Layout:**
```
+--------------------------------------------------------------+
| Cards de pedidos activos (ordenados por tiempo)              |
| - Numero de pedido                                           |
| - Tiempo transcurrido                                        |
| - Lista de items                                             |
| - Boton: Marcar Listo                                        |
+--------------------------------------------------------------+
```

**Funcionalidad:**
- [OK] Vista de pedidos en preparacion
- [OK] Realtime updates
- [OK] Cambiar estado a "ready"
- [OK] Timer visual por pedido

---

#### 1.2.3 Gestor de Pedidos

| Campo | Valor |
|-------|-------|
| **Ruta** | `/local/:branchId/pedidos` |
| **Archivo** | `src/pages/local/LocalPedidos.tsx` (586 lineas) |
| **Tablas DB** | `orders`, `order_items`, `order_cancellations`, `products` |

**Layout:**
```
+--------------------------------------------------------------+
| Header: "Pedidos" + Boton Actualizar                         |
+--------------------------------------------------------------+
| Tabs: [Activos (badge)] [Completados] [Buscar/Historial]     |
+--------------------------------------------------------------+
| Tab Activos:                                                 |
| - Grid de OrderCards                                         |
| - Cada card: cliente, items, estado, boton avanzar           |
| - Boton cancelar -> Dialog con motivo                        |
+--------------------------------------------------------------+
| Tab Completados:                                             |
| - Grid de pedidos entregados/cancelados del dia              |
+--------------------------------------------------------------+
| Tab Historial:                                               |
| - Buscador + Tabla con todos los pedidos                     |
| - Exportar a Excel                                           |
+--------------------------------------------------------------+
```

**Botones/Acciones:**
| Boton | Accion | Destino/Efecto |
|-------|--------|----------------|
| Actualizar | Click | Refetch pedidos |
| Avanzar Estado | Click | pending->confirmed->preparing->ready->delivered |
| Cancelar | Click | Abre dialog con motivos de cancelacion |
| Exportar Excel | Click | Descarga archivo .xlsx |

**Funcionalidad:**
- [OK] Realtime subscription para nuevos pedidos
- [OK] Flujo de estados completo
- [OK] Cancelacion con auditoria (motivo requerido)
- [OK] Exportacion a Excel
- [OK] Busqueda por nombre/telefono/ID

---

#### 1.2.4 Historial

| Campo | Valor |
|-------|-------|
| **Ruta** | `/local/:branchId/historial` |
| **Archivo** | `src/pages/local/LocalHistorial.tsx` (368 lineas) |
| **Tablas DB** | `orders`, `order_items`, `products` |

**Layout:**
```
+--------------------------------------------------------------+
| Header: "Historial de Pedidos" + Actualizar + Exportar       |
+--------------------------------------------------------------+
| Stats: Total pedidos | Ingresos | Entregados | Cancelados    |
+--------------------------------------------------------------+
| Filtros:                                                     |
| - Buscar (nombre/telefono/ID)                                |
| - Periodo (Hoy/Ayer/Semana/Mes/Custom)                       |
| - Estado (Todos/Entregado/Cancelado/etc)                     |
| - Canal (Todos/Mostrador/Delivery/etc)                       |
+--------------------------------------------------------------+
| Tabla expandible:                                            |
| - Fecha | Cliente | Canal | Estado | Total                   |
| - Expandir -> ver items del pedido                           |
+--------------------------------------------------------------+
```

**Funcionalidad:**
- [OK] Filtros combinables
- [OK] Fechas personalizadas con calendar picker
- [OK] Filas expandibles para ver detalle
- [OK] Exportar a Excel

---

### 1.3 MENU LOCAL

#### 1.3.1 Productos

| Campo | Valor |
|-------|-------|
| **Ruta** | `/local/:branchId/productos` |
| **Archivo** | `src/pages/local/LocalProductos.tsx` (441 lineas) |
| **Tablas DB** | `branch_products`, `products`, `product_categories`, `availability_logs` |

**Layout:**
```
+--------------------------------------------------------------+
| Header: "Productos" + Badge "X sin stock"                    |
+--------------------------------------------------------------+
| Buscador                                                     |
+--------------------------------------------------------------+
| Lista colapsable por categoria:                              |
| > Hamburguesas (12) [2 sin stock]                            |
|   - Card: Imagen | Nombre | Precio | Switch disponibilidad  |
| > Bebidas (8)                                                |
|   - ...                                                      |
+--------------------------------------------------------------+
```

**Funcionalidad:**
- [OK] Toggle disponibilidad por producto
- [OK] Al desactivar: requiere motivo (sin_stock, rotura, etc)
- [OK] Log de cambios de disponibilidad
- [OK] Tooltip con historial de cambio

---

#### 1.3.2 Extras / Modificadores

| Campo | Valor |
|-------|-------|
| **Ruta** | `/local/:branchId/extras` |
| **Archivo** | `src/pages/local/LocalExtras.tsx` (423 lineas) |
| **Tablas DB** | `branch_modifier_options`, `modifier_options`, `modifier_groups`, `availability_logs` |

**Layout:**
```
+--------------------------------------------------------------+
| Header: "Extras / Modificadores" + Badge "X sin stock"       |
+--------------------------------------------------------------+
| Buscador                                                     |
+--------------------------------------------------------------+
| Lista colapsable por grupo de modificadores:                 |
| > Extras (+$) (6)                                            |
|   - Card: Nombre | +$precio | Switch disponibilidad         |
| > Sin... (0$) (4)                                            |
|   - ...                                                      |
+--------------------------------------------------------------+
```

**Funcionalidad:**
- [OK] Toggle disponibilidad por modificador
- [OK] Motivo requerido al desactivar
- [OK] Similar a productos

---

### 1.4 STOCK E INVENTARIO

#### 1.4.1 Stock Ingredientes

| Campo | Valor |
|-------|-------|
| **Ruta** | `/local/:branchId/stock` |
| **Archivo** | `src/pages/local/LocalStock.tsx` (395 lineas) |
| **Tablas DB** | `ingredients`, `branch_ingredients`, `stock_movements` |

**Layout:**
```
+--------------------------------------------------------------+
| Header: "Stock de Ingredientes"                              |
+--------------------------------------------------------------+
| Cards: Ingredientes (total) | Stock Bajo (alarma)            |
+--------------------------------------------------------------+
| Filtros: Buscar | Boton "Stock Bajo"                         |
+--------------------------------------------------------------+
| Tabla:                                                       |
| Ingrediente | Categoria | Stock | Minimo | Costo | Estado | +|
| - Boton "+ Movimiento" -> Dialog                             |
+--------------------------------------------------------------+
```

**Dialog Movimiento:**
- Tipo: Compra/Ajuste/Merma/Transferencia entrada/salida
- Cantidad + Costo unitario (si compra)
- Notas

**Funcionalidad:**
- [OK] Ver stock actual vs minimo
- [OK] Registrar movimientos
- [OK] Actualiza `branch_ingredients.current_stock` via trigger
- [OK] Filtrar por stock bajo

---

#### 1.4.2 Conteo Inventario

| Campo | Valor |
|-------|-------|
| **Ruta** | `/local/:branchId/inventario` |
| **Archivo** | `src/pages/local/LocalInventory.tsx` (503 lineas) |
| **Tablas DB** | `inventory_counts`, `inventory_count_lines`, `ingredients`, `branch_ingredients`, `stock_movements` |

**Layout:**
```
+--------------------------------------------------------------+
| Vista 1: Sin conteo activo                                   |
| - Historial de conteos anteriores                            |
| - Boton "Iniciar Conteo" -> Dialog tipo (Semanal/Mensual)    |
+--------------------------------------------------------------+
| Vista 2: Conteo en progreso                                  |
| - Cards: Contados | Con diferencias | Progreso %             |
| - Buscador                                                   |
| - Tabla: Ingrediente | Sistema | Contado | Diferencia        |
| - Input para ingresar cantidad contada                       |
| - Textarea notas                                             |
| - Botones: Guardar Progreso | Finalizar Conteo               |
+--------------------------------------------------------------+
```

**Funcionalidad:**
- [OK] Iniciar conteo semanal o mensual
- [OK] Guardar progreso parcial
- [OK] Calcular diferencias sistema vs fisico
- [OK] Al finalizar: genera `stock_movements` de ajuste automatico
- [OK] Historial de conteos

---

#### 1.4.3 Reporte CMV

| Campo | Valor |
|-------|-------|
| **Ruta** | `/local/:branchId/cmv` |
| **Archivo** | `src/pages/local/LocalCMVReport.tsx` (561 lineas) |
| **Tablas DB** | `ingredients`, `inventory_counts`, `inventory_count_lines`, `stock_movements`, `branch_ingredients` |

**Layout:**
```
+--------------------------------------------------------------+
| Header: "Reporte CMV" + Selector mes + Exportar              |
+--------------------------------------------------------------+
| Cards: CMV Total | CMV Alimentos | Bebidas | Categorias      |
+--------------------------------------------------------------+
| Desglose por categoria (colapsable):                         |
| > CMV Alimentos ($XXX) 45%                                   |
|   - Tabla: Ingrediente | St.Ini | Compras | St.Fin | Consumo |
| > Bebidas con Alcohol ($XXX) 15%                             |
|   - ...                                                      |
+--------------------------------------------------------------+
```

**Formula CMV:** `Stock Inicial + Compras - Stock Final = Consumo`

**Funcionalidad:**
- [OK] Calculo automatico de CMV por categoria
- [OK] Requiere conteos mensuales para funcionar
- [OK] Exportar a Excel
- [PARCIAL] Si no hay conteos mensuales, muestra vacio

---

### 1.5 CLIENTES

#### 1.5.1 Cuenta Corriente

| Campo | Valor |
|-------|-------|
| **Ruta** | `/local/:branchId/clientes` |
| **Archivo** | `src/pages/local/LocalCustomers.tsx` |
| **Tablas DB** | `customers`, `branch_customer_accounts`, `customer_account_movements` |

**Funcionalidad:**
- [OK] Lista de clientes con cuenta corriente
- [OK] Ver saldo
- [OK] Registrar pagos/consumos

---

### 1.6 FINANZAS

#### 1.6.1 Ledger (Transacciones)

| Campo | Valor |
|-------|-------|
| **Ruta** | `/local/:branchId/transacciones` |
| **Archivo** | `src/pages/local/LocalTransactions.tsx` (870 lineas) |
| **Tablas DB** | `transactions`, `coa_accounts`, `suppliers` |

**Layout:**
```
+--------------------------------------------------------------+
| Header: "Ledger" + Nueva transaccion                         |
+--------------------------------------------------------------+
| Filtros: Periodo | Tipo | Cuenta                             |
+--------------------------------------------------------------+
| Tabla:                                                       |
| Fecha | Concepto | Cuenta | Tipo | Monto | Proveedor | Estado |
+--------------------------------------------------------------+
```

**Funcionalidad:**
- [OK] Registrar ingresos y gastos
- [OK] Clasificar por cuenta contable (COA)
- [OK] Vincular a proveedor
- [OK] Subir comprobante
- [OK] Estados de pago (pendiente, pagado, devengado)

---

#### 1.6.2 Caja

| Campo | Valor |
|-------|-------|
| **Ruta** | `/local/:branchId/caja` |
| **Archivo** | `src/pages/local/LocalCaja.tsx` (1117 lineas) |
| **Tablas DB** | `cash_registers`, `cash_register_shifts`, `cash_register_movements` |

**Layout:**
```
+--------------------------------------------------------------+
| Tabs: Una tab por caja registradora                          |
+--------------------------------------------------------------+
| Estado de turno: Abierto/Cerrado                             |
| - Si cerrado: Boton "Abrir Turno" -> Dialog monto inicial    |
| - Si abierto: Monto actual, movimientos, boton cerrar        |
+--------------------------------------------------------------+
| Movimientos del turno:                                       |
| - Lista de ingresos/egresos                                  |
| - Boton "+ Ingreso" / "+ Egreso"                             |
+--------------------------------------------------------------+
| Arqueo de cierre:                                            |
| - Ingresar monto declarado                                   |
| - Mostrar diferencia vs esperado                             |
+--------------------------------------------------------------+
```

**Funcionalidad:**
- [OK] Multiples cajas registradoras
- [OK] Abrir/cerrar turnos
- [OK] Registrar movimientos manuales
- [OK] Arqueo de cierre con diferencia
- [OK] Historial de turnos

---

#### 1.6.3 Proveedores (Local)

| Campo | Valor |
|-------|-------|
| **Ruta** | `/local/:branchId/proveedores` |
| **Archivo** | `src/pages/local/LocalSuppliers.tsx` |
| **Tablas DB** | `suppliers`, `branch_suppliers`, `transactions` |

**Funcionalidad:**
- [OK] Ver proveedores asignados a la sucursal
- [OK] Ver saldo con cada proveedor
- [OK] Registrar pagos

---

#### 1.6.4 Facturas

| Campo | Valor |
|-------|-------|
| **Ruta** | `/local/:branchId/facturas` |
| **Archivo** | `src/pages/local/LocalFacturas.tsx` |
| **Tablas DB** | `invoices`, `orders` |

**Funcionalidad:**
- [OK] Lista de facturas emitidas
- [OK] Generar factura desde pedido
- [PARCIAL] Requiere integracion Facturante configurada

---

#### 1.6.5 Obligaciones

| Campo | Valor |
|-------|-------|
| **Ruta** | `/local/:branchId/obligaciones` |
| **Archivo** | `src/pages/local/LocalObligaciones.tsx` |
| **Tablas DB** | `transactions` (filtrado por due_date) |

**Funcionalidad:**
- [OK] Ver pagos pendientes por fecha de vencimiento
- [OK] Calendario de obligaciones

---

#### 1.6.6 Reportes Financieros

| Campo | Valor |
|-------|-------|
| **Ruta** | `/local/:branchId/reportes` |
| **Archivo** | `src/pages/local/LocalFinanceReports.tsx` |

**Funcionalidad:**
- [OK] P&L del local
- [OK] Graficos de tendencias

---

### 1.7 RRHH

#### 1.7.1 Usuarios (Local)

| Campo | Valor |
|-------|-------|
| **Ruta** | `/local/:branchId/usuarios` |
| **Archivo** | `src/pages/local/LocalUsuarios.tsx` |
| **Tablas DB** | `user_branch_access`, `auth.users`, `user_roles` |

**Funcionalidad:**
- [OK] Ver usuarios con acceso a la sucursal
- [PARCIAL] Invitar nuevo staff (requiere edge function)

---

#### 1.7.2 Fichajes

| Campo | Valor |
|-------|-------|
| **Ruta** | `/local/:branchId/rrhh/fichajes` |
| **Archivo** | `src/pages/local/LocalRRHHFichajes.tsx` (28 lineas - wrapper) |
| **Componentes** | `EmployeeDetailManager`, `OperationalStaffManager` |
| **Tablas DB** | `employees`, `employee_private_details`, `attendance_logs` |

**Layout:**
```
+--------------------------------------------------------------+
| EmployeeDetailManager:                                       |
| - Lista de empleados con datos personales                    |
| - Expandir para ver/editar DNI, CBU, contacto emergencia     |
+--------------------------------------------------------------+
| OperationalStaffManager:                                     |
| - Fichajes del dia (quien esta adentro)                      |
| - Botones marcar entrada/salida                              |
+--------------------------------------------------------------+
```

**Funcionalidad:**
- [OK] Ver/editar datos de empleados
- [OK] Registrar entrada/salida manual
- [OK] Ver quien esta activo ahora

---

#### 1.7.3 Horarios

| Campo | Valor |
|-------|-------|
| **Ruta** | `/local/:branchId/rrhh/horarios` |
| **Archivo** | `src/pages/local/LocalRRHHHorarios.tsx` |
| **Tablas DB** | `employee_schedules`, `employees` |

**Funcionalidad:**
- [OK] Definir horarios semanales por empleado
- [OK] Vista calendario mensual

---

#### 1.7.4 Horas del Mes

| Campo | Valor |
|-------|-------|
| **Ruta** | `/local/:branchId/rrhh/horas` |
| **Archivo** | `src/pages/local/LocalRRHHHoras.tsx` |
| **Tablas DB** | `attendance_logs`, `employees` |

**Funcionalidad:**
- [OK] Resumen de horas trabajadas por empleado
- [OK] Comparativa vs horas esperadas

---

#### 1.7.5 Liquidacion

| Campo | Valor |
|-------|-------|
| **Ruta** | `/local/:branchId/rrhh/liquidacion` |
| **Archivo** | `src/pages/local/LocalRRHHLiquidacion.tsx` |
| **Tablas DB** | `employees`, `employee_private_details`, `attendance_logs` |

**Funcionalidad:**
- [OK] Calcular liquidacion basada en horas x tarifa
- [OK] Exportar a Excel

---

### 1.8 CONFIGURACION

#### 1.8.1 Mi Sucursal

| Campo | Valor |
|-------|-------|
| **Ruta** | `/local/:branchId/config` |
| **Archivo** | `src/pages/local/LocalConfig.tsx` |
| **Tablas DB** | `branches` |

**Funcionalidad:**
- [OK] Editar datos basicos (nombre, direccion, telefono)
- [OK] Horarios de atencion
- [OK] Toggle canales de venta

---

#### 1.8.2 Integraciones

| Campo | Valor |
|-------|-------|
| **Ruta** | `/local/:branchId/integraciones` |
| **Archivo** | `src/pages/local/LocalIntegraciones.tsx` |
| **Tablas DB** | `branches` (campos de API keys) |

**Funcionalidad:**
- [OK] Configurar Rappi, PedidosYa, MercadoPago
- [OK] Guardar API keys
- [PARCIAL] Facturante requiere configuracion especial

---

#### 1.8.3 Zonas Delivery

| Campo | Valor |
|-------|-------|
| **Ruta** | `/local/:branchId/zonas-delivery` |
| **Archivo** | `src/pages/local/LocalDeliveryZones.tsx` |
| **Tablas DB** | `delivery_zones` |

**Funcionalidad:**
- [OK] Crear/editar zonas con Google Maps
- [OK] Dibujar poligonos o circulos
- [OK] Definir costo, pedido minimo, tiempo estimado

---

#### 1.8.4 Impresoras

| Campo | Valor |
|-------|-------|
| **Ruta** | `/local/:branchId/impresoras` |
| **Archivo** | `src/pages/local/LocalImpresoras.tsx` |

**Funcionalidad:**
- [PENDIENTE] Placeholder - requiere integracion con servicio de impresion

---

#### 1.8.5 Configuracion KDS

| Campo | Valor |
|-------|-------|
| **Ruta** | `/local/:branchId/kds-config` |
| **Archivo** | `src/pages/local/LocalKDSSettings.tsx` |

**Funcionalidad:**
- [OK] Configurar estaciones KDS

---

### RUTAS ADICIONALES EN MI LOCAL (no en menu principal)

| Ruta | Archivo | Descripcion | En menu |
|------|---------|-------------|---------|
| `/local/:branchId/disponibilidad` | `LocalDisponibilidad.tsx` | Vista alternativa de disponibilidad | NO |
| `/local/:branchId/canales` | `LocalChannels.tsx` | Configuracion de canales | NO |
| `/local/:branchId/disponibilidad-canales` | `LocalChannelAvailability.tsx` | Disponibilidad por canal | NO |
| `/local/:branchId/rrhh/colaboradores` | `LocalRRHHColaboradores.tsx` | Alias de fichajes | NO |
| `/local/:branchId/rrhh/sueldos` | `LocalRRHHSueldos.tsx` | Configuracion sueldos | NO |
| `/attendance-kiosk/:branchId` | `AttendanceKiosk.tsx` | Kiosk para fichaje QR | NO (acceso directo) |

---

## PARTE 2: MI MARCA (`/admin`)

### Archivo Layout Principal
- **Archivo:** `src/pages/admin/Dashboard.tsx` (369 lineas)
- **Funcionalidad:** Sidebar colapsable con secciones

---

### 2.1 DASHBOARD

| Campo | Valor |
|-------|-------|
| **Ruta** | `/admin` |
| **Archivo** | `src/pages/admin/AdminHome.tsx` (550 lineas) |
| **Tablas DB** | `orders`, `order_items`, `branches`, `products`, `product_categories`, `attendance_logs` |

**Layout:**
```
+--------------------------------------------------------------+
| RoleWelcomeCard                                              |
| Header: "Administracion Central"                             |
+--------------------------------------------------------------+
| Card: Resumen del Mes (todas las sucursales)                 |
| - Facturacion Total | Unidades | Ticket Promedio             |
| - Total Pedidos | Horas Registradas | Productividad          |
+--------------------------------------------------------------+
| Cards: Productos (link) | Sucursales                         |
+--------------------------------------------------------------+
| Estado de Sucursales (read-only):                            |
| - Cada sucursal con canales activos, ventas del mes          |
| - Boton "Modificar" -> BranchStatus                          |
+--------------------------------------------------------------+
```

**Funcionalidad:**
- [OK] Estadisticas consolidadas de toda la marca
- [OK] Vista rapida de estado de sucursales
- [OK] Link a modificar estado

---

### 2.2 SUCURSALES

| Campo | Valor |
|-------|-------|
| **Ruta** | `/admin/sucursales` |
| **Archivo** | `src/pages/admin/Branches.tsx` |
| **Tablas DB** | `branches` |

**Funcionalidad:**
- [OK] Lista de sucursales
- [OK] Crear/editar sucursal
- [OK] Ver productos por sucursal

---

### 2.3 CATALOGO

#### 2.3.1 Productos

| Campo | Valor |
|-------|-------|
| **Ruta** | `/admin/productos` |
| **Archivo** | `src/pages/admin/Products.tsx` (908 lineas) |
| **Tablas DB** | `products`, `product_categories`, `branches`, `branch_products`, `availability_schedules` |

**Layout:**
```
+--------------------------------------------------------------+
| Header: "Catalogo de Productos" + Nuevo + Categorias         |
+--------------------------------------------------------------+
| Filtros: Buscar | Categoria | Estado (Todos/Activos/Dest.)   |
+--------------------------------------------------------------+
| Lista por categoria (colapsable):                            |
| > Hamburguesas [reloj]                                       |
|   - Fila: Imagen | Nombre | Precio | GP MNT NVC VA VCP | *   |
|     - Click fila -> Expandir inline editor                   |
|     - Click sucursal -> Toggle habilitado                    |
|     - Click * -> Toggle destacado                            |
+--------------------------------------------------------------+
```

**Botones:**
| Boton | Accion |
|-------|--------|
| + Nuevo Producto | Navega a `/admin/productos/nuevo` |
| Categorias | Abre CategoryManager dialog |
| [reloj] (categoria) | Schedule dialog |
| Toggle sucursal | Activa/desactiva en esa sucursal |
| * (estrella) | Marca como destacado |
| [basura] | Eliminar producto (con confirmacion) |

**Funcionalidad:**
- [OK] CRUD completo de productos
- [OK] Habilitar/deshabilitar por sucursal
- [OK] Inline editor para edicion rapida
- [OK] Gestion de categorias
- [OK] Programacion de disponibilidad

---

#### 2.3.2 Modificadores

| Campo | Valor |
|-------|-------|
| **Ruta** | `/admin/modificadores` |
| **Archivo** | `src/pages/admin/Modifiers.tsx` |
| **Tablas DB** | `modifier_groups`, `modifier_options`, `product_modifier_groups` |

**Funcionalidad:**
- [OK] Crear grupos de modificadores
- [OK] Crear opciones dentro de grupos
- [OK] Asignar grupos a productos
- [OK] Configurar min/max selecciones

---

### 2.4 INSUMOS Y COMPRAS

#### 2.4.1 Ingredientes

| Campo | Valor |
|-------|-------|
| **Ruta** | `/admin/ingredientes` |
| **Archivo** | `src/pages/admin/Ingredients.tsx` |
| **Tablas DB** | `ingredients` |

**Funcionalidad:**
- [OK] CRUD de ingredientes maestros
- [OK] Definir unidad, categoria, costo
- [OK] Stock minimo default

---

#### 2.4.2 Proveedores

| Campo | Valor |
|-------|-------|
| **Ruta** | `/admin/proveedores` |
| **Archivo** | `src/pages/admin/Suppliers.tsx` |
| **Tablas DB** | `suppliers`, `branch_suppliers` |

**Funcionalidad:**
- [OK] CRUD de proveedores
- [OK] Asignar a sucursales

---

#### 2.4.3 Control por Ingrediente

| Campo | Valor |
|-------|-------|
| **Ruta** | `/admin/control-proveedores` |
| **Archivo** | `src/pages/admin/IngredientSuppliers.tsx` |
| **Tablas DB** | `ingredient_suppliers`, `ingredients`, `suppliers` |

**Funcionalidad:**
- [OK] Vincular ingredientes con proveedores
- [OK] Definir precio por proveedor
- [OK] Ver alternativas

---

### 2.5 EQUIPO Y ACCESOS

#### 2.5.1 Usuarios

| Campo | Valor |
|-------|-------|
| **Ruta** | `/admin/equipo` |
| **Archivo** | `src/pages/admin/Users.tsx` |
| **Tablas DB** | `user_roles`, `user_branch_access`, `user_panel_access`, `auth.users` |

**Funcionalidad:**
- [OK] Ver todos los usuarios
- [OK] Asignar roles
- [OK] Asignar acceso a sucursales
- [OK] Invitar nuevo usuario

---

#### 2.5.2 Plantillas de Permisos

| Campo | Valor |
|-------|-------|
| **Ruta** | `/admin/plantillas` |
| **Archivo** | `src/pages/admin/RoleTemplates.tsx` |
| **Tablas DB** | `brand_templates`, `brand_template_permissions` |

**Funcionalidad:**
- [OK] Crear plantillas de permisos
- [OK] Asignar permisos a plantillas
- [OK] Aplicar plantillas a usuarios

---

### 2.6 REPORTES

#### 2.6.1 Performance Locales

| Campo | Valor |
|-------|-------|
| **Ruta** | `/admin/performance` |
| **Archivo** | `src/pages/admin/BranchPerformance.tsx` |
| **Tablas DB** | `orders`, `branches` |

**Funcionalidad:**
- [OK] Comparativa de ventas entre sucursales
- [OK] Ranking de performance

---

#### 2.6.2 Ventas

| Campo | Valor |
|-------|-------|
| **Ruta** | `/admin/reportes` |
| **Archivo** | `src/pages/admin/SalesReports.tsx` |
| **Tablas DB** | `orders`, `order_items`, `products` |

**Funcionalidad:**
- [OK] Reportes de ventas por periodo
- [OK] Desglose por producto/categoria
- [OK] Exportar a Excel

---

#### 2.6.3 P&L Locales

| Campo | Valor |
|-------|-------|
| **Ruta** | `/admin/estado-resultados` |
| **Archivo** | `src/pages/admin/ProfitLossReport.tsx` |
| **Tablas DB** | `transactions`, `orders` |

**Funcionalidad:**
- [OK] Estado de resultados por sucursal
- [OK] Comparativa mensual

---

#### 2.6.4 Finanzas Marca

| Campo | Valor |
|-------|-------|
| **Ruta** | `/admin/finanzas-marca` |
| **Archivo** | `src/pages/admin/BrandFinances.tsx` |
| **Tablas DB** | `transactions`, `branches` |

**Funcionalidad:**
- [OK] Consolidado financiero de la marca
- [OK] Royalties por sucursal

---

### 2.7 MENSAJES

| Campo | Valor |
|-------|-------|
| **Ruta** | `/admin/mensajes` |
| **Archivo** | `src/pages/admin/Messages.tsx` |
| **Tablas DB** | `contact_messages` |

**Funcionalidad:**
- [OK] Bandeja de entrada de mensajes de contacto
- [OK] Filtros por asunto (Franquicia/Empleo/Pedidos/General)
- [OK] Marcar como leido
- [OK] Agregar notas internas
- [OK] Quick actions (WhatsApp, Email)
- [OK] Ver CV adjuntos (si empleo)

---

### RUTAS ADICIONALES EN MI MARCA (no en menu principal)

| Ruta | Archivo | Descripcion | En menu |
|------|---------|-------------|---------|
| `/admin/estado-sucursales` | `BranchStatus.tsx` | Modificar estado de sucursales | NO (desde Dashboard) |
| `/admin/sucursales/:branchId/productos` | `BranchProducts.tsx` | Productos especificos de sucursal | NO |
| `/admin/productos/nuevo` | `ProductForm.tsx` | Crear producto | NO |
| `/admin/productos/:productId` | `ProductForm.tsx` | Editar producto | NO |
| `/admin/clientes` | `Customers.tsx` | Gestion de clientes | NO |
| `/admin/descuentos` | `Discounts.tsx` | Gestion de descuentos | NO |
| `/admin/escaner-comprobantes` | `InvoiceScanner.tsx` | Escanear facturas con OCR | NO |
| `/admin/canales` | `Channels.tsx` | Gestion de canales de venta | NO |
| `/admin/overrides` | `UserBranchOverrides.tsx` | Permisos especificos por sucursal | NO |

---

## PARTE 3: CODIGO NO VISIBLE

### 3.1 Rutas definidas pero no en menu

| Ruta | Archivo | Visible en menu |
|------|---------|-----------------|
| `/admin/clientes` | `Customers.tsx` | NO |
| `/admin/descuentos` | `Discounts.tsx` | NO |
| `/admin/escaner-comprobantes` | `InvoiceScanner.tsx` | NO |
| `/admin/canales` | `Channels.tsx` | NO |
| `/admin/overrides` | `UserBranchOverrides.tsx` | NO |
| `/local/:branchId/disponibilidad` | `LocalDisponibilidad.tsx` | NO (duplica productos) |
| `/local/:branchId/canales` | `LocalChannels.tsx` | NO |
| `/local/:branchId/disponibilidad-canales` | `LocalChannelAvailability.tsx` | NO |
| `/local/:branchId/rrhh/colaboradores` | `LocalRRHHColaboradores.tsx` | NO |
| `/local/:branchId/rrhh/sueldos` | `LocalRRHHSueldos.tsx` | NO |

### 3.2 Paginas publicas relacionadas

| Ruta | Archivo | Descripcion |
|------|---------|-------------|
| `/menu` | Redirect a `/pedir` | Legacy redirect |
| `/menu/:branchSlug` | `MenuPublic.tsx` | Menu publico de sucursal |
| `/nuestro-menu` | - | No existe (redirigir?) |

### 3.3 Tablas sin UI completa

| Tabla | UI disponible | Falta |
|-------|---------------|-------|
| `availability_schedules` | Parcial (ScheduleDialog) | Vista de todas las programaciones |
| `order_cancellations` | Solo escritura | Vista de auditoria de cancelaciones |
| `stock_movements` | Solo escritura | Vista de historial de movimientos |
| `customer_preferences` | No | Vista de preferencias de cliente |
| `customer_discounts` | No | Asignar descuentos a clientes |

---

## PARTE 4: RESUMEN EJECUTIVO

### Estadisticas

| Metrica | Cantidad |
|---------|----------|
| Total de paginas en Mi Local | 32 archivos |
| Total de paginas en Mi Marca | 23 archivos |
| Total de tablas en DB | 60+ |
| Rutas no visibles en menu | 10 |

### Funcionalidades por estado

| Estado | Cantidad | Lista |
|--------|----------|-------|
| [OK] Completo y funcional | 35 | Dashboard, POS, KDS, Pedidos, Historial, Productos, Extras, Stock, Inventario, CMV, Caja, Transacciones, Fichajes, Horarios, Horas, Liquidacion, Config, Zonas Delivery, KDS Config, Admin Dashboard, Products, Modifiers, Ingredients, Suppliers, Users, Templates, Performance, Ventas, P&L, Finanzas Marca, Mensajes, Branches |
| [PARCIAL] Parcialmente funcional | 8 | Clientes CC (basico), Facturas (requiere Facturante), Obligaciones (basico), Impresoras (placeholder), Integraciones (requiere keys), Canales, Descuentos, InvoiceScanner |
| [PENDIENTE] No funciona / Vacio | 2 | LocalDisponibilidad (duplicado), LocalRRHHSueldos (incompleto) |
| [OCULTO] Existe pero no se ve | 10 | Customers, Discounts, Channels, Overrides, InvoiceScanner, LocalChannels, LocalChannelAvailability, LocalRRHHColaboradores, LocalRRHHSueldos |

### Recomendaciones

#### ELIMINAR (codigo muerto)
- `src/pages/local/LocalDisponibilidad.tsx` - Duplica funcionalidad de LocalProductos
- `src/pages/local/LocalRRHHColaboradores.tsx` - Alias de Fichajes

#### COMPLETAR (funcionalidad a medias)
- `src/pages/local/LocalImpresoras.tsx` - Implementar integracion con servicio de impresion
- `src/pages/local/LocalRRHHSueldos.tsx` - Completar configuracion de sueldos
- `src/pages/admin/Discounts.tsx` - Agregar al menu de Mi Marca
- `src/pages/admin/Customers.tsx` - Agregar al menu de Mi Marca

#### AGREGAR AL MENU
- Descuentos -> Menu Mi Marca (seccion Catalogo o nueva seccion Comercial)
- Clientes -> Menu Mi Marca (nueva seccion CRM)
- Canales -> Menu Mi Marca (seccion Configuracion)

#### NUEVA FUNCIONALIDAD SUGERIDA
- Vista de auditoria de cancelaciones de pedidos
- Dashboard de descuentos utilizados
- Vista de historial de movimientos de stock
