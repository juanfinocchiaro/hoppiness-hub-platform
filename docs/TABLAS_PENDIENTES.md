# Tablas sin UI Completa

Documentación de tablas en la base de datos que no tienen interfaz de gestión completa o son solo para uso interno.

## Sin UI de gestión

| Tabla | Descripción | Estado |
|-------|-------------|--------|
| `tables` | Gestión de mesas para servicio en salón | Futuro - sin UI |
| `product_branch_exclusions` | Exclusiones de producto por sucursal | Manejado por código |
| `kds_stations` | Estaciones de cocina/KDS | UI limitada en LocalKDSSettings |
| `availability_schedules` | Horarios de disponibilidad de productos | Parcialmente implementado |

## Solo logging (no requieren UI)

| Tabla | Descripción | Notas |
|-------|-------------|-------|
| `availability_logs` | Log de cambios de disponibilidad de productos | Solo lectura para auditoría |
| `attendance_logs` | Logs de fichaje legacy | Ver `attendance_records` |
| `cash_register_movements` | Movimientos de caja | Visible en LocalCaja, no editable |
| `stock_movements` | Historial de movimientos de stock | Solo lectura |

## Legacy / A revisar

| Tabla | Descripción | Acción sugerida |
|-------|-------------|-----------------|
| `branch_permissions` | Sistema de permisos legacy (booleanos) | Migrar a `user_branch_permissions` |
| `attendance_logs` vs `attendance_records` | 2 sistemas de asistencia coexisten | Consolidar en uno solo |
| `product_branch_exclusions` vs `branch_products` | Posible redundancia | Revisar si se puede unificar |

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
