

## Plan: Eliminación completa del código legacy de roles

### Resumen

Migrar **todas** las queries del frontend de `user_branch_roles` y `user_roles_v2` a `user_role_assignments` + `roles`. Agregar `clock_pin` y `default_position` a `user_role_assignments`. Actualizar la edge function. Eliminar `syncLegacyRole`. Al final, DROP de las tablas y ENUMs legacy.

---

### Fase 1 — Migración SQL

Una sola migración que:

1. **Agrega columnas operativas** a `user_role_assignments`:
   - `clock_pin TEXT`
   - `default_position TEXT`
   - Migra datos desde `user_branch_roles` (matching por `user_id + branch_id`)

2. **Reescribe funciones de PIN** (`validate_clock_pin_v2`, `is_clock_pin_available`) para leer de `user_role_assignments` en vez de `user_branch_roles`

3. **Reescribe `get_user_branches`** RPC para leer de `user_role_assignments` + `roles`

4. **DROP tables y ENUMs legacy**:
   - `DROP TABLE user_branch_roles`
   - `DROP TABLE user_roles_v2`
   - `DROP TYPE brand_role_type`
   - `DROP TYPE local_role_type`

5. **Actualizar helpers RLS** que aún referencian las tablas eliminadas (revisión de `get_brand_role`, `get_local_role` para que ya no hagan cast a ENUM y retornen TEXT puro)

---

### Fase 2 — Frontend Services (13 archivos)

Cada archivo que hace `.from('user_branch_roles')` o `.from('user_roles_v2')` se migra a `.from('user_role_assignments')` con JOIN a `roles` cuando necesite filtrar por `key`.

| Archivo | Funciones a migrar |
|---------|-------------------|
| `src/services/permissionsService.ts` | `fetchUserBrandRole`, `fetchUserBranchRoles`, `fetchImpersonationData`, `checkIsSuperadmin` |
| `src/services/adminService.ts` | `fetchCentralTeamMembers`, `removeCentralTeamMember`, `inviteCentralTeamMember`, `fetchBranchTeam`, `updateBranchMemberRole`, `updateBranchMemberPosition`, `addBranchMember`, `removeBranchMember`, `fetchBranchManagers`, `fetchBranchStaffMembers`, `fetchBrandRoleUserIds`, `fetchBranchRoleUserIds`, `fetchOperationalStaffUserIds`, `fetchSuperadminUserIds`, `fetchBrandRolesForUsers`, `fetchBranchRolesForUsers`, `updateBrandRole`, `insertBrandRole`, `deactivateBranchRole`, `updateBranchRoleById`, `insertBranchRole`, `fetchAllBrandRoles`, `fetchAllBranchRoles`, `fetchRegulationSignatureStats` |
| `src/services/staffService.ts` | `findBranchRole`, `reactivateBranchMember`, `upsertBranchRole`, `syncLegacyRole` (ELIMINAR), `fetchBranchTeamData`, `updateBranchRole`, `deactivateBranchRole`, `fetchProfileClockPin` |
| `src/services/profileService.ts` | `fetchUserBranchRolesWithPins`, `updateBranchRoleClockPin`, `verifyBranchRoleClockPin`, `fetchBranchTeamRolesForRegulation` |
| `src/services/hrService.ts` | `fetchLaborUsersData`, `fetchBranchStaffForClock`, `fetchUserLocalRoles` |
| `src/services/coachingService.ts` | `fetchCoachingStats` (l.326), `fetchStaffRolesByBranches`, `fetchManagerRoles`, `fetchCoachingTeamMembers`, `fetchEmployeesWithCoachingCounts`, `fetchBranchManager` |
| `src/services/meetingsService.ts` | `fetchBranchTeamMembers`, `fetchNetworkMembers` |
| `src/services/communicationsService.ts` | `listUserCommunications` |
| `src/services/inspectionsService.ts` | `fetchInspectionStaffMembers` |
| `src/services/posService.ts` | `fetchUserRolesForVerification`, `fetchUserActiveRoles` |
| `src/services/warningsService.ts` | `fetchBranchTeamMembersBasic` |
| `src/services/managerDashboardService.ts` | `fetchPendingItems` (lee `user_roles_v2.branch_ids`) |

**Patrón de migración** para queries de branch roles:
```typescript
// ANTES:
.from('user_branch_roles').select('user_id, local_role').eq('branch_id', X).eq('is_active', true)

// DESPUÉS:
.from('user_role_assignments').select('user_id, role_id, roles!inner(key)').eq('branch_id', X).eq('is_active', true)
```

Para queries de brand roles:
```typescript
// ANTES:
.from('user_roles_v2').select('user_id, brand_role').eq('is_active', true)

// DESPUÉS:
.from('user_role_assignments').select('user_id, role_id, roles!inner(key, scope)').eq('is_active', true).eq('roles.scope', 'brand').is('branch_id', null)
```

---

### Fase 3 — Frontend: Hooks, Types, Components (5 archivos)

| Archivo | Cambio |
|---------|--------|
| `src/components/admin/users/useUsersData.ts` | Migrar `fetchAllBrandRoles`/`fetchAllBranchRoles` al nuevo modelo |
| `src/components/admin/users/types.ts` | Actualizar comentarios, eliminar `getHighestRoleLegacy` |
| `src/components/cuenta/PinManagementModal.tsx` | Ya usa service functions (solo actualizar si cambian signatures) |
| `src/pages/RegistroStaff.tsx` | Eliminar llamada a `syncLegacyRole`, mantener `upsertBranchRole` migrado |
| `src/pages/local/WarningsPage.tsx` | Solo actualizar comentario |

---

### Fase 4 — Edge Function

`supabase/functions/send-staff-invitation/index.ts`: Cambiar todas las queries de `user_branch_roles` a `user_role_assignments` + lookup de `role_id` desde `roles`.

---

### Resumen de impacto

- **1 migración SQL**: agregar columnas, migrar datos, reescribir 3+ funciones, DROP 2 tablas + 2 ENUMs
- **13 service files** actualizados
- **5 component/page files** actualizados  
- **1 edge function** actualizada
- **1 función eliminada** (`syncLegacyRole`)
- **0 cambios funcionales**

