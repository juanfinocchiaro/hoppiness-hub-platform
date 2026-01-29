
# Plan: Corregir Navegación de Menús + Cache de Nombres

## Resumen
Dos bugs de navegación/cache:
1. El menú de Mi Local marca dos items activos simultáneamente (Equipo + Fichajes)
2. Al cambiar nombre de sucursal, el sidebar no se actualiza hasta refrescar

---

## Problema 1: Doble marcado en menú de Mi Local

### Causa raíz
En `BranchLayout.tsx`, la lógica `isItemActive` usa `startsWith` para detectar rutas activas. Cuando estás en `/milocal/{id}/equipo/fichajes`:
- `equipo` (path: `equipo`) → `startsWith('equipo')` = TRUE
- `equipo/fichajes` (path: `equipo/fichajes`) → coincidencia exacta = TRUE

Resultado: ambos items se marcan activos.

### Solución
Cambiar la lógica para que solo marque activo cuando:
1. Es una coincidencia exacta, O
2. Es padre directo (solo si el item tiene subitems)

**Archivo:** `src/pages/local/BranchLayout.tsx`

```tsx
// ANTES (líneas 273-279)
const isItemActive = (item: NavItem): boolean => {
  if (item.to === '') {
    return location.pathname === `/milocal/${branchId}`;
  }
  const itemPath = `/milocal/${branchId}/${item.to}`;
  return location.pathname === itemPath || location.pathname.startsWith(`${itemPath}/`);
};

// DESPUÉS
const isItemActive = (item: NavItem): boolean => {
  if (item.to === '') {
    return location.pathname === `/milocal/${branchId}`;
  }
  const itemPath = `/milocal/${branchId}/${item.to}`;
  // Solo coincidencia exacta, NO startsWith
  return location.pathname === itemPath;
};
```

---

## Problema 2: Cache del sidebar no se actualiza

### Causa raíz
Hay 3 queries separadas para branches:
1. `['branch-detail', slug]` → `BranchDetail.tsx` 
2. `['admin-sidebar-branches']` → `AdminSidebar.tsx`
3. `['accessible-branches-v2', ...]` → `usePermissionsV2.ts`

Cuando se guarda en `BranchEditPanel`, solo se llama `refetch()` del primero. Los otros mantienen datos viejos en cache.

### Solución
Usar `queryClient.invalidateQueries` para invalidar TODAS las queries de branches cuando se guarda.

**Archivo:** `src/components/admin/BranchEditPanel.tsx`

```tsx
import { useQueryClient } from '@tanstack/react-query';

export default function BranchEditPanel({ branch, onSaved, onCancel }: BranchEditPanelProps) {
  const queryClient = useQueryClient();
  // ... resto del código ...

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('branches')
        .update({ /* campos */ })
        .eq('id', branch.id);

      if (error) throw error;

      // Invalidar TODAS las queries de branches
      queryClient.invalidateQueries({ queryKey: ['admin-sidebar-branches'] });
      queryClient.invalidateQueries({ queryKey: ['accessible-branches-v2'] });
      queryClient.invalidateQueries({ queryKey: ['branch-detail'] });

      toast.success('Sucursal actualizada');
      onSaved();
    } catch (error) {
      // ...
    } finally {
      setSaving(false);
    }
  };
  // ...
}
```

---

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/pages/local/BranchLayout.tsx` | Corregir `isItemActive` para solo coincidencia exacta |
| `src/components/admin/BranchEditPanel.tsx` | Agregar `invalidateQueries` para todas las queries de branches |

---

## Resultado esperado

1. **Mi Local**: Al navegar a Fichajes, solo ese item se marca activo (no "Mi Equipo" también)
2. **Mi Marca**: Al cambiar nombre de sucursal y guardar, el menú lateral se actualiza inmediatamente sin necesidad de refrescar la página
