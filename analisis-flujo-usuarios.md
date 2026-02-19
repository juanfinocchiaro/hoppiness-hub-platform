# Análisis Exhaustivo de Flujo de Usuario - Hoppiness Hub Platform

## Arquitectura General

La app tiene **3 paneles principales**:
- **Mi Cuenta** (`/cuenta`) — Panel personal del empleado
- **Mi Local** (`/milocal/:branchId`) — Gestión de sucursal
- **Mi Marca** (`/mimarca`) — Administración de marca

Los usuarios pueden tener **un rol de marca** (global) y/o **un rol de local** (por sucursal). Un `PanelSwitcher` en el footer del sidebar permite cambiar entre paneles accesibles.

### Roles existentes

| Tipo | Roles |
|------|-------|
| **Marca** | `superadmin`, `coordinador`, `informes`, `contador_marca` |
| **Local** | `franquiciado`, `encargado`, `contador_local`, `cajero`, `empleado` |

### Redirect post-login por rol

| Rol | Landing Path |
|-----|-------------|
| `superadmin` | `/mimarca` |
| `coordinador` | `/mimarca` |
| `informes` | `/mimarca` |
| `contador_marca` | `/mimarca` |
| `franquiciado` | `/milocal/{firstBranchId}` |
| `encargado` | `/milocal/{firstBranchId}` |
| `contador_local` | `/cuenta` |
| `cajero` | `/cuenta` |
| `empleado` | `/cuenta` |

---

## Rutas completas de la aplicación

### Rutas públicas

| Ruta | Componente | Descripción |
|------|-----------|-------------|
| `/` | `Index` | Landing page |
| `/ingresar` | `Ingresar` | Login / Registro |
| `/olvide-password` | `OlvidePassword` | Recuperar contraseña |
| `/reset-password` | `ResetPassword` | Resetear contraseña |
| `/pedir` | `Pedir` | Redirect a MasDelivery |
| `/franquicias` | `Franquicias` | Info franquicias |
| `/nosotros` | `Nosotros` | Página About |
| `/contacto` | `Contacto` | Formulario contacto |
| `/registro-staff` | `RegistroStaff` | Registro staff con token |
| `/fichaje/:branchCode` | `FichajeEmpleado` | Fichaje PIN + selfie + GPS |

### Mi Cuenta (`/cuenta`) — RequireAuth

| Ruta | Componente | Descripción |
|------|-----------|-------------|
| `/cuenta` | `CuentaHome` | Dashboard personal |
| `/cuenta/perfil` | `CuentaPerfil` | Editar perfil |
| `/cuenta/horario` | `MiHorarioPage` | Mi horario mensual |
| `/cuenta/fichajes` | `MisFichajesPage` | Historial fichajes |
| `/cuenta/coachings` | `MisCoachingsPage` | Mis evaluaciones |
| `/cuenta/reuniones` | `MisReunionesPage` | Mis reuniones |
| `/cuenta/solicitudes` | `MisSolicitudesPage` | Solicitudes días libres |
| `/cuenta/adelantos` | `MisAdelantosPage` | Historial adelantos |
| `/cuenta/comunicados` | `MisComunicadosPage` | Comunicados recibidos |
| `/cuenta/reglamento` | `MiReglamentoPage` | Reglamento interno |

### Mi Local (`/milocal`) — RequireAuth + RequireLocal

| Ruta | Componente | Descripción |
|------|-----------|-------------|
| `/milocal` | `BranchLayout` | Selector de sucursal |
| `/milocal/:branchId` | `BranchLayout` | Dashboard local |
| `/milocal/:branchId/equipo` | `TeamPage` | Gestión equipo |
| `/milocal/:branchId/equipo/fichajes` | `ClockInsPage` | Fichajes + QR |
| `/milocal/:branchId/equipo/horarios` | `SchedulesPage` | Editor horarios |
| `/milocal/:branchId/equipo/adelantos` | `AdvancesPage` | Adelantos salariales |
| `/milocal/:branchId/equipo/apercibimientos` | `WarningsPage` | Apercibimientos |
| `/milocal/:branchId/equipo/reglamentos` | `RegulationsPage` | Firmas reglamento |
| `/milocal/:branchId/equipo/comunicados` | `LocalCommunicationsPage` | Comunicados locales |
| `/milocal/:branchId/equipo/coaching` | `CoachingPage` | Evaluaciones coaching |
| `/milocal/:branchId/equipo/reuniones` | `MeetingsPage` | Reuniones |
| `/milocal/:branchId/tiempo/liquidacion` | `LiquidacionPage` | Liquidación horas |
| `/milocal/:branchId/tiempo/solicitudes` | `RequestsPage` | Solicitudes equipo |
| `/milocal/:branchId/ventas/historial` | `SalesHistoryPage` | Historial ventas |
| `/milocal/:branchId/finanzas/proveedores` | `ProveedoresLocalPage` | Proveedores local |
| `/milocal/:branchId/finanzas/proveedores/:proveedorId` | `CuentaCorrienteProveedorPage` | Cuenta corriente |
| `/milocal/:branchId/finanzas/insumos` | `InsumosLocalPage` | Insumos local |
| `/milocal/:branchId/finanzas/compras` | `ComprasPage` | Facturas compra |
| `/milocal/:branchId/finanzas/gastos` | `GastosPage` | Caja chica |
| `/milocal/:branchId/finanzas/ventas-mensuales` | `VentasMensualesLocalPage` | Ventas mensuales del local |
| `/milocal/:branchId/finanzas/consumos` | `ConsumosPage` | Consumos manuales |
| `/milocal/:branchId/finanzas/socios` | `SociosPage` | Socios / Partners |
| `/milocal/:branchId/finanzas/periodos` | `PeriodosPage` | Períodos contables |
| `/milocal/:branchId/finanzas/pl` | `PLDashboardPage` | P&L Dashboard |
| `/milocal/:branchId/finanzas/rdo-carga` | `RdoLoaderPage` | Cargador RDO |
| `/milocal/:branchId/finanzas/inversiones` | `InversionesPage` | Inversiones CAPEX |
| `/milocal/:branchId/supervisiones` | `InspectionsLocalPage` | Historial inspecciones |
| `/milocal/:branchId/config/turnos` | `ShiftConfigPage` | Configuración turnos |

### Mi Marca (`/mimarca`) — RequireAuth + RequireAdmin

| Ruta | Componente | Descripción |
|------|-----------|-------------|
| `/mimarca` | `BrandHome` | Dashboard marca |
| `/mimarca/locales/:slug` | `BranchDetail` | Detalle sucursal |
| `/mimarca/usuarios` | `UsersPage` | Gestión usuarios |
| `/mimarca/equipo-central` | `CentralTeam` | Equipo central |
| `/mimarca/comunicados` | `CommunicationsPage` | Comunicados marca |
| `/mimarca/mensajes` | `ContactMessagesPage` | Mensajes contacto |
| `/mimarca/reuniones` | `BrandMeetingsPage` | Reuniones de red |
| `/mimarca/coaching/encargados` | `CoachingManagersPage` | Coaching encargados |
| `/mimarca/coaching/red` | `CoachingNetworkPage` | Dashboard coaching red |
| `/mimarca/supervisiones` | `InspectionsPage` | Lista inspecciones |
| `/mimarca/supervisiones/nueva` | `NewInspectionPage` | Nueva inspección |
| `/mimarca/supervisiones/:id` | `InspectionDetailPage` | Detalle inspección |
| `/mimarca/finanzas/proveedores` | `ProveedoresPage` | Proveedores marca |
| `/mimarca/finanzas/insumos` | `InsumosPage` | Catálogo insumos |
| `/mimarca/finanzas/conceptos-servicio` | `ConceptosServicioPage` | Conceptos servicio |
| `/mimarca/finanzas/canon` | `CanonPage` | Liquidaciones canon |
| `/mimarca/finanzas/ventas-mensuales` | `VentasMensualesMarcaPage` | Ventas consolidadas |
| `/mimarca/recetas` | `PreparacionesPage` | Recetas |
| `/mimarca/categorias-carta` | `CategoriasCartaPage` | Categorías de la carta |
| `/mimarca/carta` | `MenuCartaPage` | Carta / Menú |
| `/mimarca/centro-costos` | `CentroCostosPage` | Centro de costos |
| `/mimarca/reglamentos` | `BrandRegulationsPage` | Reglamentos marca |
| `/mimarca/configuracion/calendario` | `LaborCalendarPage` | Calendario laboral |
| `/mimarca/configuracion/cierres` | `ClosureConfigPage` | Config cierres |
| `/mimarca/configuracion/permisos` | `PermissionsConfigPage` | Config permisos |

### Rutas especiales

| Ruta | Guard | Descripción |
|------|-------|-------------|
| `/fichaje-qr/:branchId` | RequireAuth + RequireQRAccess | Display QR fichaje (superadmin/franquiciado/encargado) |
| `*` | — | 404 NotFound |

---

## Permisos por rol (Local)

### Permisos de lectura

| Permiso | superadmin | franquiciado | encargado | contador_local | cajero | empleado |
|---------|:---:|:---:|:---:|:---:|:---:|:---:|
| canViewDashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| canViewStock | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| canViewSuppliers | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| canViewSupplierAccounts | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| canViewPurchaseHistory | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| canViewAllClockIns | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| canViewTeam | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| canViewMonthlyHours | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| canViewPayroll | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| canViewSalaryAdvances | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| canViewWarnings | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| canViewCoaching | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| canViewLocalCommunications | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| canViewMeetings | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| canViewClosures | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| canViewSalesReports | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| canViewLocalPnL | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| canViewCMV | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| canViewStockMovements | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| canViewGastos | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| canViewConsumos | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| canViewPeriodos | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| canViewVentasMensualesLocal | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| canViewSocios | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

### Permisos de acción

| Permiso | superadmin | franquiciado | encargado | contador_local | cajero | empleado |
|---------|:---:|:---:|:---:|:---:|:---:|:---:|
| canClockInOut | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| canCloseShifts | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |
| canEnterSales | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |
| canEditSchedules | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| canInviteEmployees | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| canDeactivateEmployees | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| canCreateSalaryAdvance | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| canCancelSalaryAdvance | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| canCreateWarning | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| canUploadSignature | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| canDoCoaching | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| canSendLocalCommunication | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| canCreateMeetings | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| canCloseMeetings | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| canUploadInvoice | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| canOrderFromSupplier | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| canPaySupplier | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| canCreateGastos | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| canCreateConsumos | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| canEditPeriodos | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| canEditVentasMensualesLocal | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| canEditSocios | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| canEditLocalConfig | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| canConfigPrinters | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| canConfigShifts | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

### Permisos de marca

| Permiso | superadmin | coordinador | informes | contador_marca |
|---------|:---:|:---:|:---:|:---:|
| canViewDashboard | ✅ | ✅ | ✅ | ✅ |
| canViewPnL | ✅ | ❌ | ✅ | ✅ |
| canViewComparativa | ✅ | ❌ | ✅ | ✅ |
| canViewHoursSummary | ✅ | ❌ | ✅ | ✅ |
| canViewLocales | ✅ | ✅ | ✅ | ✅ |
| canCreateLocales | ✅ | ❌ | ❌ | ❌ |
| canViewProducts | ✅ | ✅ | ❌ | ❌ |
| canEditProducts | ✅ | ✅ | ❌ | ❌ |
| canManageModifiers | ✅ | ✅ | ❌ | ❌ |
| canManageIngredients | ✅ | ✅ | ❌ | ❌ |
| canEditPrices | ✅ | ✅ | ❌ | ❌ |
| canViewInsumos | ✅ | ✅ | ❌ | ✅ |
| canEditInsumos | ✅ | ✅ | ❌ | ❌ |
| canViewConceptosServicio | ✅ | ✅ | ❌ | ✅ |
| canEditConceptosServicio | ✅ | ✅ | ❌ | ❌ |
| canViewProveedoresMarca | ✅ | ✅ | ❌ | ✅ |
| canEditProveedoresMarca | ✅ | ✅ | ❌ | ❌ |
| canViewVentasMensuales | ✅ | ❌ | ✅ | ✅ |
| canEditVentasMensuales | ✅ | ❌ | ❌ | ✅ |
| canViewCanon | ✅ | ❌ | ❌ | ✅ |
| canEditCanon | ✅ | ❌ | ❌ | ✅ |
| canManageCentralTeam | ✅ | ❌ | ❌ | ❌ |
| canViewCentralTeam | ✅ | ✅ | ❌ | ❌ |
| canSearchUsers | ✅ | ❌ | ❌ | ❌ |
| canAssignRoles | ✅ | ❌ | ❌ | ❌ |
| canManageMessages | ✅ | ✅ | ❌ | ❌ |
| canViewContactMessages | ✅ | ✅ | ❌ | ❌ |
| canManageContactMessages | ✅ | ✅ | ❌ | ❌ |
| canCoachManagers | ✅ | ✅ | ❌ | ❌ |
| canViewCoaching | ✅ | ✅ | ❌ | ❌ |
| canViewMeetings | ✅ | ✅ | ❌ | ❌ |
| canCreateMeetings | ✅ | ✅ | ❌ | ❌ |
| canEditBrandConfig | ✅ | ❌ | ❌ | ❌ |
| canManageChannels | ✅ | ✅ | ❌ | ❌ |
| canManageIntegrations | ✅ | ❌ | ❌ | ❌ |

---

## Análisis por rol

---

## 1. EMPLEADO

### 1.1 Primer contacto

- **Llegada:** Invitación del encargado vía email con link a `/registro-staff?token=XXX`
- **Registro:** Formulario largo con datos personales, bancarios, DNI (foto frente/dorso), contacto de emergencia, aceptación de términos
- **Login:** `/ingresar` con email + contraseña
- **Redirect post-login:** `/cuenta`
- **Onboarding:** NO HAY. Debería haber un tutorial breve explicando fichaje, horario y comunicados

### 1.2 Navegación principal (CuentaSidebar)

| Sección | Items | Visible | Funciona |
|---------|-------|---------|----------|
| Inicio | Dashboard | ✅ | ✅ |
| Mi Perfil | Datos personales | ✅ | ✅ |
| Mi Trabajo | Horario, Fichajes, Coachings, Reuniones | ✅ | ✅ |
| Solicitudes | Días Libres, Adelantos | ✅ | ✅ |
| Comunicados | Lista comunicados | ✅ | ✅ |
| Reglamento | Firmar reglamento | ✅ | ✅ |

No ve opciones de Mi Local ni Mi Marca (correcto). No hay opciones que vea y no pueda usar.

### 1.3 Pantallas accesibles

| Pantalla | Qué ve | Qué puede hacer | Problemas detectados | Sugerencia |
|----------|--------|-----------------|---------------------|------------|
| `/cuenta` (Home) | Saludo, tarjetas de sucursal con PIN, comunicados urgentes | Ver info, navegar | Sin problemas mayores | Agregar accesos directos a fichaje y horario |
| `/cuenta/perfil` | Nombre, email (disabled), teléfono, fecha nac, avatar | Editar datos, cambiar contraseña | No se puede cambiar el avatar (solo display). Password sin requisitos visibles | Agregar upload de avatar. Mostrar requisitos de password |
| `/cuenta/horario` | Calendario mensual read-only, horario de hoy, resumen del mes | Navegar meses | Sin estado de error visible. Sin posibilidad de exportar | Agregar exportar PDF. Agregar notificación push al publicar |
| `/cuenta/fichajes` | Últimos 5 fichajes del mes, horas acumuladas | Solo lectura | Solo muestra 5 entradas sin paginación. No filtra por sucursal | Agregar paginación. Filtro por sucursal si tiene varias |
| `/cuenta/coachings` | Último coaching, gráfico vs promedio del equipo, badges | Confirmar lectura de coaching pendiente, agregar comentario | No hay error toast si falla confirm. Modal sin loading state | Agregar feedback de error. Loading en modal |
| `/cuenta/reuniones` | Hasta 3 reuniones pendientes | Ver detalle, agregar a Google Calendar, confirmar lectura | Se oculta la card si no hay reuniones (no hay estado vacío). Si hay >3, solo dice "y X más" | Mostrar estado vacío. Link a ver todas |
| `/cuenta/solicitudes` | Últimas 5 solicitudes con estado | Pedir día libre | No puede cancelar solicitud pendiente. Razón truncada sin tooltip. Limitado a 5 | Agregar cancelar pendiente. Tooltip en razón. Paginación |
| `/cuenta/adelantos` | Resumen del mes + últimos 5 | Solo lectura | Se oculta card si no hay adelantos. Sin paginación | Mostrar estado vacío. Agregar paginación |
| `/cuenta/comunicados` | Hasta 3 de marca + 3 de local | Leer, confirmar lectura | Limitado a 3+3 sin ver todos. Modal no se cierra si no confirmó lectura | Agregar "ver todos". Permitir cerrar modal sin confirmar |
| `/cuenta/reglamento` | Versión actual, estado firma, PDF | Ver PDF, ver historial | Sin loading state. No puede firmar directamente (depende del encargado) | Agregar loading. Explicar proceso de firma |
| `/fichaje/:branchCode` | PIN, cámara, GPS | Fichar entrada/salida | PIN no auto-submit al completar 4 dígitos. Sin soporte offline. Sin biometría | Auto-submit PIN. Offline mode. Opción biométrica |

### 1.4 Flujos críticos

```
FICHAR ENTRADA/SALIDA:
/fichaje/:branchCode → Ingresa PIN (4 dígitos) → Chequeo reglamento →
  Si firma vencida (>5 días): BLOQUEADO → Fin
  Si firma vencida (1-5 días): WARNING → Puede continuar
  Si firma OK: → Captura selfie → Chequeo GPS →
    GPS OK: → Registro exitoso → Pantalla de éxito
    GPS Warning: → Registro con warning → Pantalla de éxito

VER MI HORARIO:
/cuenta → Sidebar "Horario" → /cuenta/horario → Ve calendario del mes actual
→ Puede navegar mes anterior/siguiente → Solo lectura

SOLICITAR DÍA LIBRE:
/cuenta → Sidebar "Días Libres" → /cuenta/solicitudes → Click "Pedir día libre"
→ Modal: fecha + motivo → Submit → Espera aprobación del encargado

SOLICITAR ADELANTO:
/cuenta → Sidebar "Adelantos" → /cuenta/adelantos → Solo lectura (no puede pedir)
⚠ PROBLEMA: El empleado NO tiene botón para solicitar adelanto. Solo ve historial.
El adelanto lo carga el encargado. ¿Debería poder solicitarlo?

VER COACHINGS:
/cuenta → Sidebar "Coachings" → /cuenta/coachings → Ve último coaching
→ Si hay pendiente: "Ver y Confirmar" → Modal con detalles + comentario opcional
→ "Confirmar Lectura" → Registrado

FIRMAR REGLAMENTO:
/cuenta → Sidebar "Reglamento" → /cuenta/reglamento → Ve PDF y estado
⚠ No puede firmar directamente. El encargado sube foto de firma. Solo ve estado.
```

---

## 2. CAJERO

### 2.1 Primer contacto

- Idéntico al empleado (invitación vía email)
- **Redirect post-login:** `/cuenta`
- Tiene acceso adicional a Mi Local para cierre de turno

### 2.2 Navegación

**Panel Mi Cuenta:** Igual que empleado.

**Panel Mi Local (LocalSidebar):**

| Sección | Items visibles | Funciona |
|---------|---------------|----------|
| Dashboard | ✅ (canViewDashboard) | ✅ |
| Reuniones | ✅ (canViewMeetings) | ✅ |
| Cierres de turno | ✅ (canCloseShifts) | ✅ |

### 2.3 Pantallas accesibles (adicionales a empleado)

| Pantalla | Qué ve | Qué puede hacer | Problemas detectados | Sugerencia |
|----------|--------|-----------------|---------------------|------------|
| `/milocal/:id` (Dashboard) | Dashboard del encargado (ManagerDashboard) | Ver métricas | Ve el dashboard completo pero su permiso es solo `canViewDashboard`. Puede que vea más de lo que debería | Verificar que el dashboard filtre contenido por permisos |
| Ventas/Historial | Historial de cierres | Puede ingresar ventas (`canEnterSales`) | Sin paginación | Agregar paginación |

### 2.4 Flujos críticos

```
CERRAR TURNO/CAJA:
⚠ FLUJO NO CLARAMENTE ACCESIBLE: No hay link directo en sidebar a "Cerrar Turno"
El cajero tiene canCloseShifts=true y canEnterSales=true
Presumiblemente accede vía Ventas/Historial → Cargar cierre de turno
Necesita verificación de la pantalla real de cierre

FICHAR + TODO DE EMPLEADO:
Mismo flujo que empleado (ver arriba)
```

---

## 3. ENCARGADO

### 3.1 Primer contacto

- Invitación vía email o asignación de rol por franquiciado/superadmin
- **Redirect post-login:** `/milocal/{firstBranchId}`

### 3.2 Navegación

**Panel Mi Cuenta:** Igual que empleado (para ver su propia info).

**Panel Mi Local (LocalSidebar):**

| Sección | Items visibles | Funciona |
|---------|---------------|----------|
| Dashboard | ✅ | ✅ |
| Gestión de Personas | Equipo, Horarios, Fichajes, Solicitudes, Liquidación, Coaching, Reuniones, Adelantos, Apercibimientos, Firmas, Comunicados | ✅ |
| Operaciones | Facturas, Proveedores | ✅ |
| Finanzas | Caja Chica, Consumos | ✅ (no ve P&L, períodos, ventas mensuales, socios) |
| Supervisiones | Historial inspecciones | ✅ (read-only) |
| Configuración | Impresoras | ✅ |

### 3.3 Pantallas accesibles

| Pantalla | Qué ve | Qué puede hacer | Problemas detectados | Sugerencia |
|----------|--------|-----------------|---------------------|------------|
| Dashboard | Métricas del local | Ver info | N/A | N/A |
| Equipo | Lista empleados con roles | Invitar, editar roles, desactivar | Sin estado vacío explícito. Search solo client-side | Agregar empty state. Paginación |
| Horarios | Grid mensual de horarios | Crear/editar horarios, publicar, copiar mes anterior | Retorna `null` durante carga (pantalla en blanco). Sin feedback de error al guardar | Agregar skeleton. Toast de error |
| Fichajes | URL/QR fichaje + historial | Ver QR, copiar link, imprimir QR, ver fichajes por día | Sin skeleton de carga. Auto-refresh cada 30s puede ser disruptivo | Agregar loading skeleton. Hacer refresh manual |
| Solicitudes | Pendientes/aprobadas/rechazadas | Aprobar/rechazar con nota | Nota opcional en rechazo (debería ser obligatoria?) | Hacer nota obligatoria en rechazo |
| Liquidación | Resumen horas por empleado (CCT 329/00) | Solo lectura | Delegado a componente, sin error handling visible | Agregar export a Excel |
| Coaching | Stats + equipo + form evaluación | Evaluar empleados, ver certificaciones | Sin feedback en submit. Tabs complejos | Simplificar tabs. Toast de éxito |
| Reuniones | Lista reuniones | Crear, cerrar, trackear lecturas | Sin loading states visibles | Agregar loading |
| Adelantos | Lista por mes + stats | Crear adelanto, cancelar | Full-screen loader bloquea UI. Sin confirm antes de cancelar | Usar skeleton en vez de full-screen. Confirm dialog |
| Apercibimientos | Lista + stats por tipo + informes | Crear apercibimiento, subir doc firmado | Full-screen loader. Sin progress en upload | Skeleton. Progress bar upload |
| Comunicados local | Enviados + recibidos de marca | Enviar comunicado a equipo, eliminar | Sin confirm antes de borrar. Sin preview | Confirm dialog. Preview antes de enviar |
| Compras/Facturas | Lista facturas expandibles | Crear factura, eliminar | Sin paginación. Delete sin error toast visible | Paginación. Error handling |
| Proveedores | Lista con saldos | Crear proveedor local, editar, ver CC | Sin paginación ni sort | Agregar ambos |
| Gastos (Caja chica) | Lista gastos | Crear, editar, eliminar | Sin confirm antes de borrar | Confirm dialog |
| Consumos | Consumos manuales | Crear, editar, eliminar | Sin paginación | Paginación |
| Supervisiones | Historial inspecciones | Solo lectura | Sin filtros de tipo/fecha/estado. Límite 50 | Agregar filtros y paginación |
| Reglamentos/Firmas | Estado firma empleados | Subir foto de firma | Delegado a componente | N/A |
| Config turnos | Turnos activos | Configurar turnos | Delegado a componente | N/A |

### 3.4 Flujos críticos

```
CREAR HORARIO MENSUAL:
/milocal/:id → Sidebar "Horarios" → /milocal/:id/equipo/horarios
→ Grid mensual con empleados en filas y días en columnas
→ Click celda → Asignar posición y horario → Guardar
→ "Publicar" → Notifica empleados
→ Opción: "Copiar mes anterior" → Copia última semana completa

APROBAR/RECHAZAR SOLICITUD:
/milocal/:id → Sidebar "Solicitudes" → /milocal/:id/tiempo/solicitudes
→ Tab "Pendientes" → Click "Aprobar" o "Rechazar"
→ Si rechaza: Dialog con nota (opcional) → Confirmar
→ Toast de éxito

HACER COACHING A EMPLEADO:
/milocal/:id → Sidebar "Coaching" → /milocal/:id/equipo/coaching
→ Tab "Equipo" → Expandir empleado → Formulario evaluación
→ Evaluar por estaciones y competencias (1-4) → Guardar

CARGAR APERCIBIMIENTO:
/milocal/:id → Sidebar "Apercibimientos" → /milocal/:id/equipo/apercibimientos
→ "Nuevo Apercibimiento" → Formulario (empleado, tipo, descripción)
→ Guardar → Aparece en lista
→ Luego: subir documento firmado

CREAR REUNIÓN:
/milocal/:id → Sidebar "Reuniones" → /milocal/:id/equipo/reuniones
→ Crear reunión (2 fases: Convocatoria → Ejecución)
→ Selecciona participantes → Envía notificación
→ Luego: cierra reunión con notas → Participantes confirman lectura

VER FICHAJES DEL EQUIPO:
/milocal/:id → Sidebar "Fichajes" → /milocal/:id/equipo/fichajes
→ Tab "Hoy" (auto-refresh 30s) o Tab "Histórico" (filtro por fecha)
→ Ve nombre, hora, tipo, foto
```

---

## 4. FRANQUICIADO

### 4.1 Primer contacto

- Asignación directa por superadmin
- **Redirect post-login:** `/milocal/{firstBranchId}`

### 4.2 Navegación

**Panel Mi Cuenta:** Solo Inicio, Perfil, Comunicados (NO ve Mi Trabajo, Solicitudes, Reglamento — es dueño, no operativo).

**Panel Mi Local (LocalSidebar):**

| Sección | Items visibles | Funciona |
|---------|---------------|----------|
| Dashboard | ✅ | ✅ |
| Gestión de Personas | Equipo (read), Horarios (read-only), Fichajes, Solicitudes (read), Liquidación, Coaching (read + evaluar encargado), Reuniones, Adelantos (read), Apercibimientos (read), Firmas (read), Comunicados (read) | ✅ (mayoría read-only) |
| Operaciones | Proveedores (read), Facturas (read) | ✅ |
| Finanzas | Caja Chica (read), Consumos (read), Ventas Mensuales, Cargador RDO, Resultado Económico (P&L), Inversiones (CAPEX), Períodos | ✅ |
| Socios | Cuenta socio | ✅ |
| Supervisiones | Historial | ✅ |
| Configuración | Turnos, Impresoras | ✅ |

### 4.3 Pantallas accesibles (diferencias con encargado)

| Pantalla | Qué ve | Qué puede hacer | Problemas detectados | Sugerencia |
|----------|--------|-----------------|---------------------|------------|
| Horarios | Grid read-only + banner | Solo lectura | Banner de read-only correcto | N/A |
| Solicitudes | Lista + banner read-only | Solo lectura | Banner read-only correcto | N/A |
| P&L | Dashboard económico | Ver P&L completo | Delegado a `RdoDashboard` | N/A |
| Ventas Mensuales | Ventas totales y en efectivo por período | Editar ventas | Sin validación visible | Validar montos |
| RDO Carga | Cargador unificado | Cargar datos económicos | Delegado a componente | N/A |
| Inversiones | Gestor CAPEX | Gestionar inversiones | Delegado a componente | N/A |
| Períodos | Lista períodos contables | Crear, cerrar, reabrir | Sin validación duplicados. Reabrir pide razón pero cerrar no | Consistencia en razones |
| Socios | Partners + movimientos | Crear socio, registrar movimiento | Warning si % no suma 100%. Sin validación >100% | Validar máximo 100% |
| Reuniones | Lista reuniones | Crear y cerrar reuniones | Mismo que encargado | N/A |
| Coaching Encargado | Tab especial "Mi Encargado" | Evaluar al encargado | Solo visible para franquiciado y superadmin | Correcto |

### 4.4 Flujos críticos

```
VER P&L:
/milocal/:id → Sidebar "Resultado Económico" → /milocal/:id/finanzas/pl
→ Dashboard con métricas económicas del período

GESTIONAR PROVEEDORES/COMPRAS:
/milocal/:id → Sidebar "Proveedores" → /milocal/:id/finanzas/proveedores
→ Lista proveedores con saldos → Click proveedor →
→ /milocal/:id/finanzas/proveedores/:proveedorId → Cuenta corriente
→ Solo lectura (canUploadInvoice=false, canPaySupplier=false)

VER LIQUIDACIÓN HORAS:
/milocal/:id → Sidebar "Liquidación" → /milocal/:id/tiempo/liquidacion
→ Resumen de horas por empleado con cálculo CCT 329/00
→ Solo lectura, para pasar al contador/liquidador de sueldos
```

---

## 5. CONTADOR_LOCAL

### 5.1 Primer contacto

- Invitación vía email
- **Redirect post-login:** `/cuenta` (no `/milocal`)
- ⚠ Debe navegar manualmente a Mi Local vía PanelSwitcher

### 5.2 Navegación

**Panel Mi Cuenta:** Inicio + Perfil + Comunicados (no es operativo).

**Panel Mi Local (LocalSidebar):**

| Sección | Items visibles | Funciona |
|---------|---------------|----------|
| Dashboard | ✅ | ✅ |
| Gestión de Personas | Fichajes (read), Liquidación (read), Adelantos (read), Apercibimientos (read) | ✅ |
| Operaciones | Facturas (upload), Proveedores (full) | ✅ |
| Finanzas | Caja Chica, Consumos, Ventas Mensuales, P&L, Períodos | ✅ |
| Comunicados | Solo lectura | ✅ |

### 5.3 Pantallas accesibles

| Pantalla | Qué ve | Qué puede hacer | Problemas detectados | Sugerencia |
|----------|--------|-----------------|---------------------|------------|
| Facturas/Compras | Lista facturas | Crear factura, registrar items | Principal función del rol | N/A |
| Proveedores | Lista con saldos y CC | Registrar pagos, ver CC | Sin paginación en CC | Agregar paginación |
| CC Proveedor | Saldo, facturas, pagos | Registrar pago, eliminar pago no verificado | Complejo pero funcional. Sin export | Agregar export Excel |
| Gastos (Caja chica) | Lista gastos | Crear, editar, eliminar | Sin confirm antes de borrar | Confirm dialog |
| Consumos | Consumos manuales | Crear, editar, eliminar | Sin paginación | Paginación |
| Ventas Mensuales | Ventas por período | Editar totales | Sin validación visible | Validar montos |
| P&L | Dashboard económico | Solo lectura | N/A | N/A |
| Períodos | Lista períodos | Crear, cerrar, reabrir | Sin validación duplicados | Validar |
| Liquidación | Horas por empleado | Solo lectura | N/A | Export Excel |
| Adelantos | Lista adelantos | Solo lectura | N/A | N/A |

### 5.4 Flujos críticos

```
CARGAR FACTURA DE COMPRA:
/milocal/:id → Sidebar "Facturas" → /milocal/:id/finanzas/compras
→ "Nueva Compra" → Modal formulario:
  - Proveedor (select), Nro factura, Fecha, Fecha vencimiento
  - Items: concepto, cantidad, unidad, precio, IVA, subtotal
→ Guardar → Aparece en lista

REGISTRAR PAGO A PROVEEDOR:
/milocal/:id → Sidebar "Proveedores" → Click proveedor →
/milocal/:id/finanzas/proveedores/:proveedorId
→ "Registrar Pago" → Modal: monto, método, referencia
→ Guardar → Actualiza saldo

VER CUENTA CORRIENTE:
/milocal/:id → Sidebar "Proveedores" → Click proveedor →
→ 4 cards resumen (saldo, vencido, por vencer, pagos pendientes)
→ Tabla cronológica de movimientos
→ Puede registrar pago general o por factura específica

CARGAR GASTOS:
/milocal/:id → Sidebar "Caja Chica" → /milocal/:id/finanzas/gastos
→ "Nuevo Gasto" → Modal: fecha, categoría, concepto, monto, vencimiento
→ Guardar → Aparece en lista con estado (vencido si aplica)
```

---

## 6. SUPERADMIN

### 6.1 Primer contacto

- Asignación directa en base de datos
- **Redirect post-login:** `/mimarca`

### 6.2 Navegación

Tiene acceso a los **3 paneles** con TODOS los permisos.

**Panel Mi Marca (BrandSidebar):**

| Sección | Items | Funciona |
|---------|-------|----------|
| Dashboard | Stats globales, ventas diarias | ✅ |
| Locales | Lista sucursales, detalle, crear nueva | ✅ |
| Ingeniería de Menú | Carta, Recetas, Insumos, Proveedores marca, Centro costos | ✅ |
| Gestión de Red | Coaching encargados, Coaching red, Comunicados, Reuniones | ✅ |
| Modelo Operativo | Reglamentos, Calendario laboral, Config cierres, Permisos | ✅ |
| Finanzas Marca | Ventas mensuales, Canon | ✅ |
| Administración | Mensajes contacto, Equipo central, Usuarios | ✅ |

### 6.3 Pantallas accesibles (Mi Marca)

| Pantalla | Qué ve | Qué puede hacer | Problemas detectados | Sugerencia |
|----------|--------|-----------------|---------------------|------------|
| Dashboard Marca | Ventas diarias, stats globales, grid sucursales | Ver métricas | Sin error handling. Sin empty state para sucursales | Agregar ambos |
| Locales/:slug | Info sucursal + equipo | Editar info, gestionar equipo | `(branch as any).public_status` — type safety issue | Fix typing |
| Usuarios | Tabla con filtros | Buscar, filtrar por rol/acceso | Solo superadmin puede ver | N/A |
| Equipo Central | Roles de marca | Invitar, remover | N/A | N/A |
| Comunicados | Lista + crear | Enviar a sucursales/roles, eliminar | Sin confirm antes de borrar. Sin paginación | Confirm + paginación |
| Mensajes Contacto | Formularios públicos | Leer, gestionar | N/A | N/A |
| Reuniones Marca | Reuniones de red | Crear, ver todas | N/A | N/A |
| Coaching Encargados | Stats + evaluar | Evaluar encargados por sucursal | Completados no se pueden expandir para ver detalle | Permitir ver detalle |
| Coaching Red | Dashboard consolidado | Solo lectura | Permiso `canEditBrandConfig` incorrecto (es read-only) | Cambiar a `canViewCoaching` |
| Supervisiones | Lista inspecciones | Crear nueva, filtrar, eliminar | Sin error toast en delete | Agregar toast |
| Nueva Supervisión | Seleccionar sucursal y tipo | Iniciar inspección (BOH/FOH/Ultra Smash) | Sin error handling si fetch falla | Agregar error state |
| Detalle Supervisión | Checklist + scores | Completar inspección | N/A | N/A |
| Proveedores Marca | Lista | CRUD proveedores | Sin paginación | Paginación |
| Insumos | Tabs (ingredientes/insumos/productos) | CRUD insumos, sort, obligatorio/sugerido | Sin paginación. Filtros complejos | Paginación. Simplificar |
| Conceptos Servicio | Catálogo servicios | CRUD | N/A | N/A |
| Canon | Liquidaciones por sucursal | Verificar pagos | Nested expandables confusos | Simplificar UI |
| Ventas Mensuales | Consolidado por sucursal | Editar | N/A | N/A |
| Carta/Menú | Categorías + productos | CRUD, drag-and-drop | N/A | N/A |
| Recetas | Lista preparaciones | CRUD, ingredientes, costos | N/A | N/A |
| Centro Costos | Análisis FC, márgenes | Ver precios sugeridos | N/A | N/A |
| Reglamentos | Versiones de reglamento | Subir, versionar | N/A | N/A |
| Calendario Laboral | Feriados | CRUD, importar feriados Argentina | N/A | N/A |
| Config Cierres | Categorías, tipos, extras, apps | Toggle activo, agregar, eliminar | Drag handle visible pero sin funcionalidad. Sin confirm en delete | Implementar drag o remover icono. Confirm |
| Config Permisos | Grilla roles × permisos | Toggle permisos por rol | Sin feedback durante update. Sin confirm en cambios | Loading + confirm |

### 6.4 Funciones exclusivas

- Reordenar sidebar con drag & drop
- Impersonar usuarios ("Ver como...")
- Acceso a TODOS los locales (no necesita asignación)
- Configurar permisos de otros roles
- Gestionar equipo central
- Crear nuevas sucursales

---

## 7. COORDINADOR

### 7.1 Primer contacto

- Asignación por superadmin
- **Redirect post-login:** `/mimarca`

### 7.2 Navegación (BrandSidebar)

| Sección | Items visibles | Funciona |
|---------|---------------|----------|
| Dashboard | ✅ | ✅ |
| Locales | ✅ (sin crear) | ✅ |
| Ingeniería de Menú | Carta, Recetas, Insumos, Proveedores, Centro costos | ✅ (full edit) |
| Gestión de Red | Coaching encargados, Coaching red, Comunicados, Reuniones | ✅ |
| Modelo Operativo | Conceptos Servicio (read) | Parcial |
| Finanzas Marca | NO | Correcto |
| Administración | Mensajes contacto, Equipo central (read) | ✅ |

### 7.3 Tabla resumen

| Pantalla | Qué ve | Qué puede hacer | Problemas | Sugerencia |
|----------|--------|-----------------|-----------|------------|
| Dashboard | Stats globales | Solo lectura | No ve P&L ni comparativa ni horas | Correcto por rol |
| Locales | Lista + detalle | Ver info, NO crear | Correcto | N/A |
| Carta/Recetas/Insumos | Todo | CRUD completo | N/A | N/A |
| Coaching Encargados | Stats + evaluar | Evaluar encargados | N/A | N/A |
| Comunicados | Lista + crear | Enviar comunicados | N/A | N/A |
| Reuniones | Lista | Crear reuniones | N/A | N/A |
| Mensajes Contacto | Lista | Leer y gestionar | N/A | N/A |

---

## 8. INFORMES

### 8.1 Primer contacto

- Asignación por superadmin
- **Redirect post-login:** `/mimarca`

### 8.2 Navegación (BrandSidebar)

| Sección | Items visibles | Funciona |
|---------|---------------|----------|
| Dashboard | ✅ (con P&L, comparativa, horas) | ✅ |
| Locales | ✅ (solo ver) | ✅ |
| Finanzas Marca | Ventas Mensuales (read) | ✅ |
| Todo lo demás | NO | Correcto |

### 8.3 Tabla resumen

| Pantalla | Qué ve | Qué puede hacer | Problemas | Sugerencia |
|----------|--------|-----------------|-----------|------------|
| Dashboard | Stats completos | Solo lectura | N/A | N/A |
| Locales | Lista + detalle | Solo lectura | N/A | N/A |
| Ventas Mensuales | Consolidado | Solo lectura | N/A | Agregar exportar Excel |

**Problema principal:** Rol muy limitado. No puede ver coaching, inspecciones, reuniones. Podría ser demasiado restrictivo dependiendo del uso real.

---

## 9. CONTADOR_MARCA

### 9.1 Primer contacto

- Asignación por superadmin
- **Redirect post-login:** `/mimarca`

### 9.2 Navegación (BrandSidebar)

| Sección | Items visibles | Funciona |
|---------|---------------|----------|
| Dashboard | ✅ (con P&L, comparativa, horas) | ✅ |
| Locales | ✅ (solo ver) | ✅ |
| Ingeniería de Menú | Insumos (read), Proveedores (read), Conceptos (read) | Solo lectura |
| Finanzas Marca | Ventas Mensuales (edit), Canon (edit) | ✅ |
| Todo lo demás | NO | Correcto |

### 9.3 Tabla resumen

| Pantalla | Qué ve | Qué puede hacer | Problemas | Sugerencia |
|----------|--------|-----------------|-----------|------------|
| Dashboard | Stats completos | Solo lectura | N/A | N/A |
| Locales | Lista + detalle | Solo lectura | N/A | N/A |
| Insumos | Catálogo | Solo lectura | N/A | N/A |
| Proveedores | Lista | Solo lectura | N/A | N/A |
| Ventas Mensuales | Consolidado | Editar | N/A | N/A |
| Canon | Liquidaciones | Verificar pagos, editar | N/A | N/A |

---

## Diagramas de flujo por rol

### Empleado

```
Login (/ingresar) → /cuenta
    ↓
[Sidebar Mi Cuenta]
    ├── Inicio → Dashboard personal (info sucursal, PIN, urgentes)
    ├── Perfil → Editar datos personales
    ├── Horario → Calendario mensual (read-only)
    ├── Fichajes → Historial fichajes (read-only)
    ├── Coachings → Ver/confirmar coachings recibidos
    ├── Reuniones → Ver reuniones, confirmar lectura
    ├── Solicitudes → Pedir día libre
    ├── Adelantos → Ver adelantos (read-only)
    ├── Comunicados → Leer comunicados, confirmar lectura
    └── Reglamento → Ver PDF, ver estado firma

Flujo externo:
    /fichaje/:branchCode → PIN → Reglamento check → Selfie → GPS → Registro
```

### Cajero

```
Login → /cuenta → PanelSwitcher → /milocal/:id
    ↓
[Sidebar Mi Local] (limitado)
    ├── Dashboard → Métricas básicas
    ├── Reuniones → Ver reuniones
    └── Ventas → Cerrar turno, ingresar ventas

[Sidebar Mi Cuenta] (igual a empleado)
```

### Encargado

```
Login → /milocal/:firstBranchId
    ↓
[Sidebar Mi Local] (completo operativo)
    ├── Dashboard → Métricas del local
    ├── Equipo → CRUD empleados, invitar, desactivar
    ├── Horarios → Crear/editar grid mensual → Publicar
    ├── Fichajes → QR + historial por día
    ├── Solicitudes → Aprobar/rechazar → Nota
    ├── Liquidación → Horas CCT 329/00 (read-only)
    ├── Coaching → Evaluar equipo (estaciones + competencias)
    ├── Reuniones → Crear → Convocar → Cerrar → Track lectura
    ├── Adelantos → Crear adelanto → Cancelar
    ├── Apercibimientos → Crear → Subir firma
    ├── Comunicados → Enviar a equipo
    ├── Facturas → Crear factura compra → Items
    ├── Proveedores → CRUD local → Ver CC
    ├── Gastos → CRUD caja chica
    ├── Consumos → CRUD consumos manuales
    ├── Supervisiones → Ver historial (read-only)
    └── Config → Turnos, impresoras

[PanelSwitcher] → Mi Cuenta (datos personales)
```

### Franquiciado

```
Login → /milocal/:firstBranchId
    ↓
[Sidebar Mi Local] (supervisión + finanzas)
    ├── Dashboard → Métricas
    ├── Equipo → Ver equipo (read-only)
    ├── Horarios → Ver grid (read-only, banner)
    ├── Fichajes → Ver historial
    ├── Solicitudes → Ver (read-only, banner)
    ├── Liquidación → Ver horas
    ├── Coaching → Ver + evaluar ENCARGADO (tab especial)
    ├── Reuniones → Crear y cerrar
    ├── Adelantos → Ver (read-only)
    ├── Apercibimientos → Ver (read-only)
    ├── Comunicados → Ver
    ├── Proveedores → Ver CC, saldos
    ├── Facturas → Ver historial (no crea)
    ├── Gastos → Ver (read-only)
    ├── Consumos → Ver (read-only)
    ├── Ventas Mensuales → Editar totales
    ├── RDO Carga → Cargar datos económicos
    ├── P&L → Dashboard completo
    ├── Inversiones → Gestionar CAPEX
    ├── Períodos → Crear, cerrar, reabrir
    ├── Socios → CRUD socios + movimientos
    └── Config → Turnos

[PanelSwitcher] → Mi Cuenta (perfil + comunicados)
```

### Contador Local

```
Login → /cuenta → PanelSwitcher → /milocal/:id
    ↓
[Sidebar Mi Local] (financiero)
    ├── Dashboard → Métricas
    ├── Fichajes → Ver (read-only)
    ├── Liquidación → Ver horas
    ├── Adelantos → Ver (read-only)
    ├── Facturas → CREAR facturas, items
    ├── Proveedores → Ver CC, REGISTRAR PAGOS
    ├── Gastos → CRUD caja chica
    ├── Consumos → CRUD manuales
    ├── Ventas Mensuales → Editar
    ├── P&L → Ver (read-only)
    ├── Períodos → Crear, cerrar, reabrir
    └── Comunicados → Ver (read-only)
```

### Superadmin

```
Login → /mimarca
    ↓
[Sidebar Mi Marca] (TODO)
    ├── Dashboard → Stats globales + ventas diarias
    ├── Locales → Lista → Detalle → Info + Equipo → Crear nueva
    ├── Carta → CRUD menú, categorías, drag-and-drop
    ├── Recetas → CRUD preparaciones, ingredientes, costos
    ├── Insumos → CRUD catálogo (ingredientes/insumos/productos)
    ├── Proveedores Marca → CRUD proveedores globales
    ├── Centro Costos → Análisis FC, márgenes, precios sugeridos
    ├── Coaching Encargados → Evaluar encargados por sucursal
    ├── Coaching Red → Dashboard consolidado
    ├── Comunicados → Enviar a sucursales/roles
    ├── Reuniones → Crear reuniones de red
    ├── Reglamentos → Subir, versionar
    ├── Calendario Laboral → Feriados, importar
    ├── Config Cierres → Categorías, tipos, extras, apps
    ├── Config Permisos → Toggle permisos por rol
    ├── Ventas Mensuales → Consolidado, editar
    ├── Canon → Liquidaciones, verificar pagos
    ├── Mensajes Contacto → Leer formularios públicos
    ├── Equipo Central → Roles marca, invitar
    ├── Usuarios → Buscar, filtrar, gestionar roles
    └── Conceptos Servicio → CRUD servicios recurrentes

[PanelSwitcher] → Mi Local (cualquier sucursal, todos los permisos)
[PanelSwitcher] → Mi Cuenta (datos personales)
[Impersonation] → "Ver como..." cualquier usuario
[Drag & Drop] → Reordenar secciones sidebar
```

### Coordinador

```
Login → /mimarca
    ↓
[Sidebar Mi Marca] (operativo sin finanzas)
    ├── Dashboard → Stats (sin P&L)
    ├── Locales → Ver (sin crear)
    ├── Carta/Recetas/Insumos/Proveedores → CRUD completo
    ├── Centro Costos → Ver
    ├── Coaching Encargados → Evaluar
    ├── Coaching Red → Ver
    ├── Comunicados → Enviar
    ├── Reuniones → Crear
    ├── Mensajes Contacto → Leer
    ├── Equipo Central → Ver (sin gestionar)
    └── Conceptos Servicio → Ver
```

### Informes

```
Login → /mimarca
    ↓
[Sidebar Mi Marca] (solo lectura)
    ├── Dashboard → Stats completos (con P&L, comparativa, horas)
    ├── Locales → Ver (sin crear)
    └── Ventas Mensuales → Ver (sin editar)
```

### Contador Marca

```
Login → /mimarca
    ↓
[Sidebar Mi Marca] (finanzas marca)
    ├── Dashboard → Stats completos
    ├── Locales → Ver
    ├── Insumos → Ver (read-only)
    ├── Proveedores → Ver (read-only)
    ├── Conceptos Servicio → Ver (read-only)
    ├── Ventas Mensuales → Editar
    └── Canon → Gestionar liquidaciones
```

---

## Problemas de UX transversales

### Estados vacíos sin mensaje

| Componente | Problema |
|-----------|----------|
| `MyMeetingsCard` | Se oculta completamente si no hay reuniones |
| `MySalaryAdvancesCard` | Se oculta completamente si no hay adelantos |
| `MyRegulationsCard` | Se oculta si no hay reglamento |
| `BrandHome` sucursales grid | Sin empty state si no hay sucursales |
| `TeamPage` | Sin empty state explícito |

### Acciones sin confirmación que deberían tenerla

| Acción | Pantalla |
|--------|----------|
| Eliminar comunicado | `CommunicationsPage` (marca) |
| Eliminar comunicado local | `LocalCommunicationsPage` |
| Cancelar adelanto | `AdvancesPage` |
| Eliminar gasto | `GastosPage` |
| Toggle permiso | `PermissionsConfigPage` |
| Eliminar item config cierre | `ClosureConfigPage` |

### Loadings que no se muestran

| Pantalla | Problema |
|----------|----------|
| `SchedulesPage` | Retorna `null` durante carga (pantalla blanca) |
| `MyCoachingsCardEnhanced` modal | Sin loading durante mutación |
| `PermissionsConfigPage` | Sin feedback visual durante toggle |
| `MyRegulationsCard` | Sin loading states |
| Varias páginas delegadas (`PLDashboard`, `InversionesPage`, `RdoLoaderPage`) | Sin loading propio |

### Errores que no se comunican al usuario

| Pantalla | Problema |
|----------|----------|
| `TeamPage` | Query errors no manejados |
| `SchedulesPage` | Sin feedback si falla el guardado |
| `CoachingPage` | Sin feedback en submit |
| `BrandHome` | Sin error handling para queries fallidos |
| `NewInspectionPage` | Sin error state si fetch de branches falla |
| `CoachingNetworkPage` | Sin error handling |

### Textos confusos o inconsistencias idiomáticas

| Ubicación | Problema |
|-----------|----------|
| `CuentaPerfil` | "Seguridad" sección podría llamarse "Contraseña" |
| `MyRequestsCard` | Botón dice "Request Day Off" podría estar en inglés |
| Varios | Mezcla de "coaching", "meeting" en código que se traduce pero podría escapar |

### Inconsistencias de diseño

| Problema | Dónde |
|----------|-------|
| Loading full-screen vs skeleton | `AdvancesPage` y `WarningsPage` usan full-screen; otros usan skeleton |
| Cards que se ocultan vs empty state | Algunos componentes se ocultan, otros muestran mensaje |
| Paginación | Ninguna pantalla tiene paginación real; algunas limitan a 5, 50, etc. |
| Confirm dialogs | Algunos deletes tienen confirm, otros no |

---

## Cosas que faltan (obvias por contexto)

### Filtros y búsqueda

| Pantalla | Falta |
|----------|-------|
| `InspectionsLocalPage` | Sin filtro por tipo, estado, fecha |
| `CuentaCorrienteProveedorPage` | Sin filtro por fecha en transacciones |
| `SociosPage` movimientos | Sin filtro por fecha |
| `InsumosLocalPage` | Sin filtro por categoría |
| Todas las listas de comunicados | Sin búsqueda por texto |

### Exportar datos

| Pantalla | Falta |
|----------|-------|
| Liquidación de horas | Sin exportar a Excel/PDF |
| Cuenta corriente proveedor | Sin exportar |
| Historial de ventas | Sin exportar |
| Lista de empleados | Sin exportar |
| Inspecciones | Sin exportar |
| P&L | Sin exportar |
| Coaching stats | El botón existe pero no se verificó funcionalidad |

### Navegación temporal

| Pantalla | Estado actual | Falta |
|----------|--------------|-------|
| Horario empleado | Navegación por mes | OK |
| Adelantos | Navegación por mes | OK |
| Fichajes (histórico) | Filtro por día | Falta semana/mes |
| Compras | Sin filtro fecha | Falta filtro por período |
| Gastos | Sin filtro fecha | Falta filtro por período |
| Consumos | Sin filtro fecha | Falta filtro por período |

### Historial / auditoría

| Funcionalidad | Estado |
|--------------|--------|
| Tabla `audit_logs` | Existe en DB pero sin UI para verla |
| Historial de cambios de horario | Parcial (tracking de modificaciones) |
| Historial de cambios de roles | No visible en UI |
| Historial de cambios de permisos | No visible en UI |
| Log de quién aprobó/rechazó solicitudes | Sí (`response_by`) |
| Log de inspecciones | Sí (inspector name visible) |

---

## Resumen de hallazgos críticos

### Prioridad alta

1. **SchedulesPage retorna null durante carga** — Pantalla en blanco para el encargado
2. **Paginación inexistente** en todas las listas — Problemático cuando escale
3. **Errores silenciosos** en muchas mutaciones — El usuario no sabe si falló
4. **Empleado no puede solicitar adelanto** — Solo ve historial, el encargado lo crea
5. **CoachingNetworkPage usa permiso incorrecto** (`canEditBrandConfig` para página read-only)
6. **Config Cierres tiene drag handle sin funcionalidad** — Confunde al usuario
7. **Comunicados: modal no se cierra** si no confirmás lectura

### Prioridad media

8. **Contador_local aterriza en /cuenta**, no en /milocal — Tiene que navegar manualmente
9. **Cards que se ocultan** en vez de mostrar empty state (reuniones, adelantos, reglamento)
10. **Full-screen loaders** en adelantos y apercibimientos bloquean toda la UI
11. **Sin exportar a Excel/PDF** en liquidación, P&L, CC proveedores
12. **Sin filtros de fecha** en compras, gastos, consumos, transacciones CC
13. **Confirmaciones inconsistentes** — Algunos deletes piden confirm, otros no

### Prioridad baja

14. **Sin onboarding** para ningún rol
15. **Mezcla potencial de idiomas** en algunos textos internos
16. **Sin soporte offline** para fichaje
17. **PIN no auto-submit** al completar 4 dígitos
18. **Avatar no se puede cambiar** en perfil
19. **Audit logs existen en DB** pero no tienen UI
20. **Sin notificaciones push** (solo comunicados internos)
