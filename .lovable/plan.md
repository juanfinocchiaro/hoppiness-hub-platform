

# Plan: Flujo Simplificado para Franquiciados + Fix Bugs

## Resumen de Cambios

Se van a corregir 3 problemas:
1. **Bug del contador de urgentes** - Dice "2 comunicados urgentes" pero solo hay 1 visible
2. **Card de ayuda genérica** - Muestra tips de empleados a franquiciados
3. **Duplicación de información** - El franquiciado no necesita ver cards operativas en Mi Cuenta

---

## Parte 1: Corregir Contador de Urgentes

### Problema
El banner dice "2 comunicados urgentes sin leer" pero la card de comunicados solo muestra 1 porque:
- La card filtra por `target_roles` ✅
- El banner **NO** filtra por `target_roles` ❌

### Solución
Modificar el query `urgent-unread` en `CuentaDashboard.tsx` para que también filtre por los roles del usuario.

**Archivo:** `src/pages/cuenta/CuentaDashboard.tsx` (líneas 73-101)

Se agregará:
1. Fetch de los `local_role` del usuario desde `user_branch_roles`
2. Filtro de comunicados donde `target_roles` sea null O incluya algún rol del usuario

---

## Parte 2: Card de Ayuda Adaptativa

### Problema Actual
La card de ayuda muestra:
- "Podés ver tus próximos horarios programados" ← No aplica a franquiciado
- "Solicitá días libres desde la card de solicitudes" ← No aplica a franquiciado
- "Tu historial de fichajes y adelantos está disponible" ← No aplica a franquiciado

### Solución
Crear configuraciones de ayuda diferenciadas por tipo de usuario.

**Archivo:** `src/lib/helpConfig.ts`

Agregar nueva entrada:
```typescript
'cuenta-dashboard-franquiciado': {
  pageId: 'cuenta-dashboard-franquiciado',
  title: 'Mi Cuenta',
  description: 'Acceso rápido a la gestión de tus sucursales.',
  tips: [
    'Entrá a "Mi Local" para ver toda la operación de tu sucursal',
    'Los comunicados de marca aparecen aquí',
    'Podés actualizar tu información personal en "Mi Perfil"',
  ],
},
```

**Archivo:** `src/pages/cuenta/CuentaDashboard.tsx`

Cambiar el `PageHelp` para que use un pageId dinámico:
```typescript
const isOnlyFranquiciado = branchRoles.length > 0 && 
  branchRoles.every(r => r.local_role === 'franquiciado');

const helpPageId = isOnlyFranquiciado ? 'cuenta-dashboard-franquiciado' : 'cuenta-dashboard';

// En el render:
<PageHelp pageId={helpPageId} />
```

---

## Parte 3: Simplificar Mi Cuenta para Franquiciados

### Principio de Diseño
- **Mi Cuenta** = Acceso rápido a sucursales + comunicados de marca + perfil
- **Mi Local** = Toda la información operativa (en modo lectura para dueños)

### Lo que verá un Franquiciado en Mi Cuenta

| Sección | ¿Mostrar? | Motivo |
|---------|-----------|--------|
| Card de ayuda | ✅ Con tips específicos | Contextual |
| Card sucursal(es) | ✅ Sin PIN | Acceso a Mi Local |
| Comunicados | ✅ Solo de marca | Evitar duplicación con Mi Local |
| Mi Perfil | ✅ | Editar datos personales |
| Cards operativas | ❌ | Aplican solo a empleados |

### Archivos a Modificar

#### `src/pages/cuenta/CuentaDashboard.tsx`
- Detectar si el usuario solo tiene rol `franquiciado`
- Ocultar las cards operativas (horarios, fichajes, adelantos, etc.)
- Pasar prop `showOnlyBrand` a `MyCommunicationsCard`

```typescript
const isOnlyFranquiciado = branchRoles.length > 0 && 
  branchRoles.every(r => r.local_role === 'franquiciado');

// En el render - Solo para empleados operativos:
{!isOnlyFranquiciado && (
  <div className="grid gap-3 md:gap-4">
    <MyRegulationsCard />
    <MyCoachingsCard />
    <MyScheduleCard />
    <MyRequestsCard />
    <MyClockInsCard />
    <MySalaryAdvancesCard />
    <MyWarningsCard />
  </div>
)}

// Comunicados solo de marca para franquiciados:
<MyCommunicationsCard showOnlyBrand={isOnlyFranquiciado} />
```

#### `src/components/cuenta/MyCommunicationsCard.tsx`
Agregar prop `showOnlyBrand` para ocultar sección "De tu Encargado":

```typescript
interface MyCommunicationsCardProps {
  showOnlyBrand?: boolean;
}

export default function MyCommunicationsCard({ showOnlyBrand = false }: ...) {
  // Si showOnlyBrand, no mostrar comunicados locales
  const displayLocalComms = showOnlyBrand ? [] : localComms;
  
  // En render: condicionar sección "De tu Encargado"
  {!showOnlyBrand && renderCommList(localComms, ...)}
}
```

---

## Resumen de Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `src/pages/cuenta/CuentaDashboard.tsx` | 1. Corregir query urgentes. 2. PageHelp dinámico. 3. Ocultar cards operativas para franquiciados |
| `src/lib/helpConfig.ts` | Agregar entrada `cuenta-dashboard-franquiciado` con tips específicos |
| `src/components/cuenta/MyCommunicationsCard.tsx` | Agregar prop `showOnlyBrand` |

---

## Vista Final para Maria Eugenia (Franquiciada)

### Antes
```text
MI CUENTA
├── Card ayuda (tips de empleados) ← Irrelevante
├── Banner "2 urgentes" ← Bug
├── Card Villa Allende
├── Comunicados (De la Marca + De tu Encargado)
├── Cards operativas vacías ← Innecesarias
└── Mi Perfil
```

### Después
```text
MI CUENTA
├── Card ayuda (tips de franquiciado) ← Relevante
├── Banner "1 urgente" ← Correcto
├── Card Villa Allende (sin PIN)
├── Comunicados (Solo de marca)
└── Mi Perfil
```

El franquiciado accede a **Mi Local** para ver:
- Dashboard de ventas (solo ver)
- Equipo completo (solo ver)
- Horarios (solo ver)
- Fichajes (solo ver)
- Adelantos (solo ver)
- Comunicados del local (solo ver)

