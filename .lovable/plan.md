
# Plan: Limpieza Profunda Final del Codebase

## El Problema

El codebase sigue pesando 62.9 MB después de 3 "limpiezas" porque estas fueron superficiales. No se verificó archivo por archivo si realmente se usa en el UI actual.

## Metodología Usada

Para cada elemento pregunté: **"¿Está renderizado en alguna ruta activa del App.tsx?"**

Si no → **ELIMINAR**

---

## Hallazgos: Archivos que NO se usan

### 1. Componentes Huérfanos (0 imports desde páginas activas)

| Archivo | Problema |
|---------|----------|
| `src/components/admin/BranchCreatePanel.tsx` | No se importa en ninguna ruta. `NewBranchModal` lo reemplazó. |
| `src/components/NavLink.tsx` | No se importa en ningún componente activo |
| `src/components/shared/DashboardSkeleton.tsx` | Solo se define, nunca se usa |
| `src/components/shared/EmptyState.tsx` | Solo se define, nunca se usa |
| `src/components/shared/MetricsGrid.tsx` | Solo se define, nunca se usa |
| `src/components/shared/PeriodFilter.tsx` | Solo se define, nunca se usa |
| `src/components/shared/PageHelp.tsx` | Solo se define, nunca se usa |
| `src/components/shared/index.ts` | Export barrel de componentes no usados |
| `src/components/ui/collapsible-card.tsx` | No se importa |
| `src/components/ui/page-loading-skeleton.tsx` | No se importa |
| `src/components/ui/restricted-field.tsx` | No se importa |
| `src/pages/local/BranchHome.tsx` | Wrapper innecesario, `ManagerDashboard` se usa directamente en `BranchLayout` |

### 2. Hooks Sin Uso (0 imports en componentes)

| Archivo | Problema |
|---------|----------|
| `src/hooks/useCanViewPrivateData.ts` | Nunca importado |
| `src/hooks/useExportToExcel.ts` | Nunca importado (la librería xlsx sigue instalada) |

### 3. Imágenes Sin Uso (0 imports)

| Archivo | Verificación |
|---------|-------------|
| `src/assets/burger-detail.jpg` | Sin matches |
| `src/assets/design-ambiente.jpg` | Sin matches |
| `src/assets/local-2.jpg` | Sin matches |
| `src/assets/local-exterior.jpg` | Sin matches |
| `src/assets/menu-photo.jpg` | Sin matches |
| `src/assets/logo-hoppiness-original.jpg` | Sin matches |
| `src/assets/logo-white-transparent.png` | Sin matches |
| `src/assets/logo-blue-transparent.png` | Sin matches |
| `src/assets/team-photo.jpg` | Sin matches |

### 4. Documentación Obsoleta

Estos archivos de `docs/` describen sistemas que ya no existen:

| Archivo | Contenido Obsoleto |
|---------|-------------------|
| `docs/FLUJO_PEDIDOS_UX.md` | 1065 líneas sobre un sistema de pedidos online que **nunca se implementó** |
| `docs/AUDIT_DUPLICACION_FUNCIONAL.md` | Referencia a 65+ pantallas/rutas que ya fueron eliminadas |
| `docs/AUDITORIA_PANELES_COMPLETA.md` | Auditoría de paneles POS/KDS eliminados |
| `docs/LEGACY_ELIMINATION_QUEUE.md` | Cola de eliminación - trabajo ya completado |
| `docs/TABLAS_PENDIENTES.md` | Lista tablas que ya se eliminaron |
| `docs/BACKLOG_PRIORIZADO.md` | Backlog de features de sistemas eliminados |
| `docs/INVENTARIO_RUTAS_PERMISOS.md` | Inventario de rutas legacy |

### 5. Archivos de Test Vacíos

| Archivo | Problema |
|---------|----------|
| `src/test/example.test.ts` | Test placeholder que no testea nada real |
| `src/test/setup.ts` | Setup sin tests reales |
| `playwright-fixture.ts` | Fixture de Playwright sin uso activo |
| `playwright.config.ts` | Config de Playwright sin tests |

### 6. Edge Function de Test

| Archivo | Problema |
|---------|----------|
| `supabase/functions/seed-test-users/index.ts` | Solo para desarrollo/testing, no producción |

### 7. Dependencias NPM Sin Uso

| Paquete | Problema |
|---------|----------|
| `xlsx` | Solo usado por `useExportToExcel.ts` que se elimina |
| `@playwright/test` | Sin tests de Playwright reales |
| `html2canvas` | Sin uso en código activo |
| `jspdf` | Sin uso en código activo |

---

## Resumen de Eliminaciones

### Archivos a Eliminar (27 archivos)

```text
Componentes (12):
- src/components/admin/BranchCreatePanel.tsx
- src/components/NavLink.tsx
- src/components/shared/DashboardSkeleton.tsx
- src/components/shared/EmptyState.tsx
- src/components/shared/MetricsGrid.tsx
- src/components/shared/PeriodFilter.tsx
- src/components/shared/PageHelp.tsx
- src/components/shared/index.ts
- src/components/ui/collapsible-card.tsx
- src/components/ui/page-loading-skeleton.tsx
- src/components/ui/restricted-field.tsx
- src/pages/local/BranchHome.tsx

Hooks (2):
- src/hooks/useCanViewPrivateData.ts
- src/hooks/useExportToExcel.ts

Imágenes (9):
- src/assets/burger-detail.jpg
- src/assets/design-ambiente.jpg
- src/assets/local-2.jpg
- src/assets/local-exterior.jpg
- src/assets/menu-photo.jpg
- src/assets/logo-hoppiness-original.jpg
- src/assets/logo-white-transparent.png
- src/assets/logo-blue-transparent.png
- src/assets/team-photo.jpg

Docs Obsoletos (7):
- docs/FLUJO_PEDIDOS_UX.md
- docs/AUDIT_DUPLICACION_FUNCIONAL.md
- docs/AUDITORIA_PANELES_COMPLETA.md
- docs/LEGACY_ELIMINATION_QUEUE.md
- docs/TABLAS_PENDIENTES.md
- docs/BACKLOG_PRIORIZADO.md
- docs/INVENTARIO_RUTAS_PERMISOS.md

Tests/Config sin uso (4):
- src/test/example.test.ts
- src/test/setup.ts
- playwright-fixture.ts
- playwright.config.ts

Edge Function de Test (1):
- supabase/functions/seed-test-users/
```

### Dependencias NPM a Remover

```json
{
  "xlsx": "eliminar",
  "@playwright/test": "eliminar",
  "html2canvas": "eliminar",
  "jspdf": "eliminar"
}
```

---

## Lo que se MANTIENE (ya verificado como activo)

### Páginas Activas (App.tsx confirma)
- Index, Ingresar, Franquicias, Nosotros, Contacto
- FichajeEmpleado, RegistroStaff, Pedir
- CuentaDashboard, CuentaPerfil
- BranchLayout, TeamPage, ClockInsPage, SchedulesPage
- AdvancesPage, WarningsPage, RegulationsPage
- ShiftConfigPage, LocalCommunicationsPage
- BrandLayout, BrandHome, BranchDetail
- UsersPage, CentralTeam, CommunicationsPage
- BrandRegulationsPage, ClosureConfigPage

### Edge Functions Activas
- `contact-notification` - Usado por formularios de contacto
- `send-staff-invitation` - Usado por InviteStaffDialog
- `google-maps-key` - Usado por BranchLocationMap
- `send-schedule-notification` - Usado por useSchedules

### Imágenes Activas
- hero-burger.jpg, juan-hoppiness.jpg, apertura-local.jpg
- team-1 a team-6.jpg, local-1.jpg
- burger-cheese-drip.png, burger-smash-hand.png, burger-provoleta.png
- logo-hoppiness-blue.png, logo-hoppiness-white.png
- logo-hoppiness-loader.png, logo-hoppiness.png

---

## Orden de Ejecución

1. **Eliminar archivos** en el orden listado
2. **Actualizar package.json** para remover dependencias no usadas
3. **Verificar build** sin errores

---

## Beneficios Esperados

- Reducción de ~15-20% del peso del codebase
- Código 100% sincronizado con UI actual
- Mantenimiento más simple
- Menos confusión para futuros desarrollos
