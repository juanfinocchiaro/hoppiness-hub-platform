# Plan: Limpieza Legacy Completada ✅

## Resumen

Limpieza profunda del sistema ejecutada exitosamente.

---

## Cambios Realizados

### 1. Base de Datos (Migración)
- ✅ Agregada columna `role` y `full_name` a `staff_invitations`
- ✅ Eliminadas 13 funciones SQL legacy:
  - `assign_admin_to_owner`
  - `can_use_brand_panel`
  - `can_use_local_panel`
  - `capture_product_snapshot`
  - `get_allowed_suppliers_for_ingredient`
  - `has_brand_access`
  - `setup_new_branch`
  - `update_brand_mandatory_products_updated_at`
  - `update_daily_sales_updated_at`
  - `update_ingredient_cost_timestamp`
  - `update_nucleo_product_mappings_updated_at`
  - `update_transactions_updated_at`
  - `validate_supplier_for_ingredient`

### 2. Código Frontend
- ✅ `src/App.tsx`: Eliminados imports y rutas de `AceptarInvitacion` y `PrintersPage`
- ✅ `src/pages/RegistroStaff.tsx`: Actualizado para usar `staff_invitations` con columna `role`

### 3. Edge Function
- ✅ `supabase/functions/send-staff-invitation/index.ts`: Reescrita para usar:
  - Tabla `staff_invitations` (no `user_invitations`)
  - Funciones V2: `is_superadmin()`, `is_hr_role()`
  - URL de registro: `/registro-staff?token=...`

### 4. Imágenes Eliminadas (63+ archivos)
- ✅ `public/images/products/` - 45 archivos (hamburguesas, bebidas, salsas)
- ✅ `public/images/products/pos/` - 18 archivos
- ✅ `public/images/modifiers/` - 18 archivos (ingredientes)

---

## Funciones SQL que se MANTIENEN

| Función | Uso |
|---------|-----|
| `is_superadmin` | Verifica brand_role = 'superadmin' |
| `can_access_branch` | Verifica acceso a sucursal |
| `is_hr_role` | Verifica franquiciado/encargado |
| `is_staff` | Verifica usuario con rol activo |
| `is_hr_for_branch` | Permisos HR por sucursal |
| `is_financial_for_branch` | Permisos finanzas por sucursal |
| `is_cashier_for_branch` | Permisos cajero por sucursal |
| `is_hr_manager` | Permisos HR global |
| `is_financial_manager` | Permisos finanzas global |
| `is_staff_member` | Verifica cualquier rol activo |
| `get_brand_role` | Obtiene brand_role del usuario |
| `get_local_role` | Obtiene local_role del usuario |
| `has_branch_access_v2` | Verifica acceso V2 |
| `has_financial_access` | Verifica acceso financiero |
| `has_hr_access` | Verifica acceso HR |
| `user_has_branch_access` | Verifica acceso sucursal |
| `validate_clock_pin` | Valida PIN de fichaje |
| `verify_authorization_pin` | Valida PIN de autorización |
| `update_user_roles_v2_updated_at` | Trigger updated_at |
| `update_branch_shifts_updated_at` | Trigger updated_at |
| `update_shift_closures_updated_at` | Trigger updated_at |
| `update_communications_updated_at` | Trigger updated_at |
| `update_updated_at_column` | Trigger genérico |
| `handle_new_user` | Crea profile en registro |

---

## Verificación

- [x] Build sin errores
- [x] Imágenes legacy eliminadas
- [x] Funciones SQL legacy eliminadas
- [x] Edge function actualizada
- [ ] Test: Enviar invitación
- [ ] Test: Registro de staff
- [ ] Test: Fichaje
- [ ] Test: Panel Mi Local
- [ ] Test: Panel Mi Marca
