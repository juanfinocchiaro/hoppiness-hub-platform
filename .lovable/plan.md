

## Mejoras al PDF de Liquidación

### Problemas detectados

1. **Caracteres rotos**: El `└` y otros caracteres UTF-8 no son soportados por la fuente Helvetica de jsPDF, causando que el nombre del puesto se muestre como `% S a n d w i c h e r o` con espacios entre letras
2. **3 filas por empleado innecesarias**: Cuando un empleado tiene un solo puesto (la mayoría), se generan 3 filas (nombre, puesto, TOTAL) — con una sola fila bastaría
3. **Demasiado espacio vertical desperdiciado**: La fila de nombre queda vacía en las columnas numéricas

### Solución

Modificar `buildRows()` en `src/utils/laborExport.ts`:

1. **Un puesto → una sola fila**: Si el empleado tiene 0 o 1 puesto en el breakdown, generar una única fila con nombre + puesto + todos los valores (como la rama `else` actual pero incluyendo el puesto del breakdown)
2. **Múltiples puestos → nombre+total en una fila, sub-filas debajo**: Solo usar sub-filas cuando realmente hay más de un puesto
3. **Reemplazar `└` por texto simple**: Usar `"  > "` o simplemente indentar con espacios para evitar caracteres no soportados
4. **Incluir el puesto operativo** (del breakdown) en la columna Puesto en vez del rol del sistema (CAJERO/EMPLEADO), que ya se muestra en la UI de cards

### Resultado esperado
- Empleados con un solo puesto: **1 fila** en vez de 3
- PDF más compacto (probablemente todo en 1 página en vez de 2)
- Sin caracteres rotos/ilegibles
- Puesto operativo visible (Sandwichero, Cajero, etc.)

### Archivo a modificar
- `src/utils/laborExport.ts` — función `buildRows()` y estilos en `didParseCell`

