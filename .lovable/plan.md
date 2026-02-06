

# Plan: Permitir que Roles de Marca Vean Todos los Empleados de la Red

## Problema Identificado

Ismael (Coordinador de Marca) solo puede ver a los empleados de Nueva Córdoba en el selector de participantes para reuniones de red, cuando debería ver a **todos los empleados de todas las sucursales**.

### Causa Raíz

Las políticas RLS de `user_branch_roles` solo permiten acceso a:

| Rol | Acceso |
|-----|--------|
| Superadmin | Todo |
| Branch managers (encargado/franquiciado) | Solo su sucursal |
| Usuarios | Solo sus propios roles |

**Falta una política para roles de marca** (`coordinador`, `informes`, `contador_marca`) que les permita leer todos los registros para funciones de supervisión de red.

### Datos del Usuario Afectado

Ismael tiene:
- `brand_role = 'coordinador'` → Debería ver toda la red
- `local_role = 'franquiciado'` en Nueva Córdoba → Solo ve esta sucursal

El sistema actualmente usa la política `ubr_managers_read` que lo limita a Nueva Córdoba.

## Solución

Agregar una nueva política RLS que permita a los roles de marca leer todos los registros de `user_branch_roles`.

## Migración SQL

```sql
-- Permitir que roles de marca lean todos los user_branch_roles
-- Necesario para funciones de supervisión de red (reuniones, reportes, etc.)
CREATE POLICY "ubr_brand_roles_read" ON user_branch_roles
  FOR SELECT TO authenticated
  USING (
    get_brand_role(auth.uid()) IN ('coordinador', 'informes', 'contador_marca')
  );
```

Esta política:
- Es **solo lectura** (SELECT) - los roles de marca no pueden modificar asignaciones de sucursal
- Usa la función existente `get_brand_role()` para verificar el rol de marca
- Complementa la política de superadmin sin reemplazarla

## Archivo a Modificar

| Archivo | Cambio |
|---------|--------|
| Nueva migración SQL | Agregar política `ubr_brand_roles_read` |

## Resultado Esperado

Después de aplicar la migración:
- Ismael (coordinador) podrá ver todos los empleados de todas las sucursales
- El selector de "Nueva Reunión de Red" mostrará las 6 sucursales y todos sus empleados
- La seguridad de escritura se mantiene intacta (solo superadmin puede modificar)

## Notas de Seguridad

- Solo se otorga permiso de **lectura**
- Los roles de marca ya tienen acceso conceptual a toda la red por diseño
- Esta política alinea RLS con la arquitectura documentada de permisos

