

## Eliminar el popup "Allow" de QZ Tray para siempre

### Por que sigue apareciendo

El certificado ya esta hardcodeado y es siempre el mismo. Eso esta bien. Pero QZ Tray igual muestra el popup porque el certificado es **autofirmado** y QZ Tray no lo tiene en su lista de confianza. El checkbox "Remember this decision" solo funciona para certificados que QZ Tray ya considera confiables.

La solucion real es decirle a QZ Tray: "confia en este certificado" **desde la instalacion**, usando la propiedad `authcert.override` en el archivo de configuracion de QZ Tray.

### Que se modifica

**Archivo: `public/instalar-impresoras.bat`**

Despues de instalar QZ Tray, el .bat va a:

1. Escribir el certificado PEM en `C:\Program Files\QZ Tray\hoppiness-hub.crt`
2. Agregar la linea `authcert.override=hoppiness-hub.crt` al archivo `C:\Program Files\QZ Tray\qz-tray.properties`
3. Reiniciar QZ Tray para que tome la configuracion

El .bat necesita ejecutarse como administrador para escribir en `C:\Program Files\`. Se agrega auto-elevacion de permisos al inicio del script.

### Flujo del instalador

```text
1. Usuario ejecuta el .bat (doble clic)
2. Windows pide permiso de administrador (UAC) --> usuario acepta
3. Se descarga e instala QZ Tray silenciosamente
4. Se crea el archivo hoppiness-hub.crt con el certificado
5. Se configura qz-tray.properties con authcert.override
6. Se reinicia el servicio de QZ Tray
7. Mensaje: "Listo! Ya podes imprimir desde Hoppiness Hub"
```

### Resultado

- **Cero popups**: QZ Tray confia en la app desde el momento de la instalacion
- No hace falta marcar "Allow" ni "Remember this decision" nunca
- Funciona en todas las PCs donde se ejecute el instalador
- El certificado en el codigo (`qz-certificate.ts`) no se toca, ya esta correcto

### Detalle tecnico del .bat

El script va a:
- Auto-elevarse a administrador si no lo es (usando PowerShell)
- Descargar QZ Tray con `irm pwsh.sh | iex` (como ahora)
- Usar `echo` para escribir cada linea del PEM al archivo `.crt`
- Usar `echo authcert.override=hoppiness-hub.crt >> qz-tray.properties` para la config
- Usar `taskkill /IM qz-tray.exe /F` y luego relanzar para reiniciar

