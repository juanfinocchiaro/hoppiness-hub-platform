
# Plan: Ocultar "Pendientes" para Franquiciados en el Dashboard

## Problema Identificado

Actualmente en `ManagerDashboard.tsx` línea 334, la condición para mostrar la sección "Pendientes" es:

```tsx
{!isCajero && (
  <Card> {/* PENDIENTES */} ...
)}
```

Esto permite que los **Franquiciados** vean los pendientes, pero según los requisitos:
- Los pendientes son tareas **operativas** que debe gestionar el **Encargado**
- El Franquiciado tiene rol de **solo lectura** según la memoria del sistema
- Las tareas como "Solicitudes de día libre" y "Firmas de reglamento" requieren **acción del encargado**, no del dueño

## Solución

Cambiar la condición para que solo **Encargados** y **Superadmins** vean la sección "Pendientes":

```tsx
// ANTES (línea 334)
{!isCajero && (

// DESPUÉS
{(isEncargado || isSuperadmin) && (
```

## Cambio Técnico

### Archivo: `src/components/local/ManagerDashboard.tsx`

| Línea | Cambio |
|-------|--------|
| 151 | Desestructurar `isEncargado` y `isSuperadmin` del hook de permisos |
| 334 | Cambiar condición de `!isCajero` a `(isEncargado \|\| isSuperadmin)` |

**Código específico:**

```tsx
// Línea 151 - agregar isEncargado e isSuperadmin
const { isCajero, isEncargado, isSuperadmin, local } = usePermissionsWithImpersonation(branch.id);

// Línea 334 - cambiar condición
{(isEncargado || isSuperadmin) && (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="flex items-center justify-between text-base">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Pendientes
        </div>
        ...
      </CardTitle>
    </CardHeader>
    ...
  </Card>
)}
```

## Resultado Esperado

| Rol | Ve "Pendientes" |
|-----|-----------------|
| Superadmin | ✅ Sí |
| Encargado | ✅ Sí |
| Franquiciado | ❌ No |
| Cajero | ❌ No |
| Empleado | ❌ No |

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/local/ManagerDashboard.tsx` | Ajustar condición de visibilidad de "Pendientes" |
