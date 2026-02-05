
# Plan de Migración: Patrones Premium del Remix

## Resumen Ejecutivo
Implementar el sistema de componentes y layouts premium del remix en **5 fases** secuenciales, empezando por infraestructura base y terminando con layouts unificados.

---

## FASE 1: Infraestructura Base (Hooks y Utilidades)

### 1.1 Hook `useOnlineStatus`
**Archivo:** `src/hooks/useOnlineStatus.ts`

Detecta estado de conexión y si hubo desconexión reciente:
- Escucha eventos `online`/`offline` del navegador
- Retorna `{ isOnline: boolean, wasOffline: boolean }`
- `wasOffline` se resetea después de 5 segundos

### 1.2 Toast Wrapper
**Archivo:** `src/lib/toast.ts`

API unificada sobre Sonner:
```typescript
showToast.success(message)
showToast.error(message) 
showToast.info(message)
showToast.warning(message)
showToast.promise(promise, { loading, success, error })
```

### 1.3 Variables CSS adicionales
**Modificar:** `src/index.css`

Agregar si no existen:
- Variables de sombra ya documentadas
- Asegurar clases utilitarias (.scrollbar-hide, etc)

---

## FASE 2: UI Kit - Estados y Utilitarios

### 2.1 Sistema de Estados
**Directorio:** `src/components/ui/states/`

| Archivo | Descripción |
|---------|-------------|
| `empty-state.tsx` | Icono + título + descripción + acción opcional |
| `error-state.tsx` | Variante destructiva con botón "Reintentar" |
| `no-access-state.tsx` | Estado de acceso denegado con sugerencia |
| `index.ts` | Exports |

Estructura visual:
```text
+----------------------------------+
|     ( ○ )  <- Icono circular     |
|    Título                        |
|    Descripción secundaria        |
|    [  Acción  ]                  |
+----------------------------------+
```

### 2.2 Componentes Utilitarios

| Archivo | Props principales |
|---------|-------------------|
| `page-header.tsx` | `title`, `subtitle?`, `breadcrumb?`, `actions?`, `variant` |
| `status-badge.tsx` | `variant`: active/pending/validated/blocked/inactive/info/warning |
| `loading-button.tsx` | Extiende Button con `loading` y spinner |
| `confirm-dialog.tsx` | Dialog con título, mensaje, onConfirm, onCancel |
| `offline-banner.tsx` | Banner fijo cuando no hay conexión (usa useOnlineStatus) |

---

## FASE 3: DataTablePro y FormsPro

### 3.1 DataTablePro
**Directorio:** `src/components/ui/data-table-pro/`

| Componente | Función |
|------------|---------|
| `DataTablePro.tsx` | Wrapper con loading/error/empty automáticos |
| `DataToolbar.tsx` | Barra de búsqueda + filtros + acciones |
| `TableStates.tsx` | Skeleton animado + estados vacío/error |
| `index.ts` | Exports |

**Props principales de DataTablePro:**
```typescript
{
  title?: string;
  columns: number;             // Para skeleton
  header: ReactNode;           // TableHeader
  children: ReactNode;         // TableBody rows
  isLoading?: boolean;
  isError?: boolean;
  isEmpty?: boolean;
  onRetry?: () => void;
  searchValue?: string;
  onSearchChange?: (v: string) => void;
  emptyProps?: { icon, title, description, action };
  asCard?: boolean;            // Envolver en Card
}
```

### 3.2 FormsPro
**Directorio:** `src/components/ui/forms-pro/`

| Componente | Función |
|------------|---------|
| `FormLayout.tsx` | Grid responsive 1-3 columnas |
| `FormRow.tsx` | Label + input + hint + error |
| `FormSection.tsx` | Agrupación con título e icono |
| `StickyActions.tsx` | Barra sticky para botones submit |
| `index.ts` | Exports |

---

## FASE 4: Guards Mejorados

### 4.1 RequireBranchAccess
**Archivo:** `src/components/guards/RequireBranchAccess.tsx`

Guard que valida acceso a sucursal específica:
```typescript
<RequireBranchAccess branchId={id}>
  <PageComponent />
</RequireBranchAccess>
```

- Usa `usePermissionsWithImpersonation`
- Muestra `NoAccessState` si no tiene acceso
- Considera impersonación

### 4.2 Actualizar index.ts de guards
Exportar nuevo guard

---

## FASE 5: Sistema de Layouts Unificados

### 5.1 WorkShell - Layout Principal
**Archivo:** `src/components/layout/WorkShell.tsx`

Layout unificado para ambos paneles:

```text
+--[Header Mobile (lg:hidden)]---+
| [Menu] [Título] [_]            |
+--------------------------------+
| [Sidebar]  |  [Main Content]   |
| -Logo      |  padding: p-6     |
| -Nav       |                   |
| -Footer    |                   |
+--------------------------------+
```

**Props:**
```typescript
{
  mode: 'brand' | 'local';
  title: string;
  sidebar: ReactNode;
  children: ReactNode;
  footer?: ReactNode;          // Selector sucursal, switch panel
}
```

**Características:**
- Header mobile con Sheet drawer
- Sidebar desktop fijo de 288px (w-72)
- ImpersonationBanner integrado
- OfflineBanner integrado
- Soporte para modo embebido

### 5.2 WorkSidebar - Navegación por Dominios
**Archivo:** `src/components/layout/WorkSidebar.tsx`

Componentes reutilizables:

| Componente | Función |
|------------|---------|
| `WorkSidebarNav` | Contenedor principal |
| `NavSectionGroup` | Sección colapsable |
| `NavItemButton` | Item de navegación |

**Características:**
- Secciones colapsables con Collapsible
- Indicador activo: borde izquierdo azul + bg-primary/10
- Badges para contadores
- Auto-expand cuando hay item activo

### 5.3 LocalSidebar
**Archivo:** `src/components/layout/LocalSidebar.tsx`

Sidebar específico para Mi Local usando WorkSidebar:

**Dominios:**
- Dashboard (link directo)
- RRHH: Equipo, Coaching, Horarios, Fichajes, Adelantos, Apercibimientos, Reglamentos
- Comunicación: Comunicados
- Configuración: Turnos

### 5.4 BrandSidebar
**Archivo:** `src/components/layout/BrandSidebar.tsx`

Refactorizar AdminSidebar → BrandSidebar usando WorkSidebar.

### 5.5 Refactorizar Layouts Existentes

**Modificar:** `src/pages/local/BranchLayout.tsx`
- Usar WorkShell con mode='local'
- Usar LocalSidebar
- Eliminar código duplicado de sidebar

**Modificar:** `src/pages/admin/BrandLayout.tsx`
- Usar WorkShell con mode='brand'
- Usar BrandSidebar (antes AdminSidebar)
- Eliminar código duplicado de sidebar

---

## Archivos a Crear (Total: ~20)

### Infraestructura
1. `src/hooks/useOnlineStatus.ts`
2. `src/lib/toast.ts`

### Estados
3. `src/components/ui/states/empty-state.tsx`
4. `src/components/ui/states/error-state.tsx`
5. `src/components/ui/states/no-access-state.tsx`
6. `src/components/ui/states/index.ts`

### Utilitarios
7. `src/components/ui/page-header.tsx`
8. `src/components/ui/status-badge.tsx`
9. `src/components/ui/loading-button.tsx`
10. `src/components/ui/confirm-dialog.tsx`
11. `src/components/ui/offline-banner.tsx`

### DataTablePro
12. `src/components/ui/data-table-pro/DataTablePro.tsx`
13. `src/components/ui/data-table-pro/DataToolbar.tsx`
14. `src/components/ui/data-table-pro/TableStates.tsx`
15. `src/components/ui/data-table-pro/index.ts`

### FormsPro
16. `src/components/ui/forms-pro/FormLayout.tsx`
17. `src/components/ui/forms-pro/FormRow.tsx`
18. `src/components/ui/forms-pro/FormSection.tsx`
19. `src/components/ui/forms-pro/StickyActions.tsx`
20. `src/components/ui/forms-pro/index.ts`

### Guards
21. `src/components/guards/RequireBranchAccess.tsx`

### Layouts
22. `src/components/layout/WorkShell.tsx`
23. `src/components/layout/WorkSidebar.tsx`
24. `src/components/layout/LocalSidebar.tsx`
25. `src/components/layout/BrandSidebar.tsx`

## Archivos a Modificar

1. `src/index.css` - Variables CSS adicionales si faltan
2. `src/components/guards/index.ts` - Agregar RequireBranchAccess
3. `src/pages/local/BranchLayout.tsx` - Usar WorkShell
4. `src/pages/admin/BrandLayout.tsx` - Usar WorkShell

---

## Dependencias Entre Fases

```text
FASE 1 (Infraestructura)
    │
    ├──→ FASE 2 (Estados + Utilitarios)
    │         │
    │         └──→ FASE 3 (DataTablePro + FormsPro)
    │
    └──→ FASE 4 (Guards)
              │
              └──→ FASE 5 (Layouts)
```

**Crítico:** Las fases 1-2 deben completarse antes de las demás porque:
- `OfflineBanner` usa `useOnlineStatus`
- `WorkShell` usa `OfflineBanner`
- `DataTablePro` usa estados de TableStates

---

## Notas Técnicas

- Todos los componentes usan `cn()` de `@/lib/utils`
- Iconos: siempre de `lucide-react`
- Queries con `@tanstack/react-query` y `staleTime` configurado
- Traducciones hardcodeadas en español (es-AR)
- Formatos de moneda: `Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' })`

---

## Estimación de Trabajo

| Fase | Complejidad | Archivos |
|------|-------------|----------|
| 1 | Baja | 2 |
| 2 | Media | 7 |
| 3 | Alta | 8 |
| 4 | Baja | 1 |
| 5 | Alta | 6 + 2 modificaciones |

**Recomendación:** Implementar en 2-3 sesiones, con testing después de cada fase.
