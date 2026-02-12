

## Extras con columnas completas de rentabilidad

### Que cambia

La seccion "Extras Disponibles" dentro de Analisis pasa de tener 5 columnas basicas (Nombre, Tipo, Costo, P. Extra, FC%) a tener las mismas columnas que los items regulares de arriba, con edicion inline y calculos en tiempo real.

### Como queda

```text
v  Extras Disponibles (2)

  Buscar extra...

  Nombre              | Tipo   | Costo  | P. Carta (c/IVA) | P. Neto (s/IVA) | Obj.  | FC%      | Margen   | Sugerido
  Cebolla Crispy      | Receta | $6     | [___]             | $0              | 32.0% | —        | —        | $23
  Provoleta grillada  | Receta | $461   | [$1.800]          | $1.488          | 32.0% | 31.0%    | $1.027   | $1.743
```

### Detalles

- **P. Carta (c/IVA)**: es el `precio_extra` actual, editable inline (el que antes se llamaba "P. Extra")
- **P. Neto (s/IVA)**: calculado como `precio_extra / 1.21` (solo lectura)
- **Obj.**: FC% objetivo. Se usa un default de 32% (igual que los items). No se almacena por ahora en la tabla de extras, se usa el default fijo
- **FC%**: `costo / pNeto * 100` con badge semaforo
- **Margen**: `pNeto - costo`
- **Sugerido**: `(costo / (obj / 100)) * 1.21` — el precio con IVA que deberia tener para cumplir el objetivo

Los calculos reusan las funciones `neto()`, `calcFC()`, `calcMargen()`, `calcSugerido()` que ya existen en el archivo.

### Cambios tecnicos

**Archivo: `src/pages/admin/CentroCostosPage.tsx`**

Modificar `ExtrasSection`:

1. Reemplazar las columnas del `TableHeader` por: Nombre, Tipo, Costo, P. Carta (c/IVA), P. Neto (s/IVA), Obj., FC%, Margen, Sugerido
2. En cada fila, calcular todos los valores derivados usando las funciones existentes (`neto`, `calcFC`, `calcMargen`, `calcSugerido`) con un `fcObj` default de 32
3. El input editable sigue siendo el precio con IVA (renombrado de "P. Extra" a "P. Carta c/IVA")
4. Mostrar P. Neto, Margen y Sugerido como valores calculados (solo lectura, font-mono)
5. FC% mantiene el badge con semaforo de color
6. Margen en verde si positivo, rojo si negativo (mismo estilo que arriba)
7. Sugerido resaltado en rojo si la diferencia con el precio actual es grande

No se crean archivos nuevos ni se modifica la base de datos.
