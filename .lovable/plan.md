
# Limpieza: Eliminar Canon y Marketing de la tabla Insumos

## Problema
Los registros "Canon Marca (4.5%)" y "Marketing Marca (0.5%)" existen como filas en la tabla `insumos` (IDs fijos `00000000-0000-0000-0000-000000000011` y `00000000-0000-0000-0000-000000000012`). Estos conceptos ya fueron migrados correctamente a `conceptos_servicio` donde pertenecen, pero las filas originales en `insumos` nunca se eliminaron.

Esto causa que aparezcan como opciones seleccionables cuando el usuario elige "Insumo" en el formulario de nueva factura.

## Solución

### 1. Migración de base de datos
Eliminar (hard delete) los dos registros de la tabla `insumos`:
- `Canon Marca (4.5%)` (id: `00000000-0000-0000-0000-000000000011`)
- `Marketing Marca (0.5%)` (id: `00000000-0000-0000-0000-000000000012`)

Estos no tienen referencias en `items_factura` ya que la tabla esta vacia, por lo que se pueden eliminar sin riesgo.

### 2. Sin cambios de frontend
No se requiere ningún cambio en componentes. El dropdown de insumos en `CompraFormModal.tsx` ya consulta la tabla `insumos` dinámicamente, asi que al eliminar las filas simplemente dejan de aparecer.

---

**Detalle tecnico**: La migración es un simple `DELETE FROM insumos WHERE id IN (...)` apuntando a los dos UUIDs fijos.
