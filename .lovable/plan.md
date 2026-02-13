
## Actualizar costo de extras existentes al reactivar

### Problema
El fix anterior corrige el calculo de costo en la fase de descubrimiento (frontend), pero:
1. Los extras ya creados en la base de datos conservan el `costo_total` viejo (ej: "Bacon ahumado" = $127 en vez de $380)
2. Cuando se reactiva un extra existente via toggle, `useToggleExtra` no actualiza el `costo_total`

### Solucion (2 cambios)

**1. Archivo: `src/hooks/useToggleExtra.ts`**

Cuando se activa un extra y ya existe en la base de datos, ademas de reactivarlo, actualizar el `costo_total` con el valor correcto que viene del parametro `costo`:

```
// Bloque de reactivacion (aprox linea 65-72)
// ANTES: solo reactiva
if (!existing.activo || existing.deleted_at) {
  await supabase.from('items_carta').update({ activo: true, deleted_at: null }).eq('id', extraId);
}

// DESPUES: reactiva Y actualiza costo
await supabase.from('items_carta')
  .update({ activo: true, deleted_at: null, costo_total: costo })
  .eq('id', extraId);
```

Nota: se actualiza siempre (no solo cuando esta inactivo) para que al hacer toggle off/on se recalcule el costo aunque el extra ya estuviera activo.

**2. Migracion SQL: actualizar extras existentes**

Correr un UPDATE unico para recalcular el `costo_total` de todos los extras tipo insumo que esten activos, multiplicando el costo unitario del insumo por la cantidad que se usa en las recetas que lo contienen:

```sql
UPDATE items_carta ic
SET costo_total = sub.costo_porcion
FROM (
  SELECT ic2.id AS extra_id, 
         MAX(pi.cantidad * i.costo_por_unidad_base) AS costo_porcion
  FROM items_carta ic2
  JOIN insumos i ON i.id = ic2.composicion_ref_insumo_id
  JOIN preparacion_ingredientes pi ON pi.insumo_id = i.id
  WHERE ic2.tipo = 'extra' 
    AND ic2.composicion_ref_insumo_id IS NOT NULL
    AND ic2.activo = true
  GROUP BY ic2.id
) sub
WHERE ic.id = sub.extra_id;
```

Esto usa MAX para tomar la porcion mas grande entre todas las recetas que usan ese insumo, que es el escenario mas conservador.

### Resultado
- "Bacon ahumado" pasara de $127 a $380 (3 fetas x $126.76)
- Futuros toggles siempre actualizaran el costo al valor correcto de la porcion
