

# Plan: Corregir Query de Miembros de Red para Reuniones

## Problema Identificado

El hook `useNetworkMembers` en `src/hooks/useMeetings.ts` consulta la tabla `user_roles_v2` buscando el campo `local_role`, pero según la arquitectura actual del sistema:

- **`user_roles_v2`**: Almacena únicamente el `brand_role` (Superadmin, Coordinador, etc.)
- **`user_branch_roles`**: Almacena los roles locales por sucursal (Encargado, Franquiciado, Cajero, Empleado)

Esto causa que el selector de participantes en "Nueva Reunión de Red" siempre muestre 0 personas disponibles.

### Datos en la Base de Datos

Hay 6 encargados registrados correctamente en `user_branch_roles`:

| Nombre | Sucursal | Rol |
|--------|----------|-----|
| Lucía Aste | Nueva Córdoba | encargado |
| guadalupe malizia | Nueva Córdoba | encargado |
| Gaston Lopez | Villa Carlos Paz | encargado |
| Dalma ledesma | Manantiales | encargado |
| Lipiñski Luca | Villa Allende | encargado |
| Valentina Reginelli | General Paz | encargado |

## Solución

Modificar `useNetworkMembers` para consultar `user_branch_roles` en lugar de `user_roles_v2`, siguiendo el mismo patrón que `useUsersData`.

## Archivo a Modificar

**`src/hooks/useMeetings.ts`** - Líneas 876-929

### Código Actual (Incorrecto)

```typescript
export function useNetworkMembers() {
  return useQuery({
    queryKey: ['network-members'],
    queryFn: async () => {
      // Consulta INCORRECTA a user_roles_v2
      const { data: roles, error: rError } = await supabase
        .from('user_roles_v2')
        .select('user_id, local_role, branch_ids')
        .eq('is_active', true)
        .not('local_role', 'is', null);
      // ...
    },
  });
}
```

### Código Corregido

```typescript
export function useNetworkMembers() {
  return useQuery({
    queryKey: ['network-members'],
    queryFn: async () => {
      // Consultar user_branch_roles (fuente de verdad para roles locales)
      const { data: branchRoles, error: rError } = await supabase
        .from('user_branch_roles')
        .select('user_id, branch_id, local_role')
        .eq('is_active', true);
      
      if (rError) throw rError;
      if (!branchRoles?.length) return [];
      
      const userIds = [...new Set(branchRoles.map(r => r.user_id))];
      
      // Obtener perfiles
      const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);
      
      if (pError) throw pError;
      
      // Obtener nombres de sucursales
      const { data: branches } = await supabase
        .from('branches')
        .select('id, name');
      
      const branchMap = new Map(branches?.map(b => [b.id, b.name]) || []);
      
      // Construir lista de miembros
      const members: TeamMember[] = [];
      branchRoles.forEach(role => {
        const profile = profiles?.find(p => p.id === role.user_id);
        if (!profile) return;
        
        members.push({
          id: profile.id,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url || undefined,
          local_role: role.local_role || undefined,
          branch_id: role.branch_id,
          branch_name: branchMap.get(role.branch_id),
        });
      });
      
      return members;
    },
  });
}
```

## Archivo Adicional a Corregir

El hook `useBranchTeamMembers` (líneas 838-872) tiene el mismo problema y también debe corregirse para consultar `user_branch_roles`.

## Resumen de Cambios

| Archivo | Cambio |
|---------|--------|
| `src/hooks/useMeetings.ts` | Corregir `useNetworkMembers` para usar `user_branch_roles` |
| `src/hooks/useMeetings.ts` | Corregir `useBranchTeamMembers` para usar `user_branch_roles` |

