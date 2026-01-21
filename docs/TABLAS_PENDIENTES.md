# Tablas sin UI Completa

Documentación de tablas en la base de datos que no tienen interfaz de gestión completa o son solo para uso interno.

## Sin UI de gestión

| Tabla | Descripción | Estado |
|-------|-------------|--------|
| `product_branch_exclusions` | Exclusiones de producto por sucursal | Manejado por código |
| `kds_stations` | Estaciones de cocina/KDS | UI limitada en LocalKDSSettings |
| `availability_schedules` | Horarios de disponibilidad de productos | Parcialmente implementado |

## Solo logging (no requieren UI)

| Tabla | Descripción | Notas |
|-------|-------------|-------|
| `availability_logs` | Log de cambios de disponibilidad de productos | Solo lectura para auditoría |
| `attendance_logs` | Logs de fichaje (tabla principal) | Consolidado desde attendance_records |
| `cash_register_movements` | Movimientos de caja | Visible en LocalCaja, no editable |
| `stock_movements` | Historial de movimientos de stock | Solo lectura |

## Legacy / Deprecado

| Tabla | Descripción | Estado |
|-------|-------------|--------|
| `branch_permissions` | Sistema de permisos legacy (booleanos) | **DEPRECADO** - usar `user_branch_permissions` |
| `attendance_records` | Registros de asistencia legacy | **DEPRECADO** - usar `attendance_logs` |

## Tablas Eliminadas

| Tabla | Motivo | Fecha |
|-------|--------|-------|
| `tables` | Gestión de mesas no usada en ningún local | 2026-01-21 |

## Campos Eliminados de `branches`

| Campo | Motivo | Fecha |
|-------|--------|-------|
| `allowed_ips` | Sin uso en código | 2026-01-21 |
| `local_channels` | Sin uso en código | 2026-01-21 |
| `status_message` | Sin uso en código | 2026-01-21 |

## Tablas intermedias/pivote (correctamente sin UI directa)

- `branch_products` - Relación branch↔product
- `branch_channels` - Relación branch↔channel  
- `branch_ingredients` - Stock por sucursal
- `branch_modifier_options` - Modificadores por sucursal
- `order_items` - Items de pedido (se gestiona vía orders)
- `product_ingredients` - Receta de productos
- `modifier_group_products` - Relación grupos↔productos

## Notas sobre hooks duplicados

### useUserRole.tsx vs useUserRoles.ts

| Hook | Propósito | Uso principal |
|------|-----------|---------------|
| `useUserRole.tsx` | Rol + permisos de sucursal + branches accesibles | Navegación, guards, LocalLayout |
| `useUserRoles.ts` | Roles detallados + panel access flags | Guards de panel (canUseLocalPanel, canUseBrandPanel) |

**Decisión**: Mantener ambos ya que tienen responsabilidades diferentes:
- `useUserRole` → permisos granulares por sucursal
- `useUserRoles` → acceso a paneles y flags globales

### useChannels.ts vs useBranchChannels.ts

| Hook | Propósito | Uso |
|------|-----------|-----|
| `useChannels.ts` | CRUD de canales a nivel marca | Panel Admin |
| `useBranchChannels.ts` | Canales habilitados por sucursal | Panel Local |

**Decisión**: Correctamente separados. No consolidar.

---

*Última actualización: 2026-01-21*
