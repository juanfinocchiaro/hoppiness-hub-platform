# Tablas sin UI Completa

Documentación de tablas en la base de datos que no tienen interfaz de gestión completa o son solo para uso interno.

**Última actualización:** 2026-01-27

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
| `attendance_logs` | Logs de fichaje (nuevo sistema) | Usado por dashboard Mi Cuenta |
| `cash_register_movements` | Movimientos de caja | Visible en LocalCaja, no editable |
| `stock_movements` | Historial de movimientos de stock | Solo lectura |

## Legacy / Deprecado ⚠️

| Tabla | Descripción | Estado | Acción Requerida |
|-------|-------------|--------|------------------|
| `user_roles` | Sistema de permisos legacy | **DEPRECADO** - usar `user_roles_v2` | Migrar archivos que aún lo usan |
| `branch_permissions` | Sistema de permisos legacy (booleanos) | **DEPRECADO** - usar `user_branch_permissions` | Eliminar después de migración |
| `attendance_records` | Registros de asistencia legacy | **DEPRECADO** - usar `clock_entries` | Migrar código restante |
| `user_panel_access` | Acceso a paneles legacy | **DEPRECADO** - usar `user_roles_v2.brand_role/local_role` | Sin uso actual |
| `user_branch_access` | Acceso a sucursales legacy | **DEPRECADO** - usar `user_roles_v2.branch_ids` | Sin uso actual |
| `customers` | Clientes separados (antes de unificación) | **SEMI-DEPRECADO** | Mantener por POS/CustomerSelector |

## Archivos que usan tablas LEGACY (pendiente migración)

| Archivo | Tabla Legacy | Prioridad |
|---------|--------------|-----------|
| `src/pages/local/LocalUsuarios.tsx` | `user_roles` | Alta |
| `src/components/local/UserDetailSheet.tsx` | `user_roles` | Alta |
| `src/pages/RegistroStaff.tsx` | `user_roles` | Alta |
| `src/pages/AceptarInvitacion.tsx` | `user_roles` | Alta |
| `src/components/admin/BranchEditPanel.tsx` | `user_roles` | Media |
| `src/components/admin/UserCard.tsx` | `user_roles` | Media |
| `supabase/functions/attendance-token/index.ts` | `attendance_records` | Media |
| `supabase/functions/auto-close-shifts/index.ts` | `attendance_records` | Baja |

## Hooks Eliminados (2026-01-27)

| Hook | Motivo |
|------|--------|
| `src/hooks/useUserRoles.ts` | Reemplazado por `usePermissionsV2` |
| `src/hooks/usePanelAccess.ts` | Reemplazado por `usePermissionsV2` |

## Tablas Eliminadas Históricamente

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

## Sistema de Roles Actual (V2)

### Roles de Marca (`brand_role`)
| Rol | Descripción | Acceso |
|-----|-------------|--------|
| `superadmin` | Dueño de la marca | Todo + todas las sucursales |
| `coordinador` | Marketing/gestión | Catálogo, comunicación |
| `informes` | Solo reportes | Dashboards solo lectura |
| `contador_marca` | Finanzas consolidadas | P&L, facturación |

### Roles Locales (`local_role`)
| Rol | Descripción | Requiere `branch_ids` |
|-----|-------------|----------------------|
| `franquiciado` | Dueño del local | ✅ |
| `encargado` | Gestión día a día | ✅ |
| `contador_local` | Finanzas del local | ✅ |
| `cajero` | Operación POS/Caja | ✅ |
| `empleado` | Solo Mi Cuenta | ✅ |

### Conteos Actuales (2026-01-27)
- `user_roles` (legacy): 2 registros
- `user_roles_v2` (activo): 13 registros

---

*Este documento se actualiza automáticamente durante las auditorías del sistema.*
