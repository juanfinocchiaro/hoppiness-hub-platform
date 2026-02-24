

## Plan: Eliminar VersionBadge y UserFingerprint de toda la app

### Cambios

**`src/App.tsx`**
- Eliminar los imports de `VersionBadge` y `UserFingerprint`
- Eliminar el `<div>` contenedor fijo en bottom-right que renderiza ambos componentes (líneas 160-163)

Los archivos `src/components/ui/VersionBadge.tsx` y `src/components/ui/UserFingerprint.tsx` se pueden dejar en el proyecto por si se quieren reutilizar en el futuro, pero ya no se mostrarán en ninguna pantalla.

