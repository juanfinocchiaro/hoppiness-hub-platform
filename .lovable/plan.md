

## Estado: NADA del plan se ha ejecutado aún

El plan completo de 4 fases está pendiente. Ningún archivo del frontend ha sido migrado — `user_role_assignments` solo existe en el `types.ts` autogenerado pero **ningún service, hook ni edge function lo usa todavía**.

### Lo que falta (todo):

**Fase 1 — SQL Migration**
- Agregar `clock_pin` y `default_position` a `user_role_assignments`
- Migrar datos desde `user_branch_roles`
- Reescribir funciones de PIN (`validate_clock_pin_v2`, `is_clock_pin_available`)
- Reescribir `get_user_branches` RPC
- Actualizar helpers RLS que referencien tablas legacy
- DROP `user_branch_roles`, `user_roles_v2`, ENUMs `brand_role_type`, `local_role_type`

**Fase 2 — 8 Service files** (todos siguen usando tablas legacy)
| Archivo | Refs legacy |
|---------|-------------|
| `adminService.ts` | ~20 funciones con `user_roles_v2` y `user_branch_roles` |
| `staffService.ts` | 8 funciones + `syncLegacyRole` (a eliminar) |
| `permissionsService.ts` | 4 funciones con `user_roles_v2` |
| `profileService.ts` | 4 funciones con `user_branch_roles` |
| `posService.ts` | 2 funciones con `user_roles_v2` |
| `meetingsService.ts` | 2 funciones con `user_branch_roles` |
| `warningsService.ts` | 2 funciones con `user_branch_roles` |
| `inspectionsService.ts` | 1 función con `user_branch_roles` |

**Fase 3 — Components/Hooks** (5 archivos)
- `useUsersData.ts` — usa `fetchAllBrandRoles`/`fetchAllBranchRoles` legacy
- `types.ts` — comentarios referenciando `user_roles_v2`
- `RegistroStaff.tsx` — llama a `syncLegacyRole`
- `PinManagementModal.tsx` — depende de signatures de profileService

**Fase 4 — Edge Functions** (2 archivos)
- `send-staff-invitation/index.ts` — escribe en `user_branch_roles`
- `mp-point-payment/index.ts` — comentario legacy

### Recomendación

Dado el volumen (~20 archivos, ~40 funciones), sugiero ejecutar por fases empezando por la **Fase 1 (SQL)** que es prerequisito de todo lo demás. Una vez aplicada la migración SQL, se pueden ejecutar las fases 2-4 del frontend en paralelo.

¿Confirmo para arrancar con la Fase 1 (migración SQL)?

