

# Refinamiento Visual y UX - Hoppiness Hub Platform

## Diagnostico Actual

La app tiene una base de design system solida (CSS variables, tokens de color, componentes UI estandarizados). Sin embargo, hay inconsistencias acumuladas que le quitan profesionalismo. El objetivo es llevarla a un look **limpio y moderno tipo Linear/Notion** sin perder la identidad de marca Hoppiness.

---

## Propuesta de Paleta (para tu aprobacion)

La paleta actual ya esta bien definida. La propuesta es **refinarla**, no cambiarla:

| Token | Actual | Propuesta | Razon |
|---|---|---|---|
| `--background` | `0 0% 100%` (blanco puro) | `220 14% 98%` (gris casi-blanco) | Fondo gris ultra-sutil reduce fatiga visual, como Linear/Notion. Las cards en blanco puro "flotan" sobre el fondo |
| `--muted` | `234 15% 94%` | `220 14% 92%` | Ligeramente mas visible para diferenciar zonas |
| `--border` | `234 20% 90%` | `220 13% 89%` | Bordes mas neutros, menos azulados |
| `--card` | `0 0% 100%` | `0 0% 100%` | **Sin cambio** - cards en blanco puro para contraste con fondo |
| `--foreground` | `234 100% 17%` | `224 71% 12%` | Texto principal ligeramente menos saturado, mas legible |
| `--muted-foreground` | `234 10% 40%` | `220 9% 46%` | Texto secundario un poco mas claro para mejor jerarquia |
| `--primary` | `234 100% 30%` | **Sin cambio** | El azul Hoppiness se mantiene intacto |
| `--accent` | `17 100% 56%` | **Sin cambio** | El naranja Hoppiness se mantiene intacto |
| `--radius` | `0.75rem` (12px) | `0.625rem` (10px) | Mas sutil, mas moderno. Notion usa ~8px, Linear ~10px |

**Cambios menores adicionales:**
- Sombras: reducir intensidad de `--shadow-card` para un look mas plano
- Sidebar: fondo `bg-card` (blanco) en vez de gris, border derecho sutil

**Importante**: Los colores de marca (#00139b azul, #ff521d naranja, #ffd41f amarillo) no se tocan. Solo se ajustan los neutros de fondo/texto/bordes.

---

## Plan de Ejecucion por Etapas

### Etapa 1: Tokens base (`src/index.css`)
Ajustar las CSS variables de `:root` segun la tabla de arriba. Esto propaga automaticamente a toda la app.

**Archivos**: `src/index.css`

---

### Etapa 2: Cards y contenedores - Estilo unificado

**Problema**: Mezcla de `shadow-sm`, `shadow-card`, `shadow-lg`, `hover:shadow-lg`, y cards sin sombra. Algunos usan `border-dashed`, otros `border-2`.

**Regla unificada**: 
- Cards normales: `border` + `shadow-none` (estilo Linear/Notion, bordes limpios sin sombra)
- Cards interactivas (links): `border hover:border-primary/50 transition-colors` (sin cambio de sombra, cambio de borde)
- Cards destacadas: `border-l-4 border-l-primary` (ya se usa en ManagerDashboard, mantener)

**Archivos afectados**:
- `src/pages/admin/BrandHome.tsx` - branch cards: quitar `hover:shadow-lg`
- `src/pages/local/BranchLayout.tsx` - selector de branch: quitar `hover:shadow-lg`
- `src/pages/cuenta/CuentaHome.tsx` - Mi Marca card: quitar `hover:shadow-md`
- `src/components/landing/LocationsSection.tsx` - location cards: quitar `shadow-card hover:shadow-elevated`

---

### Etapa 3: Espaciado y respiracion

**Problema**: Algunas paginas usan `space-y-4`, otras `space-y-6`. Los dashboards tienen cards muy pegadas.

**Regla**: `space-y-6` como estandar para paginas, `gap-4` para grids de cards.

**Archivos afectados** (los que usan `space-y-4`):
- `src/components/local/ManagerDashboard.tsx` - cambiar `space-y-4` a `space-y-6`
- Verificar paginas de Mi Local que usen `space-y-4`

---

### Etapa 4: Sidebar refinamiento

**Problema**: El sidebar desktop tiene fondo `bg-card` (blanco) con `border-r`, pero la seccion de navegacion se siente densa.

**Mejoras**:
- Aumentar padding del nav area de `p-4` a `p-5`
- Agregar `border-t border-border` entre secciones colapsables para separacion visual
- NavSectionGroup labels: agregar `mb-1` despues del trigger para mas aire

**Archivos**: `src/components/layout/WorkSidebar.tsx`, `src/components/layout/WorkShell.tsx`

---

### Etapa 5: Botones - Tamanio tactil minimo

**Problema**: Algunos botones son demasiado chicos en mobile. El `NavActionButton` todavia usa `size="sm"`.

**Regla**: Todos los botones de accion principal deben tener `min-h-[44px]` en mobile (ya se hace en TeamPage, falta en otros).

**Archivos afectados**:
- `src/components/layout/WorkSidebar.tsx` - `NavActionButton` quitar `size="sm"`
- Verificar botones de accion en pages

---

### Etapa 6: Productividad card en BrandHome

**Problema**: La card de "Productividad" en BrandHome usa `bg-accent/20 border-2 border-accent` (naranja fuerte) que rompe con el look limpio del resto.

**Correccion**: Usar el mismo estilo que las demas stat cards (`bg-muted/50 rounded-lg`) y solo colorear el valor numerico en accent si se quiere destacar.

**Archivos**: `src/pages/admin/BrandHome.tsx`

---

### Etapa 7: SalesHistoryPage - padding redundante

**Problema**: `SalesHistoryPage.tsx` tiene `p-4 md:p-6` en su wrapper (doble padding, se nos paso en la auditoria anterior).

**Archivos**: `src/pages/local/SalesHistoryPage.tsx`

---

## Resumen de Archivos

| Etapa | Archivos | Tipo de cambio |
|---|---|---|
| 1 | `src/index.css` | Ajuste de CSS variables |
| 2 | 4 archivos de paginas/componentes | Quitar sombras inconsistentes |
| 3 | `ManagerDashboard.tsx` + otros | Estandarizar spacing |
| 4 | `WorkSidebar.tsx`, `WorkShell.tsx` | Mejorar separacion visual |
| 5 | `WorkSidebar.tsx` | Touch targets |
| 6 | `BrandHome.tsx` | Unificar stat cards |
| 7 | `SalesHistoryPage.tsx` | Quitar padding redundante |

## Siguiente paso

**Necesito tu OK en la propuesta de paleta** (Etapa 1) antes de implementar. Los cambios de neutros (fondo gris ultra-sutil, bordes menos azulados) son la base sobre la que se apoyan todas las demas mejoras. Si preferis mantener el blanco puro de fondo, se puede - el resto de las etapas funcionan igual.

