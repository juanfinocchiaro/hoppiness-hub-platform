
# Plan: Sistema de PIN de Fichaje por Sucursal (Escalable)

## Situación Actual

| Aspecto | Estado Actual | Problema |
|---------|---------------|----------|
| Ubicación del PIN | `profiles.clock_pin` | PIN único global por usuario |
| Validación | `validate_clock_pin()` busca en profiles | No soporta múltiples sucursales |
| Escalabilidad | 10,000 combinaciones (0000-9999) | Con cientos de sucursales, se repetirían PINs |
| Multi-sucursal | No soportado | Mismo PIN en todas las sucursales |

## Nuevo Modelo Propuesto

### Arquitectura: PIN por Sucursal en `user_branch_roles`

```
┌─────────────────────────────────────────────────────────────────┐
│                     user_branch_roles                           │
├─────────────────────────────────────────────────────────────────┤
│ user_id      │ branch_id      │ local_role │ clock_pin (NUEVO) │
├──────────────┼────────────────┼────────────┼───────────────────┤
│ Juan         │ Manantiales    │ franq      │ 1234              │
│ Dalma        │ Manantiales    │ encargado  │ 5678              │
│ Dalma        │ General Paz    │ encargado  │ 4321  ← DIFERENTE │
│ Braian       │ Manantiales    │ empleado   │ 9999              │
└─────────────────────────────────────────────────────────────────┘
```

**Ventajas:**
- Cada sucursal tiene su propio "pool" de 10,000 PINs
- Un usuario puede tener diferentes PINs en diferentes sucursales
- Validación de unicidad solo dentro de cada sucursal
- Escala a miles de sucursales sin conflictos

---

## Cambios de Base de Datos

### 1. Agregar columna `clock_pin` a `user_branch_roles`

```sql
-- Agregar columna
ALTER TABLE user_branch_roles
ADD COLUMN clock_pin VARCHAR(4) DEFAULT NULL;

-- Índice para validación rápida (único por sucursal)
CREATE UNIQUE INDEX idx_ubr_branch_clock_pin 
ON user_branch_roles(branch_id, clock_pin) 
WHERE clock_pin IS NOT NULL AND is_active = true;
```

### 2. Migrar PINs existentes de `profiles` a `user_branch_roles`

```sql
-- Migrar PINs existentes a user_branch_roles (en todas las sucursales del usuario)
UPDATE user_branch_roles ubr
SET clock_pin = p.clock_pin
FROM profiles p
WHERE ubr.user_id = p.id
  AND p.clock_pin IS NOT NULL
  AND ubr.is_active = true;
```

### 3. Nueva función de validación

```sql
CREATE OR REPLACE FUNCTION public.validate_clock_pin_v2(_branch_code text, _pin text)
RETURNS TABLE(user_id uuid, full_name text, branch_id uuid, branch_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ubr.user_id,
    p.full_name,
    b.id as branch_id,
    b.name as branch_name
  FROM user_branch_roles ubr
  JOIN profiles p ON p.id = ubr.user_id
  JOIN branches b ON b.clock_code = _branch_code AND b.id = ubr.branch_id
  WHERE ubr.clock_pin = _pin
    AND ubr.is_active = true
    AND b.is_active = true
  LIMIT 1;
END;
$$;
```

### 4. Función para validar disponibilidad de PIN

```sql
CREATE OR REPLACE FUNCTION public.is_clock_pin_available(_branch_id uuid, _pin text, _exclude_user_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM user_branch_roles
    WHERE branch_id = _branch_id
      AND clock_pin = _pin
      AND is_active = true
      AND (_exclude_user_id IS NULL OR user_id != _exclude_user_id)
  )
$$;
```

---

## Cambios de Frontend

### 1. Actualizar `CuentaPerfil.tsx`

**Problema actual:** Solo muestra un input de PIN global.

**Solución:** Mostrar un PIN por cada sucursal del usuario.

```typescript
// Obtener roles del usuario
const { data: branchRoles } = useQuery({
  queryKey: ['user-branch-roles', user?.id],
  queryFn: async () => {
    const { data } = await supabase
      .from('user_branch_roles')
      .select(`
        id,
        branch_id,
        clock_pin,
        local_role,
        branches!inner(id, name)
      `)
      .eq('user_id', user.id)
      .eq('is_active', true);
    return data;
  },
});

// UI: Un card por sucursal
{branchRoles?.map(role => (
  <PinCard 
    key={role.id}
    branchName={role.branches.name}
    branchId={role.branch_id}
    currentPin={role.clock_pin}
    roleId={role.id}
    onUpdate={() => refetch()}
  />
))}
```

### 2. Componente `BranchPinCard` (nuevo)

```typescript
interface BranchPinCardProps {
  branchName: string;
  branchId: string;
  roleId: string;
  currentPin: string | null;
}

// Validar disponibilidad antes de guardar
const checkAvailability = async (pin: string) => {
  const { data } = await supabase.rpc('is_clock_pin_available', {
    _branch_id: branchId,
    _pin: pin,
    _exclude_user_id: userId
  });
  return data;
};
```

### 3. Actualizar `EmployeeDataModal.tsx`

**Cambio:** En la pestaña "Laboral", el PIN ahora se guarda en `user_branch_roles` en lugar de `profiles`.

```typescript
// Al guardar:
const { error } = await supabase
  .from('user_branch_roles')
  .update({ clock_pin: clockPin })
  .eq('id', roleId);
```

### 4. Actualizar `FichajeEmpleado.tsx`

**Cambio:** Usar la nueva función `validate_clock_pin_v2`.

```typescript
const { data, error } = await supabase.rpc('validate_clock_pin_v2', {
  _branch_code: branchCode,
  _pin: pinValue,
});
```

---

## Flujo de Usuario

### Empleado Creando su PIN

```
┌─────────────────────────────────────────────────────────┐
│                    Mi Cuenta → Mi Perfil                │
├─────────────────────────────────────────────────────────┤
│ PIN de Fichaje                                          │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 📍 Manantiales                                      │ │
│ │ PIN: [1234] ✅ Activo                               │ │
│ │ [Cambiar PIN]                                       │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 📍 General Paz                                      │ │
│ │ PIN: [    ] Sin configurar                          │ │
│ │ [Crear PIN]                                         │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Encargado Asignando PIN desde Mi Equipo

```
┌─────────────────────────────────────────────────────────┐
│          Datos del Empleado → Laboral                   │
├─────────────────────────────────────────────────────────┤
│ PIN de Fichaje para esta sucursal                       │
│                                                         │
│ PIN: [____] (4 dígitos)                                 │
│                                                         │
│ ⚠️ Si el PIN ya está en uso, se mostrará error         │
└─────────────────────────────────────────────────────────┘
```

---

## Validación y Escalabilidad

| Escenario | Con PIN Global | Con PIN por Sucursal |
|-----------|----------------|----------------------|
| 1 sucursal, 50 empleados | ✅ Sin problema | ✅ Sin problema |
| 10 sucursales, 50 emp c/u | ⚠️ 500 PINs ocupados | ✅ 50 por sucursal |
| 100 sucursales, 100 emp c/u | ❌ Saturado | ✅ 100 por sucursal |
| Empleado en 2 sucursales | 🔄 Mismo PIN | ✅ PIN diferente c/u |

**Matemáticas:**
- Con 4 dígitos: 10,000 combinaciones posibles
- Por sucursal: hasta 10,000 empleados por local (más que suficiente)
- Global: máximo 10,000 empleados en TODA la franquicia

---

## Resumen de Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| Migración SQL | Agregar `clock_pin` a `user_branch_roles`, crear funciones |
| `CuentaPerfil.tsx` | Mostrar PIN por cada sucursal del usuario |
| `EmployeeDataModal.tsx` | Guardar PIN en `user_branch_roles` |
| `FichajeEmpleado.tsx` | Usar `validate_clock_pin_v2` |

---

## Migración Sin Downtime

1. Agregar columna y funciones nuevas
2. Migrar PINs existentes a `user_branch_roles`
3. Actualizar frontend para usar nueva estructura
4. La función anterior sigue funcionando mientras se despliega
5. Opcional: eliminar `profiles.clock_pin` después de validar
