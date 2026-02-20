

## Fix: Archivo .bat con caracteres ASCII puros

### Problema
El archivo `instalar-impresoras.bat` usa caracteres Unicode (box-drawing `╔║═`, acentos `á é ó`, eñes) que se corrompen durante la descarga blob. Windows CMD no puede interpretar las lineas y muestra "no se reconoce como un comando interno o externo" para cada linea.

### Solucion
Reescribir el `.bat` usando **solo caracteres ASCII puros** (sin acentos, sin box-drawing, sin caracteres especiales). Reemplazar:
- `╔═╗║╚` por `+--+|`
- `á é í ó ú` por `a e i o u`
- `ñ` por `n`
- `¡` por `!`

### Cambio

**Modificar: `public/instalar-impresoras.bat`**

Reescribir todo el contenido usando solo ASCII:
- Reemplazar las lineas decorativas con `===` y `---`
- Quitar todos los acentos y caracteres especiales
- Mantener la misma logica: descargar QZ Tray, instalar silenciosamente, mostrar mensaje de exito
- Mantener `chcp 65001` por si acaso, pero no depender de el

