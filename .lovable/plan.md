

# Plan: Validación de Colaborador Existente en la Búsqueda

## Problema Actual

Cuando se busca un email que ya pertenece al equipo del local:
1. Se muestra "Usuario encontrado ✅" con botón "Agregar al equipo"
2. Al hacer click, recién ahí la edge function devuelve error "Este usuario ya es parte del equipo"

**Problema UX**: El usuario debería ver inmediatamente que ya es parte del equipo, sin necesidad de intentar agregarlo.

## Estados Adicionales Necesarios

```
┌───────────────────────────────────────────────────────────────────┐
│ Estado actual: 'found'                                            │
│                                                                   │
│ Nuevos sub-estados:                                               │
│  • 'already_active' → Ya es parte del equipo (activo)             │
│  • 'inactive' → Estuvo pero fue desactivado (reactivable)         │
│  • 'available' → Existe pero nunca estuvo en este local           │
└───────────────────────────────────────────────────────────────────┘
```

## Nuevo Flujo Visual

### Caso 1: Usuario ya activo en el local

```
┌────────────────────────────────────────────────────┐
│ 👥 Agregar Colaborador                        [X] │
├────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────┐   │
│ │ ⚠️ Ya es parte del equipo                   │   │
│ │                                             │   │
│ │  👤 Braian Miguel Salas                     │   │
│ │     braiiansalas38@gmail.com                │   │
│ │                                             │   │
│ │  Rol actual: Empleado                       │   │
│ └─────────────────────────────────────────────┘   │
│                                                    │
│ Este colaborador ya está activo en el equipo.      │
│ Podés editar su rol desde la lista de equipo.      │
│                                                    │
│             [← Buscar otro]  [Cerrar]              │
└────────────────────────────────────────────────────┘
```

### Caso 2: Usuario desactivado (ex-colaborador)

```
┌────────────────────────────────────────────────────┐
│ 👥 Agregar Colaborador                        [X] │
├────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────┐   │
│ │ 🔄 Ex-colaborador encontrado                │   │
│ │                                             │   │
│ │  👤 María González                          │   │
│ │     maria@gmail.com                         │   │
│ │                                             │   │
│ │  Rol anterior: Cajero                       │   │
│ └─────────────────────────────────────────────┘   │
│                                                    │
│ Este colaborador estuvo en el equipo y fue dado   │
│ de baja. Podés reactivarlo con un nuevo rol.      │
│                                                    │
│ Rol: [Cajero ▼]                                   │
│                                                    │
│     [← Buscar otro]  [🔄 Reactivar colaborador]   │
└────────────────────────────────────────────────────┘
```

### Caso 3: Usuario disponible (nunca estuvo)

```
┌────────────────────────────────────────────────────┐
│ 👥 Agregar Colaborador                        [X] │
├────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────┐   │
│ │ ✅ Usuario encontrado                       │   │
│ │                                             │   │
│ │  👤 Juan Pérez                              │   │
│ │     juan@gmail.com                          │   │
│ └─────────────────────────────────────────────┘   │
│                                                    │
│ Rol: [Encargado ▼]                                │
│                                                    │
│     [← Buscar otro]  [✓ Agregar al equipo]        │
└────────────────────────────────────────────────────┘
```

## Cambios Técnicos

### Archivo: `src/components/hr/InviteStaffDialog.tsx`

**1. Actualizar tipos de estado:**

```typescript
type SearchStatus = 'idle' | 'searching' | 'found' | 'not_found';
type BranchMemberStatus = 'available' | 'already_active' | 'inactive' | null;

interface FoundUser {
  id: string;
  full_name: string;
  email: string;
}

interface BranchRoleInfo {
  status: BranchMemberStatus;
  currentRole?: string;
}
```

**2. Nuevo estado:**

```typescript
const [branchRoleInfo, setBranchRoleInfo] = useState<BranchRoleInfo | null>(null);
```

**3. Modificar `handleSearch`:**

```typescript
const handleSearch = async () => {
  // ... validación de email ...
  
  setSearchStatus('searching');
  
  try {
    // Buscar perfil
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (!profile) {
      setFoundUser(null);
      setBranchRoleInfo(null);
      setSearchStatus('not_found');
      return;
    }

    setFoundUser(profile);

    // Verificar si ya tiene rol en este local
    const { data: existingRole } = await supabase
      .from('user_branch_roles')
      .select('id, local_role, is_active')
      .eq('user_id', profile.id)
      .eq('branch_id', branchId)
      .maybeSingle();

    if (existingRole) {
      if (existingRole.is_active) {
        setBranchRoleInfo({ 
          status: 'already_active', 
          currentRole: existingRole.local_role 
        });
      } else {
        setBranchRoleInfo({ 
          status: 'inactive', 
          currentRole: existingRole.local_role 
        });
        setRole(existingRole.local_role as LocalRole); // Pre-seleccionar rol anterior
      }
    } else {
      setBranchRoleInfo({ status: 'available' });
    }

    setSearchStatus('found');
  } catch (error) {
    // ... manejo de error ...
  }
};
```

**4. UI condicional según `branchRoleInfo.status`:**

- `already_active`: Card azul/gris informativa, sin botón de agregar
- `inactive`: Card naranja con opción de reactivar
- `available`: Card verde actual con botón agregar

**5. Reset al cambiar email o cerrar:**

```typescript
const handleReset = () => {
  setSearchStatus('idle');
  setFoundUser(null);
  setBranchRoleInfo(null);
  setEmail('');
  setRole('cajero');
};
```

## Resumen de Cambios

| Elemento | Cambio |
|----------|--------|
| `SearchStatus` | Sin cambios (idle, searching, found, not_found) |
| `BranchRoleInfo` | Nuevo estado para info del rol en el local |
| `handleSearch` | Agregar query a `user_branch_roles` |
| UI `found` | 3 variantes según status del rol |
| Botón acción | "Agregar" / "Reactivar" / ninguno |

## Beneficios

1. **Feedback inmediato**: El usuario sabe al instante si el colaborador ya existe
2. **Reactivación clara**: Ex-colaboradores se muestran con opción de reactivar
3. **Evita errores**: No hay intentos fallidos de agregar duplicados
4. **Conserva historial**: Al reactivar, se mantiene el registro original

