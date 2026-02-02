

# Plan: Corregir Detección de PIN Faltante en Dashboard

## Problema

El banner "¡Configurá tu PIN de fichaje!" en `/cuenta` no se muestra correctamente porque:

1. Busca en `profiles.clock_pin` (columna obsoleta)
2. Debería buscar en `user_branch_roles.clock_pin`
3. No considera que un usuario puede tener PINs faltantes en algunas sucursales pero no en otras

## Solución

### Cambio en `CuentaDashboard.tsx`

**Estado actual (línea 82):**
```typescript
const needsPinSetup = hasLocalAccess && profile && !profile.clock_pin;
```

**Nuevo enfoque:**
```typescript
// Fetch branch roles with clock_pin status
const { data: branchRolesData } = useQuery({
  queryKey: ['user-branch-roles-pins', user?.id],
  queryFn: async () => {
    if (!user) return [];
    const { data, error } = await supabase
      .from('user_branch_roles')
      .select('id, branch_id, clock_pin, branches!inner(name)')
      .eq('user_id', user.id)
      .eq('is_active', true);
    if (error) throw error;
    return data || [];
  },
  enabled: !!user && hasLocalAccess,
});

// Check if ANY branch is missing PIN
const branchesMissingPin = branchRolesData?.filter(r => !r.clock_pin) || [];
const needsPinSetup = branchesMissingPin.length > 0;
```

### Mejora del Banner

Actualizar `MissingPinBanner` para mostrar cuántas sucursales tienen PIN faltante:

```typescript
interface MissingPinBannerProps {
  employeeName?: string;
  missingCount?: number;  // Cuántas sucursales faltan
  totalCount?: number;    // Total de sucursales del usuario
}
```

Mensaje mejorado:
- "Te falta configurar el PIN en 1 sucursal"
- "Te falta configurar el PIN en 2 sucursales"

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `CuentaDashboard.tsx` | Fetch de `user_branch_roles` para verificar PINs |
| `MissingPinBanner.tsx` | Mostrar cantidad de sucursales sin PIN |

## Resultado Esperado

1. Dalma (y otros sin PIN) verán el banner amarillo correctamente
2. El banner indicará cuántas sucursales faltan configurar
3. Al hacer clic, irán a `/cuenta/perfil` donde pueden crear el PIN por sucursal

## Verificación

Después de implementar:
1. Login como Dalma → Debería ver banner "Te falta configurar PIN en 1 sucursal"
2. Login como Juan → NO debería ver el banner (ya tiene PIN)
3. Crear PIN de Dalma → Banner desaparece

