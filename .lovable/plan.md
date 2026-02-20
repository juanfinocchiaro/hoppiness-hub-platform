

## Plan: Hacer que el Print Bridge soporte impresión de logo bitmap

### Problema raíz

Las comandas ya tienen el nuevo diseño en el código (`escpos.ts`), pero el logo no se imprime porque el Print Bridge (el servidor Node.js local en `localhost:3001`) recibe los datos en base64, los convierte a bytes y los envía tal cual a la impresora. No tiene lógica para detectar el marcador `__BITMAP_B64:...:END__` que el frontend inyecta en el stream ESC/POS.

Como resultado, el marcador se envía como texto ASCII a la impresora, que lo ignora o imprime caracteres basura. El resto del formato (negrita, doble tamaño, separadores) sí funciona porque son comandos ESC/POS estándar.

### Solución

Actualizar el Print Bridge para que intercepte los marcadores bitmap en el buffer de datos, convierta las imágenes PNG a formato raster ESC/POS (comando `GS v 0`), y reemplace el marcador por los bytes correctos antes de enviar a la impresora.

### Cambios

**1. Actualizar el Print Bridge (`public/instalar-impresoras.bat`)**

- Modificar el código del `print-bridge.js` embebido en base64 dentro del .bat
- Agregar una función `processBuffer(buffer)` que:
  1. Busca el patrón `__BITMAP_B64:...:END__` en el buffer
  2. Decodifica el PNG base64 a píxeles monocromáticos
  3. Convierte los píxeles a formato raster ESC/POS (`GS v 0`)
  4. Reemplaza el marcador por los bytes ESC/POS del bitmap
  5. Retorna el buffer procesado
- La conversión PNG a raster se hace con un parser PNG mínimo en JavaScript puro (sin dependencias npm), ya que las impresoras térmicas solo necesitan datos 1-bit (blanco/negro)

**2. Alternativa: Logo como texto estilizado (fallback)**

- En `src/lib/escpos.ts`, modificar la función `printBrandHeader` para que use texto grande centrado como fallback principal
- El logo bitmap queda como mejora opcional para bridges actualizados
- Esto garantiza que las comandas se impriman correctamente incluso sin actualizar el bridge

### Enfoque recomendado

Implementar ambos cambios:
1. Actualizar el bridge con soporte de bitmap para nuevas instalaciones
2. Agregar detección inteligente: si el bridge no soporta bitmaps (versión vieja), usar texto como fallback automático

### Detalles técnicos

El formato raster ESC/POS (`GS v 0`) funciona así:

```text
Comando: 1D 76 30 00 [xL xH yL yH] [datos...]
- xL/xH: ancho en bytes (ancho_px / 8)
- yL/yH: alto en líneas de píxeles
- datos: 1 bit por píxel, MSB primero
```

El parser PNG mínimo decodifica el IDAT chunk, aplica un umbral de luminosidad para convertir a 1-bit, y genera los bytes raster. Esto funciona sin librerías externas porque el logo es una imagen simple monocromática de 200x200px.

La nueva versión del bridge se embebe en base64 dentro del `.bat` igual que ahora, y los locales que ya tienen el bridge instalado deberán re-ejecutar el instalador para actualizar.

