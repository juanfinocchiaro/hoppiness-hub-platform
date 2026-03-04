

# Auditoría Completa del Schema de Base de Datos — Hoppiness Hub

## Metodología

Se auditaron 127 tablas reales + 10 vistas del schema `public`. Cada tabla fue verificada contra:
- Queries directas (`.from('tabla')`) en frontend (`src/`) y Edge Functions (`supabase/functions/`)
- Uso en DB functions/triggers
- Conteo de filas real en producción
- Políticas RLS existentes

---

## 1. TABLA RESUMEN

| # | Tabla | Clasificación | Filas | Origen dato | Leída por | Notas |
|---|---|---|---|---|---|---|
| 1 | `profiles` | 🟢 ACTIVA | 49 | Auth signup + profileService | Toda la app | Core identity |
| 2 | `user_roles_v2` | 🟢 ACTIVA | 7 | Admin UsersPage | Permissions hooks | Brand+local roles |
| 3 | `user_branch_roles` | 🟢 ACTIVA | 49 | Admin, invitations | profileService, fichaje, RLS helpers | Clock PIN, local_role per branch |
| 4 | `branches` | 🟢 ACTIVA | 7 | Admin | Toda la app | 7 sucursales |
| 5 | `branch_shifts` | 🟢 ACTIVA | 20 | ShiftConfigPage | ManagerDashboard, closures | Turnos por sucursal |
| 6 | `clock_entries` | 🟢 ACTIVA | 555 | FichajeEmpleado, hrService | Fichajes, horas, dashboard | Fichaje empleados |
| 7 | `employee_schedules` | 🟢 ACTIVA | 2129 | InlineScheduleEditor | CuentaDashboard, fichajes | Horarios programados |
| 8 | `schedule_requests` | 🟢 ACTIVA | 7 | RequestDayOffModal | Manager, cuenta | Solicitudes días libres |
| 9 | `special_days` | 🟢 ACTIVA | 37 | SchedulesPage | Calendario horarios | Feriados |
| 10 | `salary_advances` | 🟢 ACTIVA | 19 | AdvancesPage | Cuenta, dashboard | Adelantos sueldo |
| 11 | `warnings` | 🟡 CONECTADA VACÍA | 0 | WarningsPage | Cuenta, dashboard | Feature activa, sin datos aún |
| 12 | `regulations` | 🟢 ACTIVA | 1 | RegulationsManager | Fichaje, cuenta | PDF reglamento |
| 13 | `regulation_signatures` | 🟢 ACTIVA | 26 | RegulationsPage | Fichaje bloqueante, dashboard | Firmas reglamento |
| 14 | `communications` | 🟢 ACTIVA | 35 | CommunicationsPage | Cuenta, dashboard | Comunicados |
| 15 | `communication_reads` | 🟢 ACTIVA | 25 | Auto al leer comunicado | Dashboard conteo | Lecturas |
| 16 | `shift_closures` | 🟢 ACTIVA | 112 | ShiftClosureModal | BrandDailySalesTable, dashboard | Cierre de turno |
| 17 | `employee_data` | 🟢 ACTIVA | 15 | TeamPage, perfil | HR, coaching, horas | Datos laborales |
| 18 | `employee_time_state` | 🟢 ACTIVA | 27 | hrService (auto en fichaje) | Dashboard trabajando ahora | Estado fichaje real-time |
| 19 | `contact_messages` | 🟢 ACTIVA | 22 | Formularios contacto público | Edge function notifica | Contacto web |
| 20 | `staff_invitations` | 🟢 ACTIVA | 5 | InviteEmployeeModal | send-staff-invitation edge fn | Invitaciones |
| 21 | `permission_config` | 🟢 ACTIVA | 107 | SQL migration seed | PermissionsConfigPage, useDynamicPermissions | Config permisos |
| 22 | `pedidos` | 🟢 ACTIVA | 91 | POS, webapp orders | Order history, fiscal, kitchen | Pedidos |
| 23 | `pedido_items` | 🟢 ACTIVA | 123 | POS al crear pedido | Order detail, kitchen, RDO | Items de pedidos |
| 24 | `pedido_pagos` | 🟢 ACTIVA | 63 | POS pago, MP webhook | Historial, fiscal, cashier | Pagos |
| 25 | `pedido_item_modificadores` | 🟡 CONECTADA VACÍA | 0 | POS (posService) | Kitchen display | Modificadores en pedido |
| 26 | `pedido_payment_edits` | 🟡 CONECTADA VACÍA | 0 | posService.insertPaymentEditAudit | Audit trail | Log edición pagos |
| 27 | `items_carta` | 🟢 ACTIVA | 53 | Centro de costos UI | POS, webapp, promos | Carta actual |
| 28 | `menu_categorias` | 🟢 ACTIVA | 12 | Centro costos | POS, carta, webapp | Categorías carta |
| 29 | `item_carta_composicion` | 🟢 ACTIVA | 68 | Centro costos modal | Cálculo costo (DB fn) | Receta de items |
| 30 | `item_carta_extras` | 🟡 CONECTADA VACÍA | 0 | posService.fetchExtrasForItems | POS extras | Extras asignados |
| 31 | `item_carta_grupo_opcional` | 🟢 ACTIVA | 2 | Centro costos | POS, webapp | Grupos opcionales |
| 32 | `item_carta_grupo_opcional_items` | 🟢 ACTIVA | 18 | Centro costos | POS selección | Items de grupo |
| 33 | `item_carta_precios_historial` | 🟡 CONECTADA VACÍA | 0 | menuService al cambiar precio | HistorialInline component | Historial precios |
| 34 | `item_extra_asignaciones` | 🟢 ACTIVA | 36 | Centro costos | POS extras | Asignación extras→items |
| 35 | `item_modificadores` | 🟢 ACTIVA | 2 | Centro costos | POS modificadores | Modificadores carta |
| 36 | `item_removibles` | 🟢 ACTIVA | 50 | Centro costos | POS removibles | Removibles carta |
| 37 | `insumos` | 🟢 ACTIVA | 45 | Insumos CRUD | Stock, recetas, compras | Ingredientes/insumos |
| 38 | `categorias_insumo` | 🟢 ACTIVA | 1 | Insumos UI | Filtros insumos | Categorías insumo |
| 39 | `preparaciones` | 🟢 ACTIVA | 50 | Preparaciones UI | Composición items, costo | Recetas/preparaciones |
| 40 | `preparacion_ingredientes` | 🟢 ACTIVA | 162 | Preparaciones modal | Cálculo costo (DB fn) | Ingredientes de receta |
| 41 | `preparacion_opciones` | 🟡 CONECTADA VACÍA | 0 | Preparaciones modal | DB fn recalcular_costo | Opciones intercambiables |
| 42 | `categorias_preparacion` | 🟢 ACTIVA | 6 | Preparaciones UI | Filtros | Categorías recetas |
| 43 | `proveedores` | 🟢 ACTIVA | 13 | Proveedores CRUD | Compras, condiciones | Proveedores |
| 44 | `proveedor_condiciones_local` | 🟡 CONECTADA VACÍA | 0 | proveedoresService | Condiciones por local | Condiciones negociadas |
| 45 | `facturas_proveedores` | 🟢 ACTIVA | 15 | Compras modal | RDO, cuenta corriente | Facturas compra |
| 46 | `items_factura` | 🟢 ACTIVA | 30 | Compras modal | Detalle factura, trigger costo | Items de factura |
| 47 | `pagos_proveedores` | 🟢 ACTIVA | 38 | Pagos modal | Cuenta corriente, saldos | Pagos a proveedores |
| 48 | `pago_factura` | 🟡 CONECTADA VACÍA | 0 | financialService | Junction pago↔factura | Relación M:N |
| 49 | `facturas_emitidas` | 🟢 ACTIVA | 12 | emitir-factura edge fn | fiscalService, POS | AFIP facturas |
| 50 | `afip_config` | 🟢 ACTIVA | 1 | AfipConfigPage | emitir-factura edge fn | Config AFIP |
| 51 | `afip_errores_log` | 🟢 ACTIVA | 21 | Edge fn al fallar | AfipErrorsLog UI | Log errores AFIP |
| 52 | `gastos` | 🟡 CONECTADA VACÍA | 0 | GastosPage, trigger sync | RDO, finanzas | Gastos operativos |
| 53 | `inversiones` | 🟡 CONECTADA VACÍA | 0 | financialService CRUD | RDO CAPEX | Inversiones |
| 54 | `periodos` | 🟢 ACTIVA | 1 | financialService | RDO cierre período | Períodos contables |
| 55 | `conceptos_servicio` | 🟢 ACTIVA | 10 | ConceptosServicioPage | Compras (items factura) | Servicios recurrentes |
| 56 | `rdo_categories` | 🟢 ACTIVA | 39 | Migration seed | RDO service, items factura | Categorías P&L |
| 57 | `rdo_movimientos` | 🟢 ACTIVA | 195 | rdoService CRUD | RDO reportes | Movimientos manuales RDO |
| 58 | `stock_actual` | 🟢 ACTIVA | 4 | useStock hooks | Dashboard stock | Stock actual por local |
| 59 | `stock_movimientos` | 🟢 ACTIVA | 11 | useStock hooks | StockHistorial | Movimientos stock |
| 60 | `stock_conteos` | 🟡 CONECTADA VACÍA | 0 | useStockConteo | Conteo físico UI | Cabecera conteos |
| 61 | `stock_conteo_items` | 🟡 CONECTADA VACÍA | 0 | useStockConteo | Conteo físico UI | Items conteo |
| 62 | `stock_cierre_mensual` | 🟡 CONECTADA VACÍA | 0 | posService CMV | CMV reportes | Cierre mensual stock |
| 63 | `consumos_manuales` | 🟡 CONECTADA VACÍA | 0 | posService | CMV reportes | Consumos manuales CMV |
| 64 | `cash_registers` | 🟢 ACTIVA | 21 | configService | POS apertura caja | Cajas registradoras |
| 65 | `cash_register_shifts` | 🟢 ACTIVA | 18 | posService | POS turno caja | Turnos de caja |
| 66 | `cash_register_movements` | 🟢 ACTIVA | 41 | POS movimientos | Cashier report, RDO | Movimientos caja |
| 67 | `cashier_discrepancy_history` | 🟢 ACTIVA | 1 | rdoService | Cashier stats | Discrepancias cajero |
| 68 | `turnos_caja` | 🟡 CONECTADA VACÍA | 0 | posService.fetchOpenRegister | useRegister | Legacy/paralelo a cash_register_shifts |
| 69 | `pos_config` | 🟢 ACTIVA | 4 | POS config UI | POS operación | Config POS por local |
| 70 | `print_config` | 🟢 ACTIVA | 1 | PrintersPage | POS impresión | Config impresión |
| 71 | `print_jobs` | 🟢 ACTIVA | 172 | POS al imprimir | print-to-network edge fn | Cola impresión |
| 72 | `branch_printers` | 🟢 ACTIVA | 2 | PrintersPage | POS, print config | Impresoras |
| 73 | `kitchen_stations` | 🟡 CONECTADA VACÍA | 0 | configService CRUD | POS KDS, coaching | Estaciones cocina |
| 74 | `llamadores` | 🟡 CONECTADA VACÍA | 0 | DB fn asignar_llamador | POS (DB fn) | Llamadores POS |
| 75 | `cadetes` | 🟡 CONECTADA VACÍA | 0 | posService.fetchActiveCadetes | POS delivery | Repartidores |
| 76 | `operator_session_logs` | 🟡 CONECTADA VACÍA | 0 | posService.logOperatorSwitch | Audit | Log cambio operador |
| 77 | `mercadopago_config` | 🟢 ACTIVA | 1 | MercadoPago config UI | MP edge functions | Config MP |
| 78 | `canales_venta` | 🟢 ACTIVA | 5 | Canales config UI | POS, precios | Canales de venta |
| 79 | `promociones` | 🟢 ACTIVA | 7 | Promos UI | POS, webapp | Promociones |
| 80 | `promocion_items` | 🟢 ACTIVA | 7 | Promos UI | POS aplicación promo | Items en promo |
| 81 | `promocion_item_extras` | 🟢 ACTIVA | 5 | Promos UI | POS extras preconfig | Extras preconfigurados |
| 82 | `codigos_descuento` | 🟢 ACTIVA | 1 | Promos UI | POS aplicación código | Códigos descuento |
| 83 | `codigos_descuento_usos` | 🟡 CONECTADA VACÍA | 0 | promoService | Validación uso único | Log usos código |
| 84 | `price_lists` | 🟢 ACTIVA | 5 | Precios UI | POS pricing por canal | Listas de precios |
| 85 | `price_list_items` | 🟢 ACTIVA | 1 | Precios UI | POS precio override | Precios por item |
| 86 | `delivery_pricing_config` | 🟢 ACTIVA | 1 | Delivery config | deliveryService cálculo | Config precios delivery |
| 87 | `delivery_zones` | 🟢 ACTIVA | 1 | deliveryService CRUD | POS, webapp delivery | Zonas delivery |
| 88 | `branch_delivery_config` | 🟢 ACTIVA | 6 | deliveryService | Radio, override | Config delivery por local |
| 89 | `branch_delivery_neighborhoods` | 🟢 ACTIVA | 123 | deliveryService auto-assign | Webapp cobertura | Barrios por sucursal |
| 90 | `city_neighborhoods` | 🟢 ACTIVA | 485 | Migration seed | delivery neighborhoods | Barrios Córdoba |
| 91 | `delivery_radius_overrides_log` | 🟡 CONECTADA VACÍA | 0 | deliveryService.logRadiusOverride | Audit log | Log cambios radio |
| 92 | `cliente_direcciones` | 🟡 CONECTADA VACÍA | 0 | addressService CRUD | Webapp checkout | Direcciones cliente |
| 93 | `webapp_config` | 🟢 ACTIVA | 6 | useWebappConfig | Webapp, POS recepción | Config webapp pedidos |
| 94 | `webapp_pedido_mensajes` | 🟢 ACTIVA | 4 | posService chat | POS chat pedido | Chat pedido webapp |
| 95 | `branch_item_availability` | 🟢 ACTIVA | 321 | useWebappConfig | Webapp disponibilidad | Disponibilidad por local |
| 96 | `branch_closure_config` | 🟡 CONECTADA VACÍA | 0 | closureService | Cierre turno config | Config cierre por local |
| 97 | `brand_closure_config` | 🟢 ACTIVA | 16 | closureService | Config cierre marca | Config cierre marca |
| 98 | `brand_sidebar_order` | 🟢 ACTIVA | 6 | configService | Sidebar Mi Marca | Orden sidebar |
| 99 | `ventas_mensuales_local` | 🟢 ACTIVA | 16 | VentasPage | Canon, dashboard marca | Ventas mensuales |
| 100 | `canon_liquidaciones` | 🟢 ACTIVA | 15 | Trigger sync_canon | Canon UI | Liquidaciones canon |
| 101 | `pagos_canon` | 🟡 CONECTADA VACÍA | 0 | Canon pagos UI | Canon saldo | Pagos canon |
| 102 | `socios` | 🟢 ACTIVA | 10 | Socios UI | Distribuciones, balance | Socios |
| 103 | `movimientos_socio` | 🟡 CONECTADA VACÍA | 0 | Socios UI, trigger distribución | Balance socios | Movimientos socios |
| 104 | `meetings` | 🟢 ACTIVA | 6 | Reuniones UI | Actas, notificaciones | Reuniones |
| 105 | `meeting_participants` | 🟢 ACTIVA | 25 | Reuniones UI | Acta, edge fn notif | Participantes |
| 106 | `meeting_agreements` | 🟢 ACTIVA | 8 | Reuniones UI | Acta, seguimiento | Acuerdos |
| 107 | `meeting_agreement_assignees` | 🟢 ACTIVA | 15 | Reuniones UI | Acta | Asignados a acuerdos |
| 108 | `coachings` | 🟢 ACTIVA | 3 | Coaching UI | Evaluaciones | Sesiones coaching |
| 109 | `coaching_competency_scores` | 🟢 ACTIVA | 11 | coachingService | Coaching detalle | Puntajes competencias |
| 110 | `coaching_station_scores` | 🟢 ACTIVA | 5 | coachingService | Coaching estaciones | Puntajes estaciones |
| 111 | `general_competencies` | 🟢 ACTIVA | 10 | coachingService | Coaching template | Competencias generales |
| 112 | `manager_competencies` | 🟢 ACTIVA | 8 | coachingService | Coaching managers | Competencias managers |
| 113 | `station_competencies` | 🟢 ACTIVA | 20 | coachingService | Coaching estaciones | Competencias estación |
| 114 | `work_stations` | 🟢 ACTIVA | 4 | coachingService | Coaching, certificaciones | Estaciones trabajo |
| 115 | `work_positions` | 🟢 ACTIVA | 6 | HR schedules | Posición en horario | Posiciones trabajo |
| 116 | `employee_certifications` | 🟡 CONECTADA VACÍA | 0 | coachingService CRUD | Certificaciones UI | Certificaciones empleado |
| 117 | `branch_inspections` | 🟢 ACTIVA | 10 | inspectionsService | Inspecciones UI | Inspecciones locales |
| 118 | `inspection_items` | 🟢 ACTIVA | 136 | inspectionsService | Detalle inspección | Items inspección |
| 119 | `inspection_templates` | 🟢 ACTIVA | 41 | inspectionsService | Crear inspección (DB fn) | Templates inspección |
| 120 | `inspection_staff_present` | 🟢 ACTIVA | 7 | inspectionsService | Inspección presencia | Personal presente |
| 121 | `whatsapp_templates` | 🟢 ACTIVA | 6 | whatsappService | Templates WhatsApp | Templates WhatsApp |
| 122 | `push_subscriptions` | 🟡 CONECTADA VACÍA | 0 | notificationsService | Edge fn push | Suscripciones push |
| 123 | `labor_config` | 🟢 ACTIVA | 1 | useLaborConfig (fromUntyped) | Horas laborales | Config jornada laboral |
| 124 | `audit_logs` | 🟢 ACTIVA | 131 | Trigger log_sensitive_access | Admin view | Logs auditoría |
| 125 | `financial_audit_log` | 🟢 ACTIVA | 1573 | Trigger audit_financial_changes | Sin UI directa | Audit financiero (trigger) |
| **126** | **`menu_productos`** | **🟡 LEGACY VACÍA** | **0** | **menuService (deprecated)** | **FichaTecnicaModal, v_menu_costos** | **Legacy — reemplazada por items_carta** |
| **127** | **`menu_precios`** | **🟡 LEGACY VACÍA** | **0** | **menuService (deprecated)** | **v_menu_costos view** | **Legacy — reemplazada por items_carta** |
| **128** | **`menu_precios_historial`** | **🔵 SOLO SCHEMA** | **0** | **Solo en types.ts** | **Sin queries directas** | **Legacy, sin uso** |
| **129** | **`menu_combos`** | **🔵 SOLO SCHEMA** | **0** | **Solo en types.ts** | **Sin queries directas** | **Legacy, sin uso** |
| **130** | **`menu_fichas_tecnicas`** | **🟡 LEGACY VACÍA** | **0** | **menuService (deprecated)** | **FichaTecnicaModal** | **Legacy — sin datos** |
| 131 | `configuracion_impuestos` | 🟡 CONECTADA VACÍA | 0 | Sin UI directa | DB fn get_iibb_alicuota | Usada solo por DB function |
| 132 | `devoluciones` | 🟡 CONECTADA VACÍA | 0 | Solo en types.ts | Sin queries frontend | Feature no implementada |
| 133 | `distribuciones_utilidades` | 🟡 CONECTADA VACÍA | 0 | Solo trigger DB | procesar_distribucion | Feature no implementada |
| 134 | `insumos_costos_historial` | 🟡 CONECTADA VACÍA | 0 | Trigger fn_actualizar_costo | Sin queries frontend | Solo trigger |
| 135 | `webapp_customers` | 🔴 HUÉRFANA | 0 | Sin queries | Sin queries | Sin uso detectable |

---

## 2. VISTAS (Views)

| Vista | Clasificación | Leída por | Notas |
|---|---|---|---|
| `balance_socios` | 🟡 CONECTADA VACÍA | Sin query directa frontend | Vista materializada de movimientos_socio |
| `branches_public` | 🟢 ACTIVA | Webapp público | Vista pública de branches |
| `profiles_public` | 🟢 ACTIVA | Webapp público | Vista pública de profiles |
| `cuenta_corriente_proveedores` | 🟢 ACTIVA | proveedoresService | Vista agregada saldos proveedores |
| `cuenta_corriente_marca` | 🟡 CONECTADA VACÍA | Solo en types.ts | Vista canon, sin query directa |
| `v_menu_costos` | 🟡 LEGACY | Sin query directa | Vista del sistema menu legacy |
| `webapp_menu_items` | 🟢 ACTIVA | Webapp pedidos | Vista items para webapp |
| `rdo_multivista_items_base` | 🟢 ACTIVA | rdoService | Vista RDO items |
| `rdo_multivista_ventas_base` | 🟢 ACTIVA | rdoService | Vista RDO ventas |
| `rdo_report_data` | 🟢 ACTIVA | rdoService | Vista reportes RDO |

---

## 3. TABLAS HUÉRFANAS O CANDIDATAS A ELIMINACIÓN

| Tabla | Estado | Filas | Razón |
|---|---|---|---|
| `webapp_customers` | 🔴 HUÉRFANA | 0 | Sin queries en frontend ni edge functions |
| `menu_combos` | 🔵 SOLO SCHEMA | 0 | Solo existe en types.ts, sin queries `.from()` |
| `menu_precios_historial` | 🔵 SOLO SCHEMA | 0 | Solo existe en types.ts, sin queries `.from()` |
| `menu_productos` | 🟡 LEGACY | 0 | Código activo en menuService pero vacía, reemplazada por items_carta |
| `menu_precios` | 🟡 LEGACY | 0 | Usada solo por vista v_menu_costos, vacía |
| `menu_fichas_tecnicas` | 🟡 LEGACY | 0 | Código activo en menuService pero vacía |
| `devoluciones` | 🟡 SCHEMA ONLY | 0 | Sin queries frontend, solo types.ts |
| `distribuciones_utilidades` | 🟡 SCHEMA ONLY | 0 | Solo trigger DB, sin UI |
| `configuracion_impuestos` | 🟡 SCHEMA ONLY | 0 | Solo DB function get_iibb_alicuota |

---

## 4. TABLAS CON DATOS PERO SIN LECTURA DIRECTA FRONTEND

| Tabla | Filas | Cómo se llena | Cómo se consume |
|---|---|---|---|
| `financial_audit_log` | 1573 | Trigger `audit_financial_changes` | Sin UI — solo audit trail en DB |
| `insumos_costos_historial` | 0 | Trigger `fn_actualizar_costo_insumo_desde_compra` | Sin UI — historial en DB |

---

## 5. OBSERVACIONES CLAVE

1. **Sistema de menú dual**: Existe un sistema legacy (`menu_productos`, `menu_precios`, `menu_fichas_tecnicas`, `menu_combos`) y el sistema actual (`items_carta`, `item_carta_composicion`, `preparaciones`). El legacy tiene código activo en `menuService.ts` pero 0 filas. La vista `v_menu_costos` depende de `menu_productos` y `menu_precios`.

2. **`turnos_caja` vs `cash_register_shifts`**: Ambas tablas cubren el mismo concepto. `turnos_caja` tiene 0 filas y solo se lee en `posService.fetchOpenRegister`. `cash_register_shifts` tiene 18 filas y es el sistema activo. Potencial duplicación.

3. **Tablas con triggers escritores pero sin UI**: `financial_audit_log` (1573 filas), `insumos_costos_historial` (0 filas), `distribuciones_utilidades` (0 filas) — se llenan automáticamente por triggers pero no tienen pantalla para consultarlas.

4. **Features construidas pero sin datos de producción**: Stock conteos, gastos, inversiones, pagos canon, movimientos socios, kitchen stations, cadetes — tienen código frontend completo pero 0 filas en producción.

