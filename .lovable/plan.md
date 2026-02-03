
# Plan: Sidebar Footer Consistente

## Problema
El footer del sidebar de "Mi Local" cambia de estructura según los permisos del usuario:
- Con acceso a Mi Marca: muestra dropdown de sucursal + "Cambiar a Mi Marca" + "Volver al Inicio" + "Salir"
- Sin acceso a Mi Marca: muestra texto estático de sucursal + "Volver al Inicio" + "Salir"

Esto hace que los elementos "salten" de posición, lo cual es poco profesional.

## Solución: Layout Fijo con 3 Zonas

Reorganizar el footer en 3 zonas con altura fija/reservada:

```text
+----------------------------------+
|  ZONA 1: Selector de Sucursal    |  <- Siempre ocupa espacio fijo
|  [Manantiales         v]         |
+----------------------------------+
|  ZONA 2: Cambio de Panel         |  <- Espacio reservado (aunque vacío)
|  [Cambiar a Mi Marca]  (o vacío) |
+----------------------------------+
|  ZONA 3: Acciones Fijas          |  <- Siempre igual
|  [Volver al Inicio]              |
|  [Salir]                         |
+----------------------------------+
```

## Cambios Técnicos

### 1. Zona de Sucursal Consistente

**Actual**: Si hay 1 sola sucursal, muestra texto estático. Si hay varias, muestra dropdown.

**Nuevo**: SIEMPRE mostrar el componente Select, pero deshabilitado si solo hay una sucursal.

```tsx
// Antes (líneas 472-493)
{accessibleBranches.length > 1 && (
  <Select ... />
)}
{accessibleBranches.length === 1 && (
  <div className="...">...</div>
)}

// Después
<Select 
  value={branchId} 
  onValueChange={handleBranchChange}
  disabled={accessibleBranches.length <= 1}  // Deshabilitar si solo hay una
>
  <SelectTrigger className="w-full">
    <div className="flex items-center gap-2">
      <Store className="w-4 h-4 text-primary" />
      <SelectValue placeholder="Seleccionar local" />
    </div>
  </SelectTrigger>
  <SelectContent>
    {accessibleBranches.map(branch => (
      <SelectItem key={branch.id} value={branch.id}>
        {branch.name}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

### 2. Espacio Reservado para Cambio de Panel

**Actual**: El botón "Cambiar a Mi Marca" aparece/desaparece condicionalmente.

**Nuevo**: Reservar un espacio fijo (min-height) para esta zona. Si no tiene acceso, simplemente queda vacío pero el espacio se mantiene.

```tsx
{/* Zona 2: Cambio de Panel - altura reservada */}
<div className="min-h-[40px]">
  {canAccessAdmin && !isEmbedded && (
    <ExternalLink to="/mimarca">
      <Button variant="ghost" className="w-full justify-start">
        <Building2 className="w-4 h-4 mr-3" />
        Cambiar a Mi Marca
      </Button>
    </ExternalLink>
  )}
</div>
```

### 3. Acciones Fijas al Final

No cambian - siempre están en la misma posición.

## Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `src/pages/local/BranchLayout.tsx` | Refactorizar footer del sidebar (desktop líneas 469-519, mobile líneas 395-442) |

## Beneficios

1. **Consistencia visual**: Los botones siempre están en la misma posición
2. **Previsibilidad**: El usuario sabe dónde encontrar cada acción
3. **Profesionalismo**: Sin elementos que "saltan"
4. **Mejor UX**: La memoria muscular funciona para todos los usuarios

## Consideración Adicional

También aplicar el mismo patrón al BrandLayout.tsx para consistencia entre ambos paneles, donde el botón "Cambiar a Mi Local" también aparece/desaparece según permisos.
