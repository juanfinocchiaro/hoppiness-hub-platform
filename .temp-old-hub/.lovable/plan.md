
# Plan: Corrección Final de Errores + Limpieza Profunda

## Resumen

Se corregirán todos los errores de build actuales, se eliminará el contenido legacy de productos/modifiers, se corregirá el sistema de invitaciones y se eliminarán las funciones SQL que ya no se usan.

---

## Errores de Build Actuales

### 1. App.tsx - Imports inexistentes
```
src/App.tsx(19,31): Cannot find module './pages/AceptarInvitacion'
src/App.tsx(27,26): Cannot find module './pages/local/PrintersPage'
```

**Solución**: Eliminar imports y rutas de archivos eliminados.

### 2. RegistroStaff.tsx - Columna 'role' no existe
```
src/pages/RegistroStaff.tsx: column 'role' does not exist on 'staff_invitations'
```

**Problema**: La tabla `staff_invitations` NO tiene columna `role`, solo tiene:
- id, email, branch_id, invited_by, token, status, expires_at, accepted_at, accepted_by, created_at

**Solución**: 
- Agregar columna `role` a `staff_invitations` para guardar el rol asignado
- Actualizar edge function para escribir a `staff_invitations` (no user_invitations)
- Actualizar RegistroStaff.tsx para usar la estructura correcta

---

## Archivos a Eliminar

### 1. Imágenes de Productos (65+ archivos)
**Carpeta**: `public/images/products/`

Estos archivos son de un sistema POS que ya no existe. Contienen fotos de hamburguesas, bebidas, salsas - ninguna se referencia en el código actual.

**Archivos**:
- 7up-can.jpg, 7up.jpg, agua.jpg
- american-burger.jpg, argenta-burger.jpg, avocado-burger.jpg
- bacon-burger.jpg, baconator-burger.jpg, barbacoa-miel.jpg
- barbacoa-mostaza.jpg, barbacoa.png, carolina-burger.jpg
- cerveza-pinta.jpg, cheese-burger.jpg, cheese.png
- cheesenator-burger.jpg, chipotle.jpg, django-burger.jpg
- doble-royal.png, fried-onion-burger.jpg, h2oh-*.jpg
- ketchup.png, mayo-chimi.jpg, mirinda.jpg
- not-american-burger.jpg, not-chicken-burger.jpg
- papas-porcion.png, patagonia-*.png, pepsi-*.jpg
- royal-burger.jpg, salsa-*.jpg, seta-burger.jpg
- ultra-bacon.png, ultra-cheese.png, victoria-burger.jpg
- wesley-burger.jpg
- **Subcarpeta `pos/`**: 18 archivos adicionales

### 2. Imágenes de Modifiers (18 archivos)
**Carpeta**: `public/images/modifiers/`

Fotos de ingredientes para el sistema de modificadores del POS eliminado.

**Archivos**:
- avocado.jpg, bacon.jpg, cabbage.jpg, cheese.jpg
- chicken-patty.jpg, crispy-onion.jpg, egg.jpg
- lettuce.jpg, mozzarella-sticks.jpg, mushrooms.jpg
- onion-rings.jpg, patty.jpg, pickles.jpg
- provoleta.jpg, red-onion.jpg, smash-patty.jpg
- tomato.jpg, veggie-patty.jpg

---

## Funciones SQL a Eliminar

Funciones que existen pero ya no tienen propósito (tablas eliminadas):

| Función | Motivo de Eliminación |
|---------|----------------------|
| `assign_admin_to_owner` | Sistema legacy de roles |
| `can_use_brand_panel` | Reemplazada por brand_role en user_roles_v2 |
| `can_use_local_panel` | Reemplazada por local_role en user_roles_v2 |
| `capture_product_snapshot` | Tabla products eliminada |
| `get_allowed_suppliers_for_ingredient` | Tabla suppliers/ingredients eliminada |
| `has_brand_access` | Duplicada, usar brand_role |
| `setup_new_branch` | Insertaba en branch_products (eliminada) |
| `update_brand_mandatory_products_updated_at` | Tabla eliminada |
| `update_daily_sales_updated_at` | Tabla eliminada |
| `update_ingredient_cost_timestamp` | Tabla eliminada |
| `update_nucleo_product_mappings_updated_at` | Tabla eliminada |
| `update_transactions_updated_at` | Tabla eliminada |
| `validate_supplier_for_ingredient` | Tablas suppliers/ingredients eliminadas |

### Funciones que se MANTIENEN

| Función | Uso |
|---------|-----|
| `is_superadmin` | Permisos - verifica brand_role = 'superadmin' |
| `can_access_branch` | Permisos - verifica acceso a sucursal |
| `is_hr_role` | Permisos - verifica franquiciado/encargado |
| `is_staff` | Permisos - verifica usuario con rol activo |
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

## Edge Function: send-staff-invitation

### Problema Actual
Escribe a tabla `user_invitations` que ya no existe.

### Corrección
1. Cambiar para escribir a `staff_invitations`
2. Agregar columna `role` a `staff_invitations`
3. Eliminar llamadas a funciones RPC legacy (`has_branch_permission`, `is_admin`)
4. Usar las funciones actuales (`is_superadmin`, `is_hr_role`)

---

## Cambios por Archivo

### 1. `src/App.tsx`
- Eliminar import de `AceptarInvitacion`
- Eliminar import de `PrintersPage`
- Eliminar ruta `/invitacion/:token`
- Eliminar ruta `/milocal/:branchId/config/impresoras`

### 2. `src/pages/RegistroStaff.tsx`
- Leer de `staff_invitations` con estructura correcta (ahora incluirá `role`)
- Usar `branches:branch_id (name)` para join
- Mapear `role` a `local_role` para user_roles_v2

### 3. `supabase/functions/send-staff-invitation/index.ts`
- Cambiar de `user_invitations` a `staff_invitations`
- Actualizar validación de permisos usando `is_hr_role` o `is_superadmin`

### 4. Migración SQL
- Agregar columna `role TEXT NOT NULL DEFAULT 'empleado'` a `staff_invitations`
- DROP funciones SQL legacy

### 5. Eliminar carpetas
- `public/images/products/` (incluyendo subcarpeta `pos/`)
- `public/images/modifiers/`

---

## Orden de Ejecución

1. **Migración DB**: Agregar columna role + DROP funciones legacy
2. **Actualizar edge function**: send-staff-invitation
3. **Actualizar RegistroStaff.tsx**: Usar estructura correcta
4. **Actualizar App.tsx**: Eliminar imports/rutas inexistentes
5. **Eliminar imágenes**: products/ y modifiers/

---

## Verificación Post-Implementación

- [ ] Build sin errores
- [ ] Enviar invitación funciona
- [ ] Registro de staff funciona
- [ ] Fichaje funciona
- [ ] Panel Mi Local carga
- [ ] Panel Mi Marca carga
