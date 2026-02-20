

## Agregar `security.data.enabled=false` al instalador

### Que se hace

Modificar 2 lineas y agregar 1 linea en `public/instalar-impresoras.bat`, en la seccion que escribe el script PowerShell temporal (lineas 50-56).

### Cambios puntuales

**Archivo: `public/instalar-impresoras.bat`**

1. **Linea 52** - Ampliar el filtro de Where-Object para que tambien limpie `security.data.enabled`:
   - Antes: `$_ -notmatch 'authcert.override'`
   - Despues: `$_ -notmatch 'authcert.override' -and $_ -notmatch 'security.data.enabled'`

2. **Despues de linea 55** (la que agrega `authcert.override`) - Agregar una linea nueva:
   ```
   >> "%PSFILE%" echo Add-Content -Path $props -Value 'security.data.enabled=false'
   ```

### Resultado en qz-tray.properties

Despues de ejecutar el .bat, el archivo properties tendra:

```
authcert.override=hoppiness-hub.crt
security.data.enabled=false
```

Con esto QZ Tray confia en el certificado de Hoppiness Hub y no muestra ningun popup al imprimir.

