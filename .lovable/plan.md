

## Unificar el calculo de FC% en toda la app

### Situacion actual

Hay dos calculos distintos de Food Cost:

- **Centro de Costos** (correcto): calcula FC = Costo / Precio Neto (precio / 1.21), es decir descuenta el IVA antes de calcular.
- **Base de datos / Carta** (incorrecto): la funcion `recalcular_costo_item_carta` guarda `fc_actual = costo / precio * 100`, usando el precio con IVA incluido.

Resultado: la Carta muestra un FC% menor al real (ej: 23% en vez de 27.9%).

### Solucion

**Un solo cambio en la base de datos** para que el `fc_actual` guardado ya sea el correcto (sobre precio neto). Asi la Carta, el Centro de Costos y cualquier otro lugar que lea `fc_actual` muestran lo mismo.

No hace falta tocar el frontend: la Carta ya lee `fc_actual` directo, y el Centro de Costos ya calcula bien por su cuenta (que ahora va a coincidir).

### Detalle tecnico

1. **Migrar la funcion `recalcular_costo_item_carta`**: cambiar la linea que calcula `fc_actual` de:
   ```
   fc_actual = costo / precio * 100
   ```
   a:
   ```
   fc_actual = costo / (precio / 1.21) * 100
   ```

2. **Ejecutar `recalcular_todos_los_costos()`** para que todos los items existentes se actualicen con la formula corregida.

3. **Actualizar la vista `v_menu_costos`** (usada por el viejo sistema de menu) para que tambien divida por 1.21, manteniendo consistencia en toda la app.

Resultado: un solo calculo, un solo valor, consistente en todas las pantallas.
