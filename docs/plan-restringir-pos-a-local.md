# Restringir ventas POS y acceso al Local por rol

## Reglas por rol (definición)

| Rol | Acceso al panel Local | POS (vender / abrir caja) |
|-----|----------------------|---------------------------|
| **Franquiciado** | Sí, sin fichaje | Sí, sin fichaje (puede abrir caja y vender sin fichar). |
| **Encargado** | Sí, sin fichaje | Solo con fichaje: para usar POS debe estar fichado; el resto del Local lo ve sin fichar. |
| **Cajero** | Solo con fichaje | Solo con fichaje; si no está fichado → cartel "Debés fichar para acceder". |
| **Contador (local)** | Sí, sin fichaje | Igual que franquiciado para lo que ya puede acceder. |
| **Empleados (resto)** | No acceden a Local | No tienen acceso al panel Local; solo "Mi Trabajo" (fichaje, etc.). |

Resumen:
- **Franquiciado y Contador**: Acceso sin fichaje a todo lo que ya tienen permitido (incluido POS si aplica).
- **Encargado**: Acceso sin fichaje a todo menos POS; para POS exige fichaje.
- **Cajero**: Solo accede al Local si está fichado; si no está fichado → pantalla que indica que debe fichar.
- **Empleados (operativo, kds, etc.)**: No acceden al panel Local; solo a su trabajo (fichaje / flujo de trabajo).

---

## 1. Acceso al panel Local (ruta /milocal)

### Backend (RLS)

No cambia por rol el RLS del panel en sí; el panel solo muestra lo que el usuario puede ver según permisos. La restricción “cajero solo con fichaje” y “empleados no entran a Local” se resuelven en **frontend + comprobación de estado**.

### Frontend

- **Empleados (roles que no son franquiciado, encargado, contador, cajero)**  
  En [BranchLayout](src/pages/local/BranchLayout.tsx) (o en el router/guards que deciden quién puede ver `/milocal`): si el usuario tiene solo rol operativo/kds/empleado y no tiene rol que dé acceso al Local, **no mostrar** la opción "Mi Local" o redirigir a cuenta / Mi Trabajo. Así no acceden al panel Local; solo a su trabajo (fichaje, etc.).

- **Cajero**  
  Al entrar a `/milocal` (o al seleccionar sucursal): si el usuario es cajero y **no** está fichado en ningún branch al que tiene acceso (o no está fichado en el branch elegido), mostrar **pantalla completa**: “Debés fichar para acceder al Panel Local” con indicación de cómo fichar (ej. link o QR al flujo de fichaje). No mostrar el resto del panel hasta que tenga un fichaje activo.

- **Encargado, Franquiciado, Contador**  
  Acceso normal al panel Local sin comprobar fichaje.

Implementación sugerida: en `BranchLayout` o en un guard que envuelva las rutas de `/milocal`, usar `usePermissionsWithImpersonation` o el hook de roles y una query para “¿está fichado en este branch?” (o en alguno de sus branches). Si es cajero y no está fichado → pantalla “Debés fichar”. Si es empleado sin rol de Local → redirigir a cuenta / Mi Trabajo.

---

## 2. POS: abrir turno y vender (pedidos / pagos)

### Backend (RLS)

- **Abrir turno** (`cash_register_shifts` INSERT):  
  Permitir si tiene acceso al branch **y**  
  - es **superadmin**, **franquiciado** o **contador_local** en ese branch → sin exigir fichaje, **o**  
  - es **encargado** o **cajero** en ese branch **y** `is_clocked_in_at_branch(auth.uid(), branch_id)`.

- **Crear pedidos / registrar pagos** (`pedidos` INSERT, `pedido_pagos` INSERT):  
  Permitir si tiene acceso al branch **y**  
  - es **superadmin**, **franquiciado** o **contador_local** en ese branch → sin exigir turno abierto (opcional: igualmente exigir turno abierto para trazabilidad), **o**  
  - `has_open_shift_at_branch(auth.uid(), branch_id)`.

Para “franquiciado o contador en ese branch” se puede usar la vista/función existente de roles por branch (p. ej. `user_roles_v2` o `get_local_role_for_branch`). Si no existe, añadir en la migración una función tipo `is_franquiciado_or_contador_for_branch(user_id, branch_id)` que consulte los roles del usuario en ese branch.

---

## 3. Funciones SQL (migración)

- `has_open_shift_at_branch(p_user_id uuid, p_branch_id uuid) returns boolean`  
  True si existe `cash_register_shifts` con `opened_by = p_user_id`, `branch_id = p_branch_id`, `status = 'open'`.

- `is_clocked_in_at_branch(p_user_id uuid, p_branch_id uuid) returns boolean`  
  True si la última entrada en `clock_entries` para ese (user_id, branch_id) es `clock_in` (sin `clock_out` posterior).

- `is_franquiciado_or_contador_for_branch(p_user_id uuid, p_branch_id uuid) returns boolean`  
  True si el usuario tiene rol `franquiciado` o `contador_local` en ese branch (consultar `user_roles_v2` o la tabla de roles por branch que use el proyecto).

- (Opcional) `is_encargado_or_cajero_for_branch` para simplificar la condición de “necesitan fichaje para abrir turno”.

---

## 4. Edge Function de fichaje (opcional)

En `register-clock-entry`: si `entry_type === 'clock_in'` y el request trae `gps_lat`/`gps_lng` y el branch tiene coordenadas, rechazar clock_in si la distancia al local supera un radio (ej. 200 m), para reforzar que el fichaje sea en el local.

---

## 5. Resumen de archivos

| Ámbito | Archivos |
|--------|----------|
| SQL | Nueva migración: funciones anteriores + políticas RLS para `pedidos`, `pedido_pagos`, `cash_register_shifts` según las reglas por rol. |
| Frontend | `BranchLayout` o guard de rutas `/milocal`: lógica “empleados no entran a Local” y “cajero solo si está fichado”; pantalla “Debés fichar” para cajero sin fichaje. |
| Edge Function | `register-clock-entry`: validación opcional de distancia GPS en clock_in. |

Con esto queda alineado a: Franquiciado/Contador sin fichaje; Encargado sin fichaje para todo menos POS; Cajero solo con fichaje y cartel si no fichó; Empleados sin acceso al Local, solo a su trabajo.
