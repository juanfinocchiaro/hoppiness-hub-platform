
# Plan: Corregir Migración de Posiciones Dinámicas

## Problema Identificado

El error "invalid input value for enum work_position_type: encargado_turno" ocurre porque:

1. La tabla `user_branch_roles` tiene la columna `default_position` como ENUM `work_position_type`
2. Este ENUM solo tiene valores: cajero, cocinero, barista, runner, lavacopas
3. Estamos intentando guardar "encargado_turno" (una nueva posición dinámica)

La migración anterior cambió correctamente `employee_schedules.work_position` a `text`, pero **faltó cambiar** `user_branch_roles.default_position`.

## Solución

### Cambio en Base de Datos

Ejecutar una migración adicional para cambiar el tipo de columna:

```sql
-- Cambiar default_position de ENUM a TEXT
ALTER TABLE user_branch_roles 
  ALTER COLUMN default_position TYPE text;

-- Migrar datos existentes de 'cocinero' a 'sandwichero'
UPDATE user_branch_roles 
SET default_position = 'sandwichero' 
WHERE default_position = 'cocinero';
```

### Archivos a Modificar

No se requieren cambios en el frontend ya que `UserRoleModalV2.tsx` ya usa type assertions (`as any`) anticipando este cambio.

## Verificación

Después de la migración, verificar:
- Guardar rol con posición "Encargado de Turno" ✓
- Guardar rol con posición "Sandwichero" ✓
- Guardar rol con posición "Cafetero" ✓
