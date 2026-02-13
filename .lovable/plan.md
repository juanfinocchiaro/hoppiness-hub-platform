

## Limpiar extra huérfano "Bacon" y prevenir recurrencia

### Problema
El extra **"Bacon"** (`7d20e1ec`) referencia a la preparación **"Porción Bacon"** (`8196d9ce`) que ya fue eliminada (`activo=false, deleted_at` set). Sin embargo, el extra sigue activo y asignado al Baconator, causando duplicación con "Bacon ahumado" que es el correcto.

Estado actual en la base de datos:

```text
Extra "Bacon" (7d20e1ec)
  ref: Porción Bacon (8196d9ce) -- ELIMINADA
  asignado a: Baconator -- HUERFANO

Extra "Bacon ahumado" (659f886f)
  ref: Panceta feteada horneada (insumo activo)
  asignado a: Bacon Burger, Baconator -- CORRECTO
```

### Solución (2 pasos)

**1. Migración SQL: eliminar el extra huérfano**

```sql
-- Eliminar la asignación huérfana del Baconator
DELETE FROM item_extra_asignaciones 
WHERE extra_id = '7d20e1ec-d7ab-439f-ac01-be06912c7cf2';

-- Soft-delete el extra "Bacon" huérfano
UPDATE items_carta 
SET activo = false, deleted_at = NOW() 
WHERE id = '7d20e1ec-d7ab-439f-ac01-be06912c7cf2';
```

**2. Archivo: `src/hooks/useToggleExtra.ts` - Prevenir reactivación de extras con referencia eliminada**

En la función `findExistingExtra` (que busca si ya existe un extra para un componente), agregar validación: si el extra referencia una preparación, verificar que la preparación siga activa. Si está eliminada, ignorar ese extra y crear uno nuevo.

Cambio concreto en `findExistingExtra`: para extras tipo preparación, hacer un JOIN o query adicional para verificar que la preparación referenciada no esté eliminada. Si `deleted_at IS NOT NULL` en la preparación, retornar `null` como si no existiera el extra.

### Resultado
- Solo quedará "Bacon ahumado" como extra para bacon
- El sistema no reactivará extras cuya preparación de referencia fue eliminada
- No se crearán más huérfanos en el futuro

