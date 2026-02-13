

## Corregir duplicados en composición de extras

### Problema
El extra "Medallón con queso" muestra $2,430 porque tiene **2 filas duplicadas** en `item_carta_composicion` apuntando a la misma receta "Carne 90g con queso cheddar" ($1,215 x 2 = $2,430). Lo mismo pasa con "Queso cheddar" que también tiene duplicados.

Esto ocurrió porque la migración SQL que ejecutamos insertó filas sin verificar que el toggle ya las había creado.

### Solución

**Migración SQL** (único cambio necesario):

1. Eliminar las filas duplicadas, conservando solo una por extra
2. Recalcular el costo de los extras afectados

```sql
-- Eliminar duplicados conservando la fila más antigua
DELETE FROM item_carta_composicion
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY item_carta_id, preparacion_id, insumo_id 
      ORDER BY created_at ASC
    ) as rn
    FROM item_carta_composicion
    WHERE item_carta_id IN (
      SELECT id FROM items_carta WHERE tipo = 'extra' AND activo = true
    )
  ) sub WHERE rn > 1
);

-- Recalcular costos
SELECT recalcular_costo_item_carta(id) 
FROM items_carta 
WHERE tipo = 'extra' AND activo = true AND deleted_at IS NULL;
```

No hay cambios de código necesarios: el `useToggleExtra` ya tiene la lógica correcta de `DELETE` antes de `INSERT` (lineas 106-109), que previene futuros duplicados.

### Resultado
- "Medallón con queso" pasará de $2,430 a ~$1,215 (el costo real de la receta)
- "Queso cheddar" también se corregirá
- No se repetirá porque el código ya previene duplicados
