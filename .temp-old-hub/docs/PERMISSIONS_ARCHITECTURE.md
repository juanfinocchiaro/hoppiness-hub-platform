# Arquitectura de Permisos - Hoppiness Club

## Modelo Híbrido de 3 Capas

El sistema de permisos utiliza un modelo híbrido que combina roles globales con permisos granulares por sucursal.

### Capas del Sistema

1. **Rol Global** → Define capacidades base del usuario en toda la plataforma
2. **Identidad de Usuario** → `user_id` de Supabase Auth vincula todas las tablas
3. **Permisos Granulares** → Override específico por sucursal usando permission keys

---

## Estructura de Paneles

| Panel | Acceso | Descripción |
|-------|--------|-------------|
| **Panel Marca** | admin, coordinador, socio | Gestión centralizada de la cadena |
| **Panel Mi Local** | admin, franquiciado, gerente, empleado | Operación de sucursal específica |

---

## Tablas de Base de Datos

### `user_roles`
Almacena el rol global de cada usuario.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | uuid | PK |
| user_id | uuid | FK a auth.users |
| role | app_role | admin, coordinador, socio, franquiciado, gerente, empleado |
| created_at | timestamptz | Fecha de creación |

### `profiles`
Información pública del usuario.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | uuid | PK |
| user_id | uuid | FK a auth.users |
| full_name | text | Nombre completo |
| email | text | Email |
| phone | text | Teléfono |
| avatar_url | text | URL de avatar |
| pin_hash | text | Hash del PIN para acceso rápido |
| is_active | boolean | Estado activo |

### `permission_definitions`
Catálogo de 55+ permission keys disponibles.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | uuid | PK |
| key | text | Identificador único (ej: "orders.view") |
| name | text | Nombre legible |
| description | text | Descripción del permiso |
| module | text | Módulo al que pertenece |
| min_role | app_role | Rol mínimo requerido |

### `user_branch_permissions`
Asignación granular de permisos por usuario y sucursal.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | uuid | PK |
| user_id | uuid | FK a auth.users |
| branch_id | uuid | FK a branches |
| permission_key | text | Key del permiso asignado |
| granted_by | uuid | Usuario que otorgó el permiso |
| granted_at | timestamptz | Fecha de otorgamiento |

### `permission_audit_logs`
Registro de auditoría de cambios de permisos.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | uuid | PK |
| user_id | uuid | Usuario que realizó el cambio |
| branch_id | uuid | Sucursal afectada |
| target_user_id | uuid | Usuario cuyos permisos cambiaron |
| action | text | grant, revoke, bulk_grant, bulk_revoke |
| permission_keys | text[] | Permisos afectados |
| reason | text | Motivo opcional |
| created_at | timestamptz | Fecha del cambio |

### `branch_permissions` (Legacy)
Permisos booleanos heredados - mantener para compatibilidad.

| Columna | Tipo |
|---------|------|
| user_id | uuid |
| branch_id | uuid |
| can_manage_orders | boolean |
| can_manage_products | boolean |
| can_manage_staff | boolean |
| can_manage_inventory | boolean |
| can_view_reports | boolean |

---

## Funciones de Seguridad SQL

### `has_role(_role, _user_id)`
Verifica si el usuario tiene un rol específico o superior.

```sql
SELECT public.has_role('gerente', auth.uid());
```

### `is_admin(_user_id)`
Atajo para verificar rol admin.

```sql
SELECT public.is_admin(auth.uid());
```

### `has_branch_access(_branch_id, _user_id)`
Verifica si el usuario tiene algún acceso a la sucursal.

```sql
SELECT public.has_branch_access('uuid-sucursal', auth.uid());
```

### `has_branch_permission(_branch_id, _permission, _user_id)`
**Función principal** - Verifica permiso granular específico.

```sql
SELECT public.has_branch_permission(
  'uuid-sucursal',
  'orders.manage',
  auth.uid()
);
```

**Lógica de evaluación:**
1. Admins → siempre `true`
2. Socios → solo permisos de lectura predefinidos
3. Busca en `user_branch_permissions` el key exacto
4. Fallback a columnas booleanas en `branch_permissions`
5. Default → `false`

### `grant_role_defaults(_branch_id, _role, _user_id)`
Asigna permisos predeterminados según el rol.

```sql
SELECT public.grant_role_defaults(
  'uuid-sucursal',
  'gerente',
  'uuid-usuario'
);
```

---

## Jerarquía de Roles

```
admin (nivel 6) ─────────────────────── Acceso total, bypass de permisos
  │
  ├── coordinador (nivel 5) ─────────── Panel Marca sin finanzas/RRHH
  │
  ├── socio (nivel 4) ───────────────── Solo lectura de reportes financieros
  │
  └── franquiciado (nivel 3) ────────── Dueño de sucursal, puede crear usuarios
       │
       └── gerente (nivel 2) ────────── Encargado operativo
            │
            └── empleado (nivel 1) ──── Operación básica (POS/KDS)
```

**Regla de herencia:** Un rol superior puede hacer todo lo que hace uno inferior (excepto socio que es solo lectura).

---

## Descripción Detallada de Roles

### 🔴 Admin (Admin de Marca)
- **Acceso:** Total a Panel Marca y todos los Panel Mi Local
- **Capacidades:** Gestión completa de la cadena, productos globales, usuarios, sucursales
- **Bypass:** La función `has_branch_permission` siempre retorna `true`
- **Quién lo usa:** Dueño de la marca

### 🟠 Coordinador
- **Acceso:** Panel Marca
- **Capacidades:** Marketing, productos, operaciones, reportes de ventas
- **Restricciones:** Sin acceso a finanzas ni RRHH
- **Quién lo usa:** Coordinador digital, marketing, operaciones centrales

### ⚪ Socio
- **Acceso:** Panel Marca (solo lectura)
- **Capacidades:** Ver reportes financieros, P&L, ventas globales
- **Restricciones:** No puede modificar nada
- **Quién lo usa:** Socios inversores, contadores externos

### 🟣 Franquiciado
- **Acceso:** Panel Mi Local de su(s) sucursal(es)
- **Capacidades:** 
  - Gestión completa de su local
  - Ver datos privados de empleados (DNI, CBU, sueldos)
  - Crear usuarios para su sucursal (gerentes, empleados)
  - Reportes financieros y P&L de su local
- **Quién lo usa:** Dueño de franquicia

### 🔵 Gerente (Encargado)
- **Acceso:** Panel Mi Local de su sucursal asignada
- **Capacidades:** 
  - Operación diaria completa
  - Gestión de horarios y asistencia
  - Reportes de ventas y productos
  - Ajustes de caja e inventario
- **Restricciones:** Sin datos privados de empleados, sin P&L
- **Quién lo usa:** Encargado de turno

### 🟢 Empleado
- **Acceso:** Panel Mi Local (limitado)
- **Capacidades:** 
  - POS y KDS
  - Ver pedidos y procesarlos
  - Ver su propio horario
- **Restricciones:** Sin acceso a reportes, finanzas, RRHH
- **Quién lo usa:** Cajero, cocinero, delivery

---

## Flujo de Creación de Usuarios

```
Admin de Marca
    │
    ├── Crea usuarios de Panel Marca
    │   ├── Coordinadores (Alejandro)
    │   └── Socios (Ismael)
    │
    └── Crea Franquiciados y los asigna a sucursales
            │
            └── Franquiciado
                    │
                    └── Crea usuarios de SU sucursal
                        ├── Gerentes (Encargados)
                        └── Empleados (Cajeros, Cocineros)
```

---

## Permission Keys por Módulo

### 📋 Pedidos (orders)
| Key | Nombre | Min Role |
|-----|--------|----------|
| orders.view | Ver pedidos | empleado |
| orders.manage | Gestionar pedidos | empleado |
| orders.cancel | Cancelar pedidos | gerente |
| orders.refund | Reembolsar pedidos | gerente |
| orders.history | Ver historial completo | gerente |

### 🛒 POS
| Key | Nombre | Min Role |
|-----|--------|----------|
| pos.sell | Vender en POS | empleado |
| pos.discounts | Aplicar descuentos | gerente |
| pos.void_items | Anular items | gerente |
| pos.open_drawer | Abrir cajón | empleado |
| pos.reprint | Reimprimir tickets | empleado |

### 💰 Caja (cash)
| Key | Nombre | Min Role |
|-----|--------|----------|
| cash.view_shift | Ver turno actual | empleado |
| cash.open_close | Abrir/cerrar caja | gerente |
| cash.movements | Registrar movimientos | gerente |
| cash.adjustments | Ajustes de caja | gerente |
| cash.reports | Reportes de caja | gerente |

### 📦 Productos (products)
| Key | Nombre | Min Role |
|-----|--------|----------|
| products.view | Ver productos | empleado |
| products.availability | Cambiar disponibilidad | empleado |
| products.prices | Modificar precios | gerente |
| products.create | Crear productos | gerente |
| products.delete | Eliminar productos | admin |

### 📊 Inventario (inventory)
| Key | Nombre | Min Role |
|-----|--------|----------|
| inventory.view | Ver inventario | empleado |
| inventory.adjust | Ajustar stock | gerente |
| inventory.orders | Pedidos a proveedores | gerente |
| inventory.receiving | Recibir mercadería | empleado |
| inventory.counts | Conteos de inventario | gerente |

### 👥 RRHH (hr)
| Key | Nombre | Min Role |
|-----|--------|----------|
| hr.employees_view | Ver empleados | gerente |
| hr.employees_manage | Gestionar empleados | gerente |
| hr.employees_private | Datos privados empleados | franquiciado |
| hr.schedules_view | Ver horarios | empleado |
| hr.schedules_manage | Gestionar horarios | gerente |
| hr.attendance_view | Ver asistencia | gerente |
| hr.attendance_manage | Gestionar asistencia | gerente |
| hr.payroll_view | Ver nómina | franquiciado |
| hr.payroll_manage | Gestionar nómina | franquiciado |
| hr.documents | Documentos empleados | franquiciado |
| hr.warnings | Amonestaciones | gerente |

### 📈 Reportes (reports)
| Key | Nombre | Min Role |
|-----|--------|----------|
| reports.sales | Reportes de ventas | gerente |
| reports.products | Reportes de productos | gerente |
| reports.employees | Reportes de empleados | gerente |
| reports.financial | Reportes financieros | franquiciado |
| reports.export | Exportar reportes | gerente |

### 💵 Finanzas (finance)
| Key | Nombre | Min Role |
|-----|--------|----------|
| finance.view | Ver finanzas | franquiciado |
| finance.transactions | Registrar transacciones | gerente |
| finance.suppliers | Gestionar proveedores | gerente |
| finance.payments | Pagos a proveedores | franquiciado |
| finance.pl_report | Estado de resultados | franquiciado |

### ⚙️ Configuración (settings)
| Key | Nombre | Min Role |
|-----|--------|----------|
| settings.branch_info | Info de sucursal | gerente |
| settings.schedules | Horarios de apertura | gerente |
| settings.delivery_zones | Zonas de delivery | gerente |
| settings.printers | Impresoras | gerente |
| settings.payment_methods | Métodos de pago | gerente |
| settings.integrations | Integraciones | franquiciado |

### 🔒 Administración (admin)
| Key | Nombre | Min Role |
|-----|--------|----------|
| admin.users | Gestionar usuarios | admin |
| admin.users_view | Ver usuarios | coordinador |
| admin.roles | Asignar roles | admin |
| admin.permissions | Gestionar permisos | admin |
| admin.branches | Gestionar sucursales | admin |
| admin.branches_view | Ver sucursales | coordinador |
| admin.create_branch_users | Crear usuarios de sucursal | franquiciado |
| admin.global_products | Productos globales | admin |
| admin.global_modifiers | Modificadores globales | admin |
| admin.global_categories | Categorías globales | admin |
| admin.system_settings | Config del sistema | admin |

---

## Permisos Default por Rol

### Empleado
```typescript
[
  'orders.view', 'orders.manage',
  'pos.sell', 'pos.open_drawer', 'pos.reprint',
  'cash.view_shift',
  'products.view', 'products.availability',
  'inventory.view', 'inventory.receiving',
  'hr.schedules_view'
]
```

### Gerente
```typescript
[
  // Todos los de empleado, más:
  'orders.cancel', 'orders.refund', 'orders.history',
  'pos.discounts', 'pos.void_items',
  'cash.open_close', 'cash.movements', 'cash.adjustments', 'cash.reports',
  'products.prices', 'products.create',
  'inventory.adjust', 'inventory.orders', 'inventory.counts',
  'hr.employees_view', 'hr.employees_manage', 'hr.schedules_manage',
  'hr.attendance_view', 'hr.attendance_manage', 'hr.warnings',
  'reports.sales', 'reports.products', 'reports.employees', 'reports.export',
  'finance.transactions', 'finance.suppliers',
  'settings.branch_info', 'settings.schedules', 'settings.delivery_zones',
  'settings.printers', 'settings.payment_methods'
]
```

### Coordinador
```typescript
[
  // Todos los de gerente, más acceso a Panel Marca:
  'admin.users_view', 'admin.branches_view',
  // EXCEPTO: finance.*, hr.employees_private, hr.payroll_*, reports.financial
]
```

### Socio (Solo Lectura)
```typescript
[
  // Solo permisos de visualización:
  'reports.sales', 'reports.products', 'reports.financial',
  'finance.view', 'finance.pl_report',
  'orders.view', 'orders.history',
  'products.view', 'inventory.view',
  'hr.employees_view', 'hr.schedules_view', 'hr.attendance_view'
]
```

### Franquiciado
```typescript
[
  // Todos los de gerente, más:
  'hr.employees_private', 'hr.payroll_view', 'hr.payroll_manage', 'hr.documents',
  'reports.financial',
  'finance.view', 'finance.payments', 'finance.pl_report',
  'settings.integrations',
  'admin.create_branch_users'  // Puede crear usuarios para su sucursal
]
```

### Admin
Acceso total a todos los permisos (bypass en función `has_branch_permission`).

---

## Usuarios de App vs Personal Operativo

| Aspecto | Usuarios de App | Personal Operativo |
|---------|-----------------|-------------------|
| Tabla | profiles + user_roles | employees |
| Autenticación | Supabase Auth (email/pass) | PIN de 4 dígitos |
| Alcance | Multi-sucursal posible | Una sucursal fija |
| Permisos | Granulares por sucursal | No aplica sistema de permisos |
| Acceso | Panel Marca/Mi Local | Solo kiosko de fichaje |

---

## Protección de Datos Sensibles

### Datos restringidos (requieren `hr.employees_private`)
- DNI
- CUIT
- CBU
- Dirección personal
- Fecha de nacimiento
- Contacto de emergencia
- Tarifa por hora

### Implementación
```typescript
// Hook useCanViewPrivateData
const canView = useCanViewPrivateData(branchId);

// Componente RestrictedField
<RestrictedField value={employee.dni} canView={canView} />
```

---

## Flujo de Verificación

```
Usuario intenta acción
       ↓
¿Es admin? → SÍ → Permitir
       ↓ NO
¿Es socio? → SÍ → ¿Es permiso de lectura? → SÍ → Permitir
       ↓ NO                                  ↓ NO
       ↓                                   Denegar
¿Tiene permission_key en user_branch_permissions? → SÍ → Permitir
       ↓ NO
¿Tiene permiso legacy en branch_permissions? → SÍ → Permitir
       ↓ NO
Denegar
```

---

## Hook usePermission

```typescript
import { usePermission } from '@/hooks/usePermission';

// Verificar un permiso
const { hasPermission, isLoading } = usePermission('orders.manage', branchId);

// Verificar múltiples permisos
const { permissions } = usePermissions(['orders.view', 'orders.manage'], branchId);
```

---

## Panel de Administración de Permisos

**Ruta:** `/admin/permisos`

**Funcionalidades:**
- Selector de usuario con búsqueda
- Selector de sucursal
- Vista de permisos agrupados por módulo
- Toggle individual por permiso
- Toggle de módulo completo
- Botón "Aplicar defaults del rol"
- Contador de permisos activos
- Guardado con confirmación
- Auditoría automática de cambios

---

## Consideraciones de Seguridad

1. **Anti-escalación:** Solo admins pueden modificar permisos
2. **Auditoría:** Tabla `permission_audit_logs` registra todos los cambios
3. **RLS activo:** Todas las tablas tienen políticas de seguridad
4. **Scope por sucursal:** Los permisos solo aplican en la sucursal asignada
5. **Fallback seguro:** Default a `false` cuando no hay permiso explícito
6. **Socio read-only:** El rol socio tiene bypass solo para permisos de lectura

---

## Compatibilidad hacia Atrás

El sistema mantiene compatibilidad con la tabla legacy `branch_permissions`:
- La función `has_branch_permission` primero busca en el nuevo sistema
- Si no encuentra, consulta las columnas booleanas antiguas
- Permite migración gradual sin romper funcionalidad existente

---

## Ejemplo de Uso en Código

```typescript
// Usando el hook usePermission
import { usePermission } from '@/hooks/usePermission';

function OrderActions({ branchId }) {
  const { hasPermission: canCancel } = usePermission('orders.cancel', branchId);
  const { hasPermission: canRefund } = usePermission('orders.refund', branchId);

  return (
    <div>
      {canCancel && <Button>Cancelar Pedido</Button>}
      {canRefund && <Button>Reembolsar</Button>}
    </div>
  );
}
```

```typescript
// Verificación directa con Supabase
const { data: canManageOrders } = await supabase.rpc('has_branch_permission', {
  _branch_id: branchId,
  _permission: 'orders.manage',
  _user_id: userId
});
```

---

*Última actualización: Enero 2026*
