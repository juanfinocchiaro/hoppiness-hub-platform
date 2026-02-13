

## Proteger extras auto-generados de eliminacion manual

### Problema
Los extras que se crean automaticamente (al activar el toggle en "Extras Disponibles") son items_carta con tipo='extra' y una referencia directa (`composicion_ref_preparacion_id` o `composicion_ref_insumo_id`). Actualmente el boton "Eliminar" en el panel expandido permite borrarlos manualmente, lo que deja registros huerfanos en `item_extra_asignaciones` y rompe la logica de auto-discovery.

El ciclo de vida correcto es: el toggle de extras es la UNICA forma de crear/desactivar estos extras. Si se desactiva el toggle, el extra se soft-deletea automaticamente.

### Cambios

**`src/components/centro-costos/ItemExpandedPanel.tsx`**
- Detectar si un item es un extra auto-generado: `item.tipo === 'extra' && (item.composicion_ref_preparacion_id || item.composicion_ref_insumo_id)`
- Para esos items, **ocultar el boton "Eliminar"** del panel expandido
- Opcionalmente mostrar un texto informativo: "Este extra se gestiona desde la composicion del producto"

**`src/hooks/useToggleExtra.ts`**
- Cuando se desactiva un extra (activo = false):
  1. Eliminar la asignacion de `item_extra_asignaciones` (ya lo hace)
  2. **Ademas**, verificar si el extra tiene otras asignaciones activas en otros productos
  3. Si no tiene ninguna asignacion restante, hacer soft-delete del item extra (`activo: false, deleted_at: now()`)
  4. Esto mantiene la base de datos limpia sin dejar extras huerfanos

**`src/pages/admin/CentroCostosPage.tsx`**
- En la tabla principal, ocultar el boton de eliminar (icono Trash2) para extras auto-generados, igual que en el panel expandido

### Resultado esperado
- Los extras auto-generados no se pueden eliminar manualmente
- Al desactivar el toggle, el extra se limpia automaticamente (asignacion + soft-delete si no tiene otros usos)
- Al reactivar el toggle, el extra se re-crea o reactiva correctamente (esto ya funciona)
- Se evitan los problemas como el del bacon con papas fritas
