

# Plan de Auditoría y Corrección Post-Implementación

## Resumen del Problema

Después de completar las 10 fases del Plan Maestro, hay varios gaps y componentes que quedaron desconectados o faltantes. Este plan identifica y corrige cada uno.

---

## HALLAZGOS DE LA AUDITORÍA

### 1. Reglamentos - FALTA CONECTAR EN MI MARCA

**Problema identificado:**
- El componente `RegulationsManager.tsx` EXISTE y está completamente funcional (permite subir PDF, ver historial, mostrar progreso de firmas)
- PERO **no está conectado** a ninguna ruta ni aparece en el sidebar de "Mi Marca"
- El plan original dice: *"MARCA sube PDF del reglamento (Mi Marca > Config)"*

**Archivos afectados:**
- `src/components/admin/AdminSidebar.tsx` → NO tiene sección "Configuración" ni "Reglamentos"
- `src/App.tsx` → NO tiene ruta `/mimarca/configuracion/reglamentos` o similar
- `src/pages/admin/` → NO existe página para reglamentos

---

### 2. Sidebar de Mi Marca - INCOMPLETO

**Estado actual del `AdminSidebar.tsx`:**
```
├── Dashboard
├── Mis Locales (dinámico + crear)
├── Usuarios
│   ├── Equipo Central
│   └── Todos los Usuarios
└── Comunicados
    └── Enviar Comunicados
```

**Lo que FALTA según el plan:**
- ❌ Configuración de Marca (reglamentos, settings generales)
- ❌ Acceso al gestor de reglamentos (`RegulationsManager.tsx`)

---

### 3. Rutas de Mi Marca - FALTANTES

**Rutas actuales en `App.tsx` para `/mimarca`:**
- `/mimarca` → `BrandHome`
- `/mimarca/locales/:slug` → `BranchDetail`
- `/mimarca/usuarios` → `UsersPage`
- `/mimarca/equipo-central` → `CentralTeam`
- `/mimarca/comunicados` → `CommunicationsPage`

**Rutas FALTANTES:**
- `/mimarca/reglamentos` → Para gestión de reglamentos de marca

---

### 4. VERIFICACIÓN: Fases Completadas vs Estado Real

| Fase | Descripción | ¿Conectado? | Problema |
|------|-------------|-------------|----------|
| Fase 1 | Limpieza BD | ✅ | OK |
| Fase 2 | Sistema 4 turnos | ✅ | OK - ruta `/config/turnos` en Mi Local |
| Fase 3 | Fichaje renovado | ✅ | OK - `/fichaje/:branchCode` |
| Fase 4 | Reglamentos | ⚠️ **PARCIAL** | Firmas en local OK, pero falta subida desde Mi Marca |
| Fase 5 | Comunicaciones | ✅ | OK - `/mimarca/comunicados` |
| Fase 6 | Apercibimientos | ✅ | OK - `/equipo/apercibimientos` |
| Fase 7 | Adelantos | ✅ | OK - `/equipo/adelantos` |
| Fase 8 | Dashboard Encargado | ✅ | OK - `ManagerDashboard` |
| Fase 9 | Bugs críticos | ✅ | OK |
| Fase 10 | Mobile | ✅ | OK |

---

## PLAN DE CORRECCIÓN

### Paso 1: Crear página de Reglamentos para Mi Marca

Crear archivo `src/pages/admin/BrandRegulationsPage.tsx` que:
- Importa y renderiza el componente `RegulationsManager` existente
- Mantiene el layout consistente con otras páginas de Mi Marca

```
/mimarca/reglamentos
└── BrandRegulationsPage.tsx
    └── RegulationsManager.tsx (ya existe)
```

### Paso 2: Agregar ruta en App.tsx

Dentro del bloque de rutas de Mi Marca:
```tsx
<Route path="reglamentos" element={<BrandRegulationsPage />} />
```

### Paso 3: Actualizar AdminSidebar.tsx

Agregar nueva sección "Configuración" con item "Reglamentos":

```tsx
sections.push({
  id: 'config',
  label: 'Configuración',
  icon: Settings,
  items: [
    { 
      type: 'navigation', 
      to: '/mimarca/reglamentos', 
      icon: FileText, 
      label: 'Reglamentos' 
    },
  ],
});
```

---

## ARCHIVOS A MODIFICAR

### Crear:
1. `src/pages/admin/BrandRegulationsPage.tsx` - Nueva página wrapper

### Modificar:
2. `src/App.tsx` - Agregar ruta `/mimarca/reglamentos`
3. `src/components/admin/AdminSidebar.tsx` - Agregar sección Configuración con Reglamentos

---

## RESULTADO ESPERADO

Después de la implementación:

**Sidebar de Mi Marca:**
```
├── Dashboard
├── Mis Locales
│   ├── + Nueva Sucursal
│   ├── Manantiales
│   ├── ...
├── Usuarios
│   ├── Equipo Central
│   └── Todos los Usuarios
├── Comunicados
│   └── Enviar Comunicados
└── Configuración          ← NUEVO
    └── Reglamentos        ← NUEVO
```

**Flujo completo de reglamentos:**
1. ✅ Superadmin sube PDF en `/mimarca/reglamentos`
2. ✅ Encargados ven alerta de nuevo reglamento en su dashboard
3. ✅ Encargados suben fotos de firmas en `/milocal/:id/equipo/reglamentos`
4. ✅ Empleados ven su estado de firma en `/cuenta`

---

## Sección Técnica

### Cambios en AdminSidebar.tsx (líneas ~78-124)

Se agregará una nueva sección después de "Comunicados":

```tsx
// Configuración
sections.push({
  id: 'config',
  label: 'Configuración',
  icon: Settings,
  items: [
    { 
      type: 'navigation', 
      to: '/mimarca/reglamentos', 
      icon: FileText, 
      label: 'Reglamentos' 
    },
  ],
});
```

### Nuevo archivo BrandRegulationsPage.tsx

```tsx
import RegulationsManager from '@/components/admin/RegulationsManager';

export default function BrandRegulationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reglamento Interno</h1>
        <p className="text-muted-foreground">
          Gestión del reglamento de la marca
        </p>
      </div>
      <RegulationsManager />
    </div>
  );
}
```

### Cambios en App.tsx (dentro de rutas /mimarca)

```tsx
import BrandRegulationsPage from "./pages/admin/BrandRegulationsPage";

// Dentro del Route de /mimarca:
<Route path="reglamentos" element={<BrandRegulationsPage />} />
```

