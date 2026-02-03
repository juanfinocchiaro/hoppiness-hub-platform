
# Plan: Eliminar Duplicación de Coaching de Encargados

## Problema Identificado

La página de Coaching en **Mi Local** (`/milocal/:branchId/equipo/coaching`) tiene un tab "Encargados" que permite a Coordinadores/Superadmins evaluar encargados. Esto duplica la funcionalidad que acabamos de implementar en **Mi Marca** y genera confusión.

**Principio**: Cada panel tiene su propósito:
- **Mi Local** → Operación del día a día del local (Encargados evalúan a su staff)
- **Mi Marca** → Gestión centralizada de la marca (Coordinadores evalúan a encargados)

---

## Cambios Propuestos

### Archivo a Modificar
`src/pages/local/CoachingPage.tsx`

### Cambios Específicos

1. **Eliminar la variable `canEvaluateManagers`** (línea 47)
   - Ya no necesitamos esta lógica en Mi Local

2. **Eliminar el query de managers** (líneas 85-116)
   - No se fetchean encargados para evaluar desde Mi Local

3. **Eliminar el tab "Encargados"** (líneas 364-373)
   - El TabsTrigger y TabsContent de encargados desaparecen

4. **Simplificar las estadísticas** (líneas 294-354)
   - Solo mostrar stats del staff (empleados/cajeros), no de encargados

5. **Limpiar imports y código no usado**
   - `UserCog` ya no se necesita
   - `refetchManagers` ya no existe

---

## Resultado Esperado

### Antes (confuso)
```text
Mi Local > Coaching
├── Tab "Equipo" → Evaluar empleados ✓
├── Tab "Encargados" → Evaluar encargados (DUPLICADO)
└── Tab "Certificaciones"
```

### Después (claro)
```text
Mi Local > Coaching
├── Tab "Equipo" → Evaluar empleados ✓
└── Tab "Certificaciones"

Mi Marca > Locales > [Local] > Equipo
├── Sección Propietarios (solo info)
├── Sección Encargados → Evaluar encargados ✓
└── Sección Staff → Ver coachings del equipo
```

---

## Flujo Final de Coaching

```text
┌─────────────────────────────────────────────────────────────────┐
│                    JERARQUÍA DE COACHING                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Coordinador/Superadmin                                        │
│        │                                                        │
│        │  Evalúa desde MI MARCA                                 │
│        ▼                                                        │
│   ┌─────────────┐                                               │
│   │  Encargado  │                                               │
│   └─────────────┘                                               │
│        │                                                        │
│        │  Evalúa desde MI LOCAL                                 │
│        ▼                                                        │
│   ┌─────────────┐                                               │
│   │   Staff     │ (empleados, cajeros)                          │
│   └─────────────┘                                               │
│                                                                 │
│   Franquiciado: Solo visualiza, no evalúa                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Detalles Técnicos

### Código a Eliminar

```typescript
// ELIMINAR: Variable canEvaluateManagers
const canEvaluateManagers = isSuperadmin || isCoordinador;

// ELIMINAR: Query completo de managers
const { data: managers, isLoading: loadingManagers, refetch: refetchManagers } = useQuery({
  queryKey: ['branch-managers-coaching', branchId, currentUserId],
  // ... todo el query
});

// ELIMINAR: Tab de encargados en Tabs
{canEvaluateManagers && (
  <TabsTrigger value="managers" className="gap-2">
    <UserCog className="h-4 w-4" />
    Encargados
    ...
  </TabsTrigger>
)}

// ELIMINAR: TabsContent de managers
{canEvaluateManagers && (
  <TabsContent value="managers" className="mt-4">
    ...
  </TabsContent>
)}
```

### Imports a Limpiar

```typescript
// ELIMINAR de imports
import { UserCog } from 'lucide-react';
```

### Estadísticas Simplificadas

Las cards de estadísticas solo mostrarán datos del staff:
- Total empleados
- Coachings completados (solo del staff)
- Pendientes (solo del staff)
- Promedio de score

---

## Beneficios

1. **Sin duplicación**: Cada acción tiene un único lugar
2. **Lógica clara**: Mi Local = staff, Mi Marca = encargados
3. **Menos confusión**: El Coordinador sabe dónde ir para cada tarea
4. **Código más simple**: Menos lógica condicional en CoachingPage
