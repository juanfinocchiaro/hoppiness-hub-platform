

# Fix: Grupos opcionales no aparecen

## Causa raiz

El hook `useWebappItemOptionalGroups` consulta columnas que no existen en la tabla `item_carta_grupo_opcional_items`:

- **`precio_extra`** -- No existe. La tabla tiene `costo_unitario` (costo interno, no precio de venta)
- **`orden`** -- No existe. La tabla no tiene columna de orden

Esto hace que la query de Supabase falle silenciosamente y retorne array vacio, por lo que nunca se renderizan las opciones de bebida.

## Datos confirmados

- El item "Combo hamburguesa Ultrabacon" (id `e570bb5d...`) tiene 1 grupo opcional: "Bebida a eleccion" (no obligatorio, max_selecciones null)
- Ese grupo tiene 9 opciones (aguas, gaseosas) -- todas con `precio_extra = 0` (incluidas en el combo)
- La tabla `item_carta_grupo_opcional_items` tiene columnas: `id, grupo_id, insumo_id, preparacion_id, cantidad, costo_unitario, created_at`

## Cambio

### `src/hooks/useWebappMenu.ts` - funcion `useWebappItemOptionalGroups`

Corregir la query de opciones (linea 128):

**Antes:**
```
.select('id, grupo_id, insumo_id, preparacion_id, precio_extra, orden, insumos(id, nombre), preparaciones(id, nombre)')
.order('orden')
```

**Despues:**
```
.select('id, grupo_id, insumo_id, preparacion_id, costo_unitario, insumos(id, nombre), preparaciones(id, nombre)')
```

- Reemplazar `precio_extra` por `costo_unitario` en el select (pero no usarlo como precio al cliente -- estas opciones son sin cargo adicional)
- Eliminar `orden` del select y del `.order()` (no existe esa columna)
- En el map, poner `precio_extra: 0` fijo ya que las opciones de grupo no tienen recargo (estan incluidas en el precio del combo)

Cambio de 3 lineas, sin impacto en ningun otro archivo.
