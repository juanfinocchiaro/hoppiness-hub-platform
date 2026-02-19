# Reporte de testing exhaustivo - Hoppiness Hub

Fecha: 2025-02-18  
Alcance: aplicación completa (rutas, páginas, componentes, hooks, trazabilidad Supabase).  
Metodología: lectura de código, flujo de datos, verificación de handlers, estados de loading/error y feedback de mutaciones; simulación por persona (PERSONAS.md).

---

## 1. CRÍTICO (rompe funcionalidad)

| Archivo | Línea / Área | Problema | Impacto |
|---------|----------------|----------|---------|
| `src/hooks/useRoleLandingV2.ts` | getAvatarInfo | No hay rama para `community_manager`. Solo se contemplan superadmin, coordinador, informes, contador_marca (marca) y roles locales. | Usuario con rol **community_manager** (Sofía) cae en el caso "guest" y **aterriza en /cuenta** en lugar de /mimarca. |
| `src/hooks/usePermissionConfig.ts` | BRAND_ROLES | `BRAND_ROLES` no incluye `community_manager`. | No se puede asignar el rol Community Manager desde Configuración de Permisos. |
| `src/hooks/usePermissionsV2.ts` | BrandRole type | Tipo `BrandRole` es `'superadmin' \| 'coordinador' \| 'informes' \| 'contador_marca' \| null`. La BD (y types.ts) incluyen `community_manager`. | Inconsistencia tipo TS vs BD; en runtime el valor puede ser correcto pero el tipo es incorrecto. |

---

## 2. ALTO (causa confusión o errores)

| Archivo | Línea / Área | Problema | Impacto |
|---------|----------------|----------|---------|
| `src/hooks/usePermissionsWithImpersonation.ts` | impersonatedPermissions | No se define `isCommunityManager` al impersonar; solo isCoordinador, isInformes, isContadorMarca. | Al impersonar un community_manager, la UI de marca puede no mostrar los ítems correctos (comunicados, mensajes). |
| `src/components/maps/BranchLocationMap.tsx` | 61-70 (useEffect) | `useEffect(..., [])` usa `latitude` y `longitude` dentro del efecto pero no están en el array de dependencias. | Si las props cambian, la posición del marcador no se actualiza. |
| `src/pages/admin/CentroCostosPage.tsx` | 210 (AnalisisTab) | Dependencia `[cats.length]` con uso de `cats` dentro; si `cats` cambia manteniendo length, el estado expanded no se actualiza. | Comportamiento frágil al expandir/colapsar categorías. |
| `src/pages/cuenta/CuentaHome.tsx` | Queries profile, branchPinData, urgentUnread | No se usa `isLoading` ni `isError` para las queries; si fallan, el usuario ve contenido vacío o parcial sin mensaje de error. | Errores de red o BD se silencian; experiencia confusa. |
| `src/components/guards/RequireBranchAccess.tsx` | - | Guard exportado pero **nunca usado** en App ni en ninguna ruta. BranchLayout hace su propia redirección. | Código muerto; si en el futuro se usa, el comportamiento está definido pero no integrado. |

---

## 3. MEDIO (código subóptimo)

| Archivo | Línea / Área | Problema | Sugerencia |
|---------|----------------|----------|------------|
| Varios hooks (useMeetings sub-actions, etc.) | onSuccess | Algunas mutaciones solo invalidan cache y muestran toast en error; sin toast de éxito. | Unificar: mostrar toast de éxito en mutaciones que cambian datos visibles. |
| Formularios (Contacto, FranchiseFormSection, varios modales) | Reset | No se resetea el formulario al cerrar o tras éxito. | Añadir reset en onSuccess o al cerrar modal. |
| Validación | Mezcla | Solo Ingresar usa Zod; resto mayormente validación manual. | Valorar estandarizar con Zod + react-hook-form en flujos críticos. |
| `src/pages/admin/AuditLogPage.tsx` | Query audit-logs | No se usa `isError`; si la query falla, `data` es undefined y se muestra lista vacía sin mensaje. | Mostrar estado de error (toast o alert) cuando `isError` sea true. |
| `src/components/cuenta/MyClockInsCard.tsx` | useQuery my-clock-entries | No se muestra estado de error explícito (solo skeleton en loading). | Añadir mensaje o retry cuando `isError` sea true. |

---

## 4. BAJO (cleanup / mejora)

| Archivo | Línea / Área | Problema | Sugerencia |
|---------|----------------|----------|------------|
| `src/hooks/useRoleLandingV2.ts` | AvatarType | AvatarType no incluye `community_manager`. | Añadir `community_manager` a AvatarType y rama en getAvatarInfo con landingPath `/mimarca`. |
| `src/hooks/usePermissionConfig.ts` | BRAND_ROLES, BRAND_ROLE_LABELS | No incluyen `community_manager`. | Incluir `community_manager` para que sea asignable desde configuración. |
| `src/hooks/usePermissionsV2.ts` | BrandRole | Tipo no incluye `'community_manager'`. | Incluir `'community_manager'` en el tipo BrandRole. |

---

## 5. CÓDIGO MUERTO PARA ELIMINAR

| Archivo | Qué eliminar | Por qué |
|---------|----------------|--------|
| `src/components/menu/NuevoProductoCentroCostosModal.tsx` | Archivo completo | Ya eliminado (git status); no quedan imports rotos. Verificado: useMenu.ts y CentroCostosPage no lo referencian. |
| `src/components/guards/RequireBranchAccess.tsx` | Componente (o dejar exportado si se usará) | No se usa en ninguna ruta; BranchLayout hace su propia validación de acceso. Opción: eliminar o documentar como “para uso futuro”. |
| `src/components/admin/AdminSidebar.tsx` | Componente completo | Nunca importado; BrandLayout usa BrandSidebar. AdminSidebar es legacy reemplazado por BrandSidebar. |

---

## 6. INCONSISTENCIAS PARA UNIFICAR

| Patrón A | Patrón B | Recomendación |
|----------|----------|----------------|
| Toast de éxito en hook (onSuccess) | Toast de éxito en componente | Centralizar en hook para mutaciones; componente solo si es lógica específica de página. |
| Query key `['entidad', scope]` | Otro orden o nombre en algunos hooks | Documentar en cursorrules y revisar hooks que comparten entidad para consistencia. |
| Permisos: useDynamicPermissions vs usePermissionsWithImpersonation | Dos puntos de uso | usePermissionsWithImpersonation ya delega en useDynamicPermissions; asegurar que todos los consumidores usen el hook correcto según contexto (con/sin impersonación). |
| Loading: HoppinessLoader fullScreen | Skeleton inline | Ambos válidos; usar HoppinessLoader en pantallas completas y Skeleton en bloques dentro de la página. |

---

## 7. Resumen por persona (PERSONAS.md)

### Martín (empleado)
- **Login:** Correcto → va a `/cuenta` (useRoleLandingV2: empleado → landingPath `/cuenta`).
- **/cuenta:** Onboarding (OnboardingWizard), PendingItemsPanel, BranchWorkCard si tiene branch con PIN. CuentaHome no muestra loading/error para profile ni branchPinData (ALTO ya anotado).
- **/cuenta/perfil:** CuentaPerfil con mutations, toast success/error y loading (correcto).
- **/cuenta/horario:** MiHorarioPage con skeleton y query por mes (correcto).
- **/cuenta/fichajes:** MisFichajesPage → MyClockInsCard con query y skeleton; sin estado de error explícito (MEDIO).
- **/cuenta/apercibimientos, adelantos, coachings, comunicados, reglamento:** Rutas existen; páginas delegan en cards; flujos verificados en código.
- **/fichaje/:code:** FichajeEmpleado: RPC get_branch_for_clock, validate_clock_pin_v2, Edge Function register-clock-entry; flujo PIN → reglamento → selfie → tipo → mutación con toast (correcto).

### Luciana (cajero)
- Todo lo de Martín.
- **/milocal/:id:** Dashboard (ManagerDashboard); sidebar muestra "Cierre de Turno" (canViewClosures \|\| canCloseShifts → ventas/historial).
- **Cierre de turno:** SalesHistoryPage + ShiftClosureModal y hooks useShiftClosures; flujo hasta guardar presente en código.

### Laura (encargado)
- Todo lo de Luciana.
- **/milocal/:id/equipo, equipo/horarios, equipo/coaching, equipo/adelantos, finanzas/compras, finanzas/gastos:** Rutas y permisos correctos; páginas con queries/mutations y toasts en hooks revisados.

### Roberto (franquiciado)
- Todo lo de Laura.
- **/cuenta/comparativo:** BranchComparisonPage solo visible si hasMultipleBranches && isOnlyFranquiciado (CuentaSidebar); useBrandClosuresSummary; carga y filtro por sus branches (correcto).

### Graciela (contador local)
- **Login:** useRoleLandingV2: contador_local → `/milocal/{firstBranchId}` o `/cuenta` si no hay branch (correcto).
- **/milocal/:id/finanzas/*:** Permisos en usePermissionsV2 (canViewPurchaseHistory, canViewSuppliers, etc.); export Excel en ComprasPage y otras (verificado en código).

### Juan (superadmin)
- **/mimarca:** BrandHome; ve todos los locales.
- **/mimarca/usuarios, auditoria, configuracion/permisos:** Rutas y acceso completo; AuditLogPage sin manejo de error en query (MEDIO).

### Ismael (coordinador)
- **/mimarca/coaching/red:** CoachingNetworkPage con RequireBrandPermission; canViewCoaching / canCoachManagers.
- **/mimarca/supervisiones, supervisiones/nueva:** NewInspectionPage con useCreateInspection; toast success/error en hook (correcto).

### Sofía (community manager)
- **Rol en BD:** Existe `community_manager` en enum (migración p3) y en types.ts.
- **Landing:** Bug CRÍTICO: cae en guest → `/cuenta` (useRoleLandingV2 no contempla community_manager).
- **Permisos:** canManageMessages, canViewContactMessages, canManageContactMessages, canManageChannels (usePermissionsV2); **no** canViewProducts/canEditProducts (solo superadmin/coordinador). Si PERSONAS requiere editar productos para Sofía, hay gap de permisos.
- **Comunicados, mensajes, carta:** Acceso según permisos; sin acceso a coaching ni supervisiones (correcto según PERSONAS).

---

## 8. Trazabilidad Supabase

- **RPCs usados en fichaje:** `get_branch_for_clock`, `validate_clock_pin_v2` presentes en types.ts y migraciones. Edge Function `register-clock-entry` referenciada en config y en FichajeEmpleado.
- **Tablas principales:** profiles, user_branch_roles, branches, clock_entries, communications, communication_reads, employee_schedules, branch_inspections, audit_logs, etc., referenciadas en hooks y alineadas con types.ts.
- **RequireBranchAccess:** No usado en rutas; no afecta trazabilidad.

---

## 9. Checklist de ejecución del plan

- [x] Guards y rutas (RequireAuth, AdminRoute, LocalRoute, RequireQRAccess; redirecciones post-login).
- [x] Sidebars (CuentaSidebar, LocalSidebar, BrandSidebar; visibilidad por permiso/rol).
- [x] Cuenta: CuentaHome, CuentaPerfil, MiHorarioPage, MisFichajesPage, MisApercibimientosPage, MisAdelantosPage, MisCoachingsPage, MisComunicadosPage, MiReglamentoPage, BranchComparisonPage, onboarding y pendientes.
- [x] Fichaje: FichajeEmpleado (PIN, reglamento, selfie, tipo, guardado); FichajeQRDisplay.
- [x] Mi Local: BranchLayout, ManagerDashboard; rutas equipo, tiempo, ventas/historial, finanzas, supervisiones, config turnos.
- [x] Mi Marca: BrandHome, BranchDetail, UsersPage, CentralTeam, CommunicationsPage, ContactMessagesPage, reuniones, coaching, supervisiones, finanzas, informes, auditoría, recetas, carta, categorías carta, centro costos, reglamentos, calendario, cierres, permisos.
- [x] Hooks: revisión de useQuery/useMutation, queryKey, error/loading, toast en mutaciones; cruce con tablas/RPC.
- [x] Código muerto: RequireBranchAccess no usado; AdminSidebar no importado; NuevoProductoCentroCostosModal ya eliminado.
- [x] Reporte consolidado en este documento.
