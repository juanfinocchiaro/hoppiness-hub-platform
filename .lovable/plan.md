

# Plan: Agregar ImpersonationBanner a la Página de Inicio

## Problema

La página de inicio (`/`) no tiene el banner de impersonación, lo que impide ver que estás en modo "Ver como..." y no tenés forma de salir.

## Solución

Agregar el `ImpersonationBanner` a la página Index.tsx para que el banner sutil aparezca en todas las páginas públicas también.

---

## Cambios

### Archivo: `src/pages/Index.tsx`

**Agregar import (línea ~12):**
```typescript
import ImpersonationBanner from '@/components/admin/ImpersonationBanner';
```

**Agregar banner al inicio del componente (línea ~32):**
```typescript
return (
  <div className="min-h-screen bg-background">
    <ImpersonationBanner />  {/* ← NUEVO */}
    <PublicHeader />
    ...
```

---

## Páginas que Ya Tienen el Banner

| Página | Estado |
|--------|--------|
| `/cuenta` (CuentaDashboard) | ✅ Agregado |
| `/mimarca/*` (BrandLayout) | ✅ Ya estaba |
| `/milocal/*` (BranchLayout) | ✅ Ya estaba |

## Páginas que Necesitan el Banner

| Página | Archivo |
|--------|---------|
| `/` (Inicio) | `src/pages/Index.tsx` |
| `/franquicias` | `src/pages/Franquicias.tsx` |
| `/nosotros` | `src/pages/Nosotros.tsx` |
| `/contacto` | `src/pages/Contacto.tsx` |

---

## Resultado

El banner sutil "Viendo como [Nombre]" aparecerá en la esquina superior de TODAS las páginas, permitiendo salir del modo impersonación desde cualquier lugar.

---

## Complejidad

**Muy baja** - 2 líneas por archivo (4 archivos públicos).

