
# Plan: Segregacion de Coaching por Jerarquia de Roles

## Problema Detectado

Actualmente la pagina de Coaching no respeta la jerarquia de evaluacion:

1. **Encargados** ven el panel para evaluar a su equipo, pero tambien ven "Mis Coachings" en Mi Cuenta (no deberian - ellos evaluan, no son evaluados por el local)
2. **Los coachings de Encargados** deben ser vistos y creados por Coordinadores/Superadmin/Franquiciado, no por el propio encargado
3. **Falta un panel separado** para "Coaching de Encargados" visible solo para roles de supervision (coordinador, superadmin, franquiciado)

## Jerarquia de Evaluacion

```text
+------------------+          evalua         +------------------+
|   Coordinador    | ----------------------> |    Encargado     |
|   Superadmin     |                         |                  |
|   Franquiciado   |                         |                  |
+------------------+                         +------------------+
                                                     |
                                                     | evalua
                                                     v
                                             +------------------+
                                             |  Empleado/Cajero |
                                             +------------------+
```

## Cambios Propuestos

### 1. Modificar CoachingPage.tsx

**Logica de roles a corregir:**

- Si el usuario efectivo es `encargado`: 
  - Muestra lista de empleados/cajeros para evaluar
  - NO muestra encargados en la lista (el encargado no se evalua a si mismo ni a otros encargados)
  
- Si el usuario efectivo es `coordinador`, `superadmin` o `franquiciado`:
  - Muestra lista de empleados/cajeros para evaluar (igual que encargado)
  - Muestra seccion adicional "Coaching de Encargados" con lista de encargados para evaluar

**Nueva UI:**

```text
Coaching del Equipo
[Stats cards]

Tabs: [Equipo] [Encargados*] [Certificaciones]
              ↑ solo visible para coordinador/superadmin/franquiciado

Tab Equipo:
- Lista empleados y cajeros (sin encargados)
- Click para evaluar

Tab Encargados (nuevo):
- Lista de encargados de la sucursal
- Click para evaluar con formulario de competencias de manager
- Solo visible para roles de supervision

Tab Certificaciones:
- Matriz actual (sin cambios)
```

### 2. Modificar MyCoachingsCard.tsx

**Logica a agregar:**

- Si el usuario efectivo tiene rol `encargado` en alguna sucursal → NO mostrar "Mis Coachings"
- Solo mostrar para roles `empleado` y `cajero`

Esto es porque los encargados son evaluados desde otro panel (por coordinadores), no ven sus propios coachings en "Mi Cuenta".

### 3. Crear Seccion de Coaching de Encargados

**Nueva seccion dentro de la misma pagina:**

- Filtrar `user_branch_roles` por `local_role = 'encargado'`
- Excluir al usuario actual (si es coordinador en esa sucursal)
- Mostrar formulario de coaching con competencias especificas de managers

### 4. Actualizar useCoachingStats.ts

Agregar estadisticas separadas para encargados:
- `totalManagers`: cantidad de encargados
- `managersWithCoaching`: encargados evaluados este mes
- `managersWithoutCoaching`: pendientes

---

## Detalle Tecnico de Cambios

### Archivo: `src/pages/local/CoachingPage.tsx`

**Cambios:**

1. Agregar nuevo tab "Encargados" condicional

2. Modificar query de teamMembers para excluir encargados cuando el usuario es encargado:
```typescript
const rolesToEvaluate = canEvaluateManagers 
  ? ['empleado', 'cajero', 'encargado'] as const
  : ['empleado', 'cajero'] as const;
```
Cambia a:
```typescript
// Lista base siempre: empleados y cajeros
const baseRoles = ['empleado', 'cajero'];

// Para el tab "Equipo", siempre solo empleados/cajeros
// Para el tab "Encargados", solo encargados (si puede evaluarlos)
```

3. Agregar query separada para encargados:
```typescript
const { data: managers } = useQuery({
  queryKey: ['branch-managers-coaching', branchId],
  enabled: canEvaluateManagers,
  queryFn: async () => {
    // Fetch encargados de la sucursal
    // Excluir usuario actual
  }
});
```

4. Nuevo TabsContent para "Encargados":
```tsx
{canEvaluateManagers && (
  <TabsTrigger value="managers">
    <UserCog /> Encargados
  </TabsTrigger>
)}

<TabsContent value="managers">
  {/* Lista de encargados con opcion de evaluar */}
</TabsContent>
```

### Archivo: `src/components/cuenta/MyCoachingsCard.tsx`

**Cambios:**

1. Importar `useEffectiveUser` y `usePermissionsWithImpersonation`

2. Agregar verificacion de rol:
```typescript
const { id: effectiveUserId } = useEffectiveUser();
const { branchRoles } = usePermissionsWithImpersonation();

// Verificar si el usuario tiene rol de encargado en alguna sucursal
const isManager = branchRoles.some(r => r.local_role === 'encargado');

// Si es encargado, no mostrar este card
if (isManager) {
  return null;
}
```

### Archivo: `src/hooks/useCoachingStats.ts`

**Cambios:**

1. Agregar campos para managers:
```typescript
interface CoachingStats {
  // ... existentes
  totalManagers: number;
  managersWithCoaching: number;
  pendingManagerCoachings: number;
}
```

2. Query adicional para encargados en el fetch

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/pages/local/CoachingPage.tsx` | Tab Encargados, queries separadas, logica de roles |
| `src/components/cuenta/MyCoachingsCard.tsx` | Ocultar para encargados |
| `src/hooks/useCoachingStats.ts` | Stats de managers |

## Criterios de Aceptacion

- [ ] Encargados ven solo empleados/cajeros en su lista de evaluacion
- [ ] Encargados NO ven "Mis Coachings" en Mi Cuenta
- [ ] Coordinadores/Superadmin/Franquiciado ven tab "Encargados" adicional
- [ ] El tab Encargados muestra lista de managers para evaluar
- [ ] Stats cards muestran metricas separadas cuando corresponde
- [ ] Impersonacion funciona correctamente (viendo como Dalma → no ve tab Encargados, no ve Mis Coachings)
