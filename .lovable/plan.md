
## Problema Identificado

Los pagos de General Paz estan todos verificados pero el saldo no se actualiza. La causa raiz son dos problemas en los triggers de base de datos:

1. **El trigger `update_saldo_factura_after_pago`** solo se ejecuta en INSERT. Cuando se verifica un pago (UPDATE de `verificado`), el trigger NO se dispara, asi que `facturas_proveedores.saldo_pendiente` nunca se recalcula.

2. **El trigger `trg_update_canon_saldo`** escucha cambios en `pagos_canon` (que tiene 0 registros). Los pagos reales estan en `pagos_proveedores`. Hay una desconexion total: `canon_liquidaciones.saldo_pendiente` nunca se actualiza.

## Plan de Correccion

### Paso 1: Corregir el trigger de saldo de facturas

Modificar el trigger `update_saldo_factura_after_pago` para que tambien se dispare cuando cambia la columna `verificado`:

```
AFTER INSERT OR UPDATE OF verificado, deleted_at, monto
ON pagos_proveedores
```

Esto hara que al verificar un pago, se recalcule el saldo de la factura automaticamente.

### Paso 2: Sincronizar canon_liquidaciones con facturas_proveedores

Crear un trigger que, al actualizarse `facturas_proveedores` (cuando el proveedor es Hoppiness Club), sincronice el `saldo_pendiente` y `estado` en `canon_liquidaciones` para el mismo branch+periodo.

Esto elimina la dependencia de la tabla `pagos_canon` (que esta vacia y no se usa).

### Paso 3: Recalcular saldos existentes

Ejecutar un script de backfill que fuerce el recalculo de todos los saldos de:
- `facturas_proveedores` de Hoppiness Club (sumando pagos verificados)
- `canon_liquidaciones` (reflejando el saldo correcto de la factura)

Esto corregira inmediatamente los datos de General Paz y cualquier otro local con pagos verificados.

### Paso 4: Eliminar trigger obsoleto

Eliminar `trg_update_canon_saldo` que escucha `pagos_canon` ya que esa tabla no se usa. Toda la logica pasa por `pagos_proveedores` y `facturas_proveedores`.

---

### Seccion Tecnica

**Archivos a modificar:**
- Nueva migracion SQL con:
  - DROP del trigger `update_saldo_factura_after_pago` y recreacion con `AFTER INSERT OR UPDATE OF verificado, deleted_at, monto`
  - DROP del trigger `update_saldo_factura_after_delete_pago` (redundante con el nuevo)
  - Nuevo trigger en `facturas_proveedores` para sincronizar a `canon_liquidaciones`
  - DROP del trigger `trg_update_canon_saldo` en `pagos_canon`
  - Script de backfill para recalcular todos los saldos existentes

**Sin cambios en frontend** — el problema es 100% de triggers en la base de datos.
