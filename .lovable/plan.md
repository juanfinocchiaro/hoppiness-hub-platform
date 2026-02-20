

## Actualizar instalar-impresoras.bat a v3

### Que cambia

Reemplazar el archivo `public/instalar-impresoras.bat` completo con la version v3 que el usuario subio. Los cambios clave respecto a la version actual:

1. **Fix de espacios trailing**: Usa `ForEach-Object { $_.Trim() }` y `[System.IO.File]::WriteAllText()` para escribir el certificado sin los espacios que CMD agrega al final de cada `echo`. Esto hace que el .crt sea identico byte a byte al certificado que envia el navegador.

2. **Propiedad adicional**: Agrega `security.print.strict=false` ademas de `security.data.enabled=false` y `authcert.override`.

3. **Pre-autorizacion**: Crea el directorio `%APPDATA%\qz` y el archivo `allowed.dat` si no existen, preparando la estructura de permisos de QZ Tray.

4. **Filtro ampliado**: El `Where-Object` ahora limpia 3 propiedades antes de re-agregarlas: `authcert.override`, `security.data.enabled`, y `security.print.strict`.

5. **Simplificacion**: Pasa de 3 pasos a 2 pasos en la UI del instalador (ya no separa el certificado como paso independiente).

### Archivo

- `public/instalar-impresoras.bat` -- reemplazo completo con el .bat v3 subido por el usuario (92 lineas).

