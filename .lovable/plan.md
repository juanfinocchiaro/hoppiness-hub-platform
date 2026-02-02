
# Plan: Corregir Error de UUID Inválido en Creación de PIN

## Problema Identificado

El error `invalid input syntax for type uuid: "undefined"` ocurre porque:

1. En `CuentaPerfil.tsx` línea 423:
   ```typescript
   userId={user?.id || ''}
   ```
   Cuando `user?.id` es undefined, se pasa una **string vacía** `''`

2. En `BranchPinCard.tsx` línea 39 y 59:
   ```typescript
   _exclude_user_id: userId || null,
   ```
   Aquí `'' || null` evalúa a `''` (string vacía) porque `''` es **truthy** en este contexto de JavaScript. La string vacía NO es convertida a `null`.

3. PostgreSQL recibe `''` como valor para un campo UUID → Error de sintaxis

## Solución

### Cambio 1: `CuentaPerfil.tsx`

Pasar `undefined` en lugar de string vacía y no renderizar `BranchPinCard` si no hay `user.id`:

```typescript
// Línea 417-425 - Agregar validación
{branchRoles.map((role: any) => {
  const branchName = role.branches?.name || 'Sucursal';
  // No renderizar si faltan datos críticos
  if (!role.id || !role.branch_id || !user?.id) return null;
  return (
    <BranchPinCard
      key={role.id}
      branchName={branchName}
      branchId={role.branch_id}
      roleId={role.id}
      currentPin={role.clock_pin}
      userId={user.id}  // Ya verificamos que existe
    />
  );
})}
```

### Cambio 2: `BranchPinCard.tsx`

Validar explícitamente que los UUIDs son strings no vacías antes de llamar a la función RPC:

```typescript
// En checkPinAvailability (línea 28+)
const checkPinAvailability = async (pinValue: string) => {
  if (pinValue.length !== 4) {
    setPinAvailable(null);
    return;
  }
  
  // Validar que tenemos los IDs necesarios
  if (!branchId || !roleId) {
    console.error('Missing branchId or roleId');
    setPinAvailable(null);
    return;
  }

  setCheckingPin(true);
  try {
    const { data, error } = await supabase.rpc('is_clock_pin_available', {
      _branch_id: branchId,
      _pin: pinValue,
      // Pasar null si userId está vacío o no existe
      _exclude_user_id: userId && userId.trim() !== '' ? userId : null,
    });
    // ...
  }
};

// En savePinMutation (línea 54+)
mutationFn: async (newPin: string) => {
  // Validar que tenemos los IDs necesarios
  if (!branchId || !roleId) {
    throw new Error('Datos de sucursal incompletos');
  }

  const { data: available, error: checkError } = await supabase.rpc('is_clock_pin_available', {
    _branch_id: branchId,
    _pin: newPin,
    // Pasar null si userId está vacío o no existe
    _exclude_user_id: userId && userId.trim() !== '' ? userId : null,
  });
  // ...
}
```

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/pages/cuenta/CuentaPerfil.tsx` | Validar `user?.id` antes de renderizar cada card |
| `src/components/cuenta/BranchPinCard.tsx` | Validar UUIDs y usar null correctamente |

## Verificación

Después de aplicar estos cambios:
1. Dalma podrá crear su PIN sin errores de UUID
2. El sistema validará correctamente la disponibilidad del PIN
3. El PIN se guardará en `user_branch_roles.clock_pin`
