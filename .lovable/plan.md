
# Plan: Corregir Políticas RLS para Encargados

## Problema Identificado

Guadalupe (y todos los encargados) no pueden guardar datos en la pestaña "Laboral" del modal de edición de empleados. 

**Causa raíz**: Existe una inconsistencia entre el sistema de permisos del frontend y las políticas de seguridad del backend:

- El **frontend** (hook `usePermissionsV2`) usa correctamente la tabla `user_branch_roles` para determinar permisos
- Las **políticas de seguridad** de la tabla `employee_data` usan la función `is_hr_for_branch()` que consulta la tabla legacy `user_roles_v2`
- **Ningún encargado** tiene registro en `user_roles_v2` - solo tienen registro en `user_branch_roles`

**Encargados afectados** (todos con status MISSING en user_roles_v2):
| Nombre | Sucursal |
|--------|----------|
| Guadalupe Malizia | Nueva Córdoba |
| Lucía Aste | Nueva Córdoba |
| Dalma Ledesma | Manantiales |
| Gastón López | Villa Carlos Paz |
| Luca Lipiñski | Villa Allende |
| Valentina Reginelli | General Paz |

---

## Solución Propuesta

Actualizar la función `is_hr_for_branch` para consultar la tabla correcta (`user_branch_roles`) en lugar de la tabla legacy (`user_roles_v2`).

### Cambios en Base de Datos

**1. Actualizar función `is_hr_for_branch`:**

```sql
CREATE OR REPLACE FUNCTION public.is_hr_for_branch(_user_id uuid, _branch_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    -- Superadmin siempre tiene acceso
    SELECT 1 FROM public.user_roles_v2
    WHERE user_id = _user_id
    AND is_active = true
    AND brand_role = 'superadmin'
  ) OR EXISTS (
    -- Encargados y Franquiciados con acceso a la sucursal específica
    SELECT 1 FROM public.user_branch_roles
    WHERE user_id = _user_id
    AND branch_id = _branch_id
    AND local_role IN ('franquiciado', 'encargado')
    AND is_active = true
  )
$$;
```

**2. Limpiar políticas RLS duplicadas de `employee_data`:**

Actualmente existen múltiples políticas que se solapan. Después de la corrección, las políticas funcionales serán:
- `employee_data_hr_select` - Lectura para HR (encargados/franquiciados)
- `employee_data_hr_insert` - Inserción para HR
- `employee_data_hr_update` - Actualización para HR
- `employee_data_own_select` - Usuarios ven sus propios datos

---

## Optimización del Flujo de Trabajo

Además de corregir el error, se pueden implementar estas mejoras:

### 1. Mensajes de Error Más Claros
Mejorar el componente `EmployeeDataModal` para mostrar mensajes específicos según el tipo de error (permisos, validación, etc.)

### 2. Validación en Frontend
Deshabilitar el botón "Guardar" si el usuario no tiene permisos de edición, con tooltip explicativo.

### 3. Separar Acciones por Tipo
Dado que el modal modifica dos tablas diferentes (`employee_data` y `user_branch_roles`), considerar:
- Guardar cada sección de forma independiente
- Mostrar feedback específico por cada operación

---

## Detalles Técnicos

### Archivos a Modificar:
- **Migración SQL**: Nueva función `is_hr_for_branch` (cambio de backend)
- `src/components/local/team/EmployeeDataModal.tsx`: Mejorar manejo de errores

### Impacto:
- Todos los encargados podrán guardar datos de empleados inmediatamente
- No requiere migración de datos adicional
- Compatible con la arquitectura actual de roles por sucursal

### Riesgo:
- Bajo - la función se usa solo para operaciones de HR sobre empleados de la propia sucursal
- Las políticas ya existentes para `user_branch_roles` seguirán funcionando igual

