# Arquitectura de Permisos - Hoppiness Club

## Modelo Híbrido de 3 Capas

El sistema de permisos utiliza un modelo híbrido que combina roles globales con permisos granulares por sucursal.

### Capas del Sistema

1. **Rol Global** → Define capacidades base del usuario en toda la plataforma
2. **Identidad de Usuario** → `user_id` de Supabase Auth vincula todas las tablas
3. **Permisos Granulares** → Override específico por sucursal usando permission keys

---

## Tablas de Base de Datos

### `user_roles`
Almacena el rol global de cada usuario.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | uuid | PK |
| user_id | uuid | FK a auth.users |
| role | app_role | admin, gerente, empleado, franquiciado |
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
Catálogo de 52 permission keys disponibles.

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
2. Busca en `user_branch_permissions` el key exacto
3. Fallback a columnas booleanas en `branch_permissions`
4. Default → `false`

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
admin (nivel 4)
  └── gerente (nivel 3)
       └── franquiciado (nivel 2)
            └── empleado (nivel 1)
```

**Regla de herencia:** Un rol superior puede hacer todo lo que hace uno inferior.

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
| admin.roles | Asignar roles | admin |
| admin.permissions | Gestionar permisos | admin |
| admin.branches | Gestionar sucursales | admin |
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

### Franquiciado
```typescript
[
  // Todos los de gerente, más:
  'hr.employees_private', 'hr.payroll_view', 'hr.payroll_manage', 'hr.documents',
  'reports.financial',
  'finance.view', 'finance.payments', 'finance.pl_report',
  'settings.integrations'
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
| Acceso | Panel admin/local | Solo kiosko de fichaje |

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
¿Tiene permission_key en user_branch_permissions? → SÍ → Permitir
       ↓ NO
¿Tiene permiso legacy en branch_permissions? → SÍ → Permitir
       ↓ NO
Denegar
```

---

## Panel de Administración

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

---

## Consideraciones de Seguridad

1. **Anti-escalación:** Solo admins pueden modificar permisos
2. **Auditoría:** Campo `granted_by` registra quién otorgó cada permiso
3. **RLS activo:** Todas las tablas tienen políticas de seguridad
4. **Scope por sucursal:** Los permisos solo aplican en la sucursal asignada
5. **Fallback seguro:** Default a `false` cuando no hay permiso explícito

---

## Compatibilidad hacia Atrás

El sistema mantiene compatibilidad con la tabla legacy `branch_permissions`:
- La función `has_branch_permission` primero busca en el nuevo sistema
- Si no encuentra, consulta las columnas booleanas antiguas
- Permite migración gradual sin romper funcionalidad existente

---

## Ejemplo de Uso en Código

```typescript
// Verificar permiso antes de mostrar botón
const { data: canManageOrders } = useQuery({
  queryKey: ['permission', 'orders.manage', branchId],
  queryFn: async () => {
    const { data } = await supabase.rpc('has_branch_permission', {
      _branch_id: branchId,
      _permission: 'orders.manage',
      _user_id: userId
    });
    return data;
  }
});

// En el componente
{canManageOrders && <Button>Gestionar Pedido</Button>}
```

---

*Última actualización: Enero 2026*
